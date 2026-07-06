import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shipment } from '../orders/entities/shipment.entity';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { Product } from '../products/entities/product.entity';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { QueryShipmentDto } from './dto/query-shipment.dto';

@Injectable()
export class ShipmentsService {
  constructor(
    @InjectRepository(Shipment)
    private readonly shipmentRepo: Repository<Shipment>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
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
      trackingNo: dto.trackingNo,
      shippedAt,
      aftersaleStart,
      aftersaleEnd,
    });

    const saved = await this.shipmentRepo.save(shipment);

    order.status = OrderStatus.AFTERSALE_WAITING;
    await this.orderRepo.save(order);

    return saved;
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
