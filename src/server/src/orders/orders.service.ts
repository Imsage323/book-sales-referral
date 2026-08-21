import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderAddress } from './entities/order-address.entity';
import { Product } from '../products/entities/product.entity';
import { Seller } from '../sellers/entities/seller.entity';
import { SellerStatus } from '../sellers/entities/seller.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderAddressDto } from './dto/order-address.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { PaymentEvent } from '../payments/entities/payment-event.entity';
import {
  WxPayService,
  WxJsapiPaymentParams,
  WxNotifyPlaintext,
} from '../payments/wx-pay.service';
import { isWxPayEnabled, isWxPayMockEnabled } from '../config/wx.config';
import { generateOrderNo } from './order-number.generator';
import { SettlementService } from '../rewards/settlement.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderAddress)
    private readonly addressRepo: Repository<OrderAddress>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Seller)
    private readonly sellerRepo: Repository<Seller>,
    @InjectRepository(PaymentEvent)
    private readonly paymentEventRepo: Repository<PaymentEvent>,
    @Inject(forwardRef(() => WxPayService))
    private readonly wxPayService: WxPayService,
    private readonly settlementService: SettlementService,
  ) {}

  async createForBuyer(dto: CreateOrderDto, openid: string): Promise<Order> {
    const product = await this.productRepo.findOne({
      where: { id: dto.productId },
    });
    if (!product) {
      throw new NotFoundException('产品不存在');
    }
    if (!product.isOnSale) {
      throw new BadRequestException('产品已下架');
    }

    const seller = await this.sellerRepo.findOne({
      where: { id: dto.sellerId },
    });
    if (!seller) {
      throw new NotFoundException('销售方不存在');
    }
    if (seller.status !== SellerStatus.ACTIVE) {
      throw new BadRequestException('销售方已停用');
    }

    const quantity = dto.quantity || 1;
    const unitPrice = product.price;
    const totalAmount = unitPrice * quantity;

    let orderNo = generateOrderNo();
    let attempts = 0;
    while (
      attempts < 10 &&
      (await this.orderRepo.findOne({ where: { orderNo } }))
    ) {
      orderNo = generateOrderNo();
      attempts++;
    }

    const order = this.orderRepo.create({
      orderNo,
      productId: dto.productId,
      sellerId: dto.sellerId,
      openid,
      quantity,
      unitPrice,
      totalAmount,
      status: OrderStatus.PENDING_PAYMENT,
    });

    return this.orderRepo.save(order);
  }

  async findAll(
    query: QueryOrderDto,
  ): Promise<{ items: Order[]; total: number }> {
    const {
      keyword,
      status,
      sellerId,
      startDate,
      endDate,
      page = 1,
      pageSize = 20,
    } = query;
    const where: any = {};
    if (status) where.status = status;
    if (sellerId) where.sellerId = sellerId;
    if (keyword) where.orderNo = Like(`%${keyword}%`);
    if (startDate || endDate) {
      where.createdAt = this.buildDateRange(startDate, endDate);
    }

    const [items, total] = await this.orderRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { items, total };
  }

  async findOne(
    id: string,
  ): Promise<{ order: Order; address: OrderAddress | null }> {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    const address = await this.addressRepo.findOne({ where: { orderId: id } });
    return { order, address };
  }

  async findMine(
    openid: string,
    query: QueryOrderDto,
  ): Promise<{ items: Order[]; total: number }> {
    const { status, page = 1, pageSize = 20 } = query;
    const [items, total] = await this.orderRepo.findAndCount({
      where: { openid, ...(status ? { status } : {}) },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items, total };
  }

  /** 同时接受内部订单 id 和商户订单号（orderNo），后者用于微信订单中心跳转 */
  async findOneForBuyer(
    idOrOrderNo: string,
    openid: string,
  ): Promise<{ order: Order; address: OrderAddress | null }> {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        idOrOrderNo,
      );
    const order = await this.orderRepo.findOne({
      where: isUuid
        ? { id: idOrOrderNo, openid }
        : { orderNo: idOrOrderNo, openid },
    });
    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    return this.findOne(order.id);
  }

  async updateAddress(id: string, dto: OrderAddressDto): Promise<OrderAddress> {
    const { order } = await this.findOne(id);
    if (
      order.status !== OrderStatus.PAID &&
      order.status !== OrderStatus.ADDRESS_PENDING
    ) {
      if (order.status === OrderStatus.PENDING_PAYMENT) {
        throw new BadRequestException('支付结果尚未确认，请返回支付页重新确认');
      }
      throw new BadRequestException('当前订单状态不能填写地址');
    }

    let address = await this.addressRepo.findOne({ where: { orderId: id } });
    if (address) {
      Object.assign(address, dto);
    } else {
      address = this.addressRepo.create({ orderId: id, ...dto });
    }

    const saved = await this.addressRepo.save(address);

    if (order.status === OrderStatus.PAID) {
      order.status = OrderStatus.ADDRESS_PENDING;
      await this.orderRepo.save(order);
    }

    return saved;
  }

  async updateAddressForBuyer(
    id: string,
    openid: string,
    dto: OrderAddressDto,
  ): Promise<OrderAddress> {
    await this.assertBuyerOwnsOrder(id, openid);
    return this.updateAddress(id, dto);
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto): Promise<Order> {
    const { order } = await this.findOne(id);
    const newStatus = dto.status;

    if (!this.isValidTransition(order.status, newStatus)) {
      throw new BadRequestException(
        `不能从 ${order.status} 切换到 ${newStatus}`,
      );
    }

    if (newStatus === OrderStatus.PAID) {
      order.paidAt = new Date();
    }

    order.status = newStatus;
    if (dto.remark) order.remark = dto.remark;
    return this.orderRepo.save(order);
  }

  /** 真实模式等待回调/对账；mock 仅允许在 development/test 显式启用。 */
  async payOrder(id: string): Promise<Order | WxJsapiPaymentParams> {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException('订单当前状态不允许支付');
    }

    if (isWxPayEnabled()) {
      return this.wxPayService.createJsapiOrder(order, '高三学业生涯导航日历');
    }

    if (!isWxPayMockEnabled()) {
      throw new ServiceUnavailableException('微信支付暂不可用，请稍后重试');
    }

    const rawBody = JSON.stringify({
      type: 'mock_payment',
      orderId: order.id,
      orderNo: order.orderNo,
      totalAmount: order.totalAmount,
    });
    return this.markPaid(order, `MOCK-${order.orderNo}-${Date.now()}`, rawBody);
  }

  async payOrderForBuyer(
    id: string,
    openid: string,
  ): Promise<Order | WxJsapiPaymentParams> {
    await this.assertBuyerOwnsOrder(id, openid);
    return this.payOrder(id);
  }

  /** 主动对账：微信侧已支付则按回调同样逻辑落库（幂等） */
  async syncPayment(id: string): Promise<Order> {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    if (this.isPaymentConfirmed(order)) {
      await this.ensurePaidRewardEstimate(order);
      return order;
    }
    if (!this.canConfirmPayment(order.status)) {
      return order;
    }

    if (!isWxPayEnabled()) {
      if (isWxPayMockEnabled()) return order;
      throw new ServiceUnavailableException('微信支付暂不可用，请稍后重试');
    }

    const result = await this.wxPayService.queryByOutTradeNo(order.orderNo);
    if (
      result.trade_state === 'SUCCESS' &&
      WxPayService.isAmountMatched(result.amount?.total, order.totalAmount)
    ) {
      return this.markPaid(
        order,
        result.transaction_id,
        JSON.stringify({ type: 'pay_sync', ...result }),
      );
    }
    return order;
  }

  async syncPaymentForBuyer(id: string, openid: string): Promise<Order> {
    await this.assertBuyerOwnsOrder(id, openid);
    return this.syncPayment(id);
  }

  /** 支付回调落库：幂等 + 金额校验，金额不一致记录事件后抛错让微信重试 */
  async handleWxNotify(
    plaintext: WxNotifyPlaintext,
    rawBody: string,
  ): Promise<void> {
    const order = await this.orderRepo.findOne({
      where: { orderNo: plaintext.out_trade_no },
    });
    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    if (this.isPaymentConfirmed(order)) {
      await this.ensurePaidRewardEstimate(order);
      return; // 已确认支付，幂等返回且不重复写支付事件
    }
    if (!this.canConfirmPayment(order.status)) {
      return; // 已关闭/退款等状态不在这里隐式改写
    }
    if (plaintext.trade_state !== 'SUCCESS') {
      return; // 非成功状态不落库
    }
    if (
      !WxPayService.isAmountMatched(plaintext.amount?.total, order.totalAmount)
    ) {
      await this.paymentEventRepo.save(
        this.paymentEventRepo.create({
          orderNo: order.orderNo,
          amount: plaintext.amount?.total,
          result: 'AMOUNT_MISMATCH',
          verified: false,
          rawBody,
        }),
      );
      throw new BadRequestException('回调金额与订单金额不一致');
    }
    await this.markPaid(order, plaintext.transaction_id, rawBody);
  }

  /** 置为已支付并写入支付事件（mock 支付 / 回调 / 对账共用） */
  private async markPaid(
    order: Order,
    transactionId: string,
    rawBody: string,
  ): Promise<Order> {
    if (this.isPaymentConfirmed(order)) {
      return order;
    }

    // 地址可能在旧版本竞态中先于迟到回调落库；确认支付时保留后续业务状态。
    if (order.status === OrderStatus.PENDING_PAYMENT) {
      order.status = OrderStatus.PAID;
    }
    order.paidAt = new Date();
    order.wxTransactionId = transactionId;
    await this.orderRepo.save(order);

    const paymentEvent = this.paymentEventRepo.create({
      orderNo: order.orderNo,
      amount: order.totalAmount,
      result: 'SUCCESS',
      verified: true,
      rawBody,
    });
    await this.paymentEventRepo.save(paymentEvent);

    await this.ensurePaidRewardEstimate(order);

    return order;
  }

  private async ensurePaidRewardEstimate(order: Order): Promise<void> {
    try {
      await this.settlementService.estimatePaidOrder(order.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`订单 ${order.orderNo} 支付后奖励预估失败: ${message}`);
    }
  }

  private isPaymentConfirmed(order: Order): boolean {
    return Boolean(order.paidAt && order.wxTransactionId);
  }

  private canConfirmPayment(status: OrderStatus): boolean {
    return [
      OrderStatus.PENDING_PAYMENT,
      OrderStatus.PAID,
      OrderStatus.ADDRESS_PENDING,
    ].includes(status);
  }

  private buildDateRange(
    startDate?: string,
    endDate?: string,
  ): import('typeorm').FindOperator<Date> | undefined {
    if (!startDate && !endDate) return undefined;
    const start = startDate ? new Date(startDate) : new Date('1970-01-01');
    start.setHours(0, 0, 0, 0);
    const end = endDate ? new Date(endDate) : new Date('2099-12-31');
    end.setHours(23, 59, 59, 999);
    return Between(start, end);
  }

  private async assertBuyerOwnsOrder(
    id: string,
    openid: string,
  ): Promise<void> {
    const order = await this.orderRepo.findOne({ where: { id, openid } });
    if (!order) {
      throw new NotFoundException('订单不存在');
    }
  }

  private isValidTransition(current: OrderStatus, next: OrderStatus): boolean {
    const transitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING_PAYMENT]: [
        OrderStatus.PAID,
        OrderStatus.CLOSED,
        OrderStatus.CANCELLED,
      ],
      [OrderStatus.PAID]: [OrderStatus.ADDRESS_PENDING, OrderStatus.REFUNDED],
      [OrderStatus.ADDRESS_PENDING]: [OrderStatus.SHIPPING_PENDING],
      [OrderStatus.SHIPPING_PENDING]: [
        OrderStatus.SHIPPED,
        OrderStatus.AFTERSALE_WAITING,
      ],
      [OrderStatus.SHIPPED]: [OrderStatus.AFTERSALE_WAITING],
      [OrderStatus.AFTERSALE_WAITING]: [
        OrderStatus.SETTLEMENT_READY,
        OrderStatus.REFUNDED,
      ],
      [OrderStatus.SETTLEMENT_READY]: [OrderStatus.REFUNDED],
      [OrderStatus.CLOSED]: [],
      [OrderStatus.REFUNDED]: [],
      [OrderStatus.CANCELLED]: [],
    };
    return transitions[current]?.includes(next) ?? false;
  }
}
