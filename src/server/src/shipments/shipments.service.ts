import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shipment } from '../orders/entities/shipment.entity';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { Product } from '../products/entities/product.entity';
import { getWxConfig } from '../config/wx.config';
import { WxTradeService } from '../wx-trade/wx-trade.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { QueryShipmentDto } from './dto/query-shipment.dto';

@Injectable()
export class ShipmentsService {
  private readonly logger = new Logger(ShipmentsService.name);

  constructor(
    @InjectRepository(Shipment)
    private readonly shipmentRepo: Repository<Shipment>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    private readonly wxTradeService: WxTradeService,
  ) {}

  async create(dto: CreateShipmentDto): Promise<Shipment> {
    const order = await this.orderRepo.findOne({ where: { id: dto.orderId } });
    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    if (
      order.status !== OrderStatus.ADDRESS_PENDING &&
      order.status !== OrderStatus.SHIPPING_PENDING
    ) {
      throw new BadRequestException('订单状态不允许发货');
    }

    const product = await this.productRepo.findOne({ where: { id: order.productId } });
    const aftersaleDays = product?.aftersaleDays ?? 7;

    const shippedAt = new Date();
    const aftersaleStart = shippedAt;
    const aftersaleEnd = new Date(
      shippedAt.getTime() + aftersaleDays * 24 * 60 * 60 * 1000,
    );

    const shipment = this.shipmentRepo.create({
      orderId: dto.orderId,
      company: dto.company,
      companyId: dto.companyId || null,
      trackingNo: dto.trackingNo,
      shippedAt,
      aftersaleStart,
      aftersaleEnd,
    });

    const saved = await this.shipmentRepo.save(shipment);

    order.status = OrderStatus.AFTERSALE_WAITING;
    await this.orderRepo.save(order);

    await this.syncShipmentToWx(saved, order, product);

    return saved;
  }

  /** 管理后台手动重试微信发货信息同步 */
  async retryWxSync(id: string): Promise<Shipment> {
    const shipment = await this.shipmentRepo.findOne({ where: { id } });
    if (!shipment) {
      throw new NotFoundException('发货记录不存在');
    }
    if (shipment.wxSyncStatus === 'success') {
      throw new BadRequestException('该发货记录已同步微信，无需重试');
    }
    const order = await this.orderRepo.findOne({
      where: { id: shipment.orderId },
    });
    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    const product = await this.productRepo.findOne({
      where: { id: order.productId },
    });

    try {
      await this.uploadToWx(shipment, order, product);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      shipment.wxSyncStatus = 'failed';
      shipment.wxSyncError = message.slice(0, 500);
      await this.shipmentRepo.save(shipment);
      throw new BadRequestException(`微信发货信息同步失败: ${message}`);
    }

    shipment.wxSyncStatus = 'success';
    shipment.wxSyncError = null;
    shipment.wxSyncedAt = new Date();
    return this.shipmentRepo.save(shipment);
  }

  /**
   * 微信发货信息同步：best-effort，失败不阻断发货流程，
   * 仅落库同步状态供管理后台告警与手动重试。
   */
  private async syncShipmentToWx(
    shipment: Shipment,
    order: Order,
    product: Product | null,
  ): Promise<void> {
    if (this.wxTradeService.getMode() === 'disabled') {
      shipment.wxSyncStatus = 'skipped';
      await this.shipmentRepo.save(shipment);
      return;
    }
    try {
      await this.uploadToWx(shipment, order, product);
      shipment.wxSyncStatus = 'success';
      shipment.wxSyncError = null;
      shipment.wxSyncedAt = new Date();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `微信发货信息同步失败（订单 ${order.orderNo}）: ${message}`,
      );
      shipment.wxSyncStatus = 'failed';
      shipment.wxSyncError = message.slice(0, 500);
    }
    await this.shipmentRepo.save(shipment);
  }

  private async uploadToWx(
    shipment: Shipment,
    order: Order,
    product: Product | null,
  ): Promise<void> {
    if (!shipment.companyId) {
      throw new BadRequestException(
        '缺少微信快递公司编码，发货时请从快递公司下拉列表中选择',
      );
    }
    const { mchid } = getWxConfig();
    await this.wxTradeService.uploadShippingInfo({
      mchid,
      outTradeNo: order.orderNo,
      openid: order.openid,
      trackingNo: shipment.trackingNo,
      expressCompanyId: shipment.companyId,
      itemDesc: product?.name || '图书',
    });
  }

  async findAll(
    query: QueryShipmentDto,
  ): Promise<{ items: Shipment[]; total: number }> {
    const { orderId, page = 1, pageSize = 20 } = query;
    const where: any = {};
    if (orderId) where.orderId = orderId;

    const [items, total] = await this.shipmentRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { items, total };
  }
}
