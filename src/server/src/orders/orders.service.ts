import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderAddress } from './entities/order-address.entity';
import { Product } from '../products/entities/product.entity';
import { Seller } from '../sellers/entities/seller.entity';
import { SellerStatus } from '../sellers/entities/seller.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderAddressDto } from './dto/order-address.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { generateOrderNo } from './order-number.generator';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderAddress)
    private readonly addressRepo: Repository<OrderAddress>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Seller)
    private readonly sellerRepo: Repository<Seller>,
  ) {}

  async create(dto: CreateOrderDto): Promise<Order> {
    const product = await this.productRepo.findOne({ where: { id: dto.productId } });
    if (!product) {
      throw new NotFoundException('产品不存在');
    }
    if (!product.isOnSale) {
      throw new BadRequestException('产品已下架');
    }

    const seller = await this.sellerRepo.findOne({ where: { id: dto.sellerId } });
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
    while (attempts < 10 && (await this.orderRepo.findOne({ where: { orderNo } }))) {
      orderNo = generateOrderNo();
      attempts++;
    }

    const order = this.orderRepo.create({
      orderNo,
      productId: dto.productId,
      sellerId: dto.sellerId,
      openid: dto.openid,
      quantity,
      unitPrice,
      totalAmount,
      status: OrderStatus.PENDING_PAYMENT,
    });

    return this.orderRepo.save(order);
  }

  async findAll(query: QueryOrderDto): Promise<{ items: Order[]; total: number }> {
    const { keyword, status, sellerId, page = 1, pageSize = 20 } = query;
    const where: any = {};
    if (status) where.status = status;
    if (sellerId) where.sellerId = sellerId;
    if (keyword) where.orderNo = Like(`%${keyword}%`);

    const [items, total] = await this.orderRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { items, total };
  }

  async findOne(id: string): Promise<{ order: Order; address: OrderAddress | null }> {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    const address = await this.addressRepo.findOne({ where: { orderId: id } });
    return { order, address };
  }

  async updateAddress(id: string, dto: OrderAddressDto): Promise<OrderAddress> {
    const { order } = await this.findOne(id);
    if (
      order.status !== OrderStatus.PENDING_PAYMENT &&
      order.status !== OrderStatus.PAID &&
      order.status !== OrderStatus.ADDRESS_PENDING
    ) {
      throw new BadRequestException('当前订单状态不能填写地址');
    }

    let address = await this.addressRepo.findOne({ where: { orderId: id } });
    if (address) {
      Object.assign(address, dto);
    } else {
      address = this.addressRepo.create({ orderId: id, ...dto });
    }

    const saved = await this.addressRepo.save(address);

    if (order.status === OrderStatus.PAID || order.status === OrderStatus.PENDING_PAYMENT) {
      order.status = OrderStatus.ADDRESS_PENDING;
      await this.orderRepo.save(order);
    }

    return saved;
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto): Promise<Order> {
    const { order } = await this.findOne(id);
    const newStatus = dto.status;

    if (!this.isValidTransition(order.status, newStatus)) {
      throw new BadRequestException(`不能从 ${order.status} 切换到 ${newStatus}`);
    }

    if (newStatus === OrderStatus.PAID) {
      order.paidAt = new Date();
    }

    order.status = newStatus;
    if (dto.remark) order.remark = dto.remark;
    return this.orderRepo.save(order);
  }

  private isValidTransition(current: OrderStatus, next: OrderStatus): boolean {
    const transitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING_PAYMENT]: [OrderStatus.PAID, OrderStatus.CLOSED, OrderStatus.CANCELLED],
      [OrderStatus.PAID]: [OrderStatus.ADDRESS_PENDING, OrderStatus.REFUNDED],
      [OrderStatus.ADDRESS_PENDING]: [OrderStatus.SHIPPING_PENDING],
      [OrderStatus.SHIPPING_PENDING]: [OrderStatus.SHIPPED, OrderStatus.AFTERSALE_WAITING],
      [OrderStatus.SHIPPED]: [OrderStatus.AFTERSALE_WAITING],
      [OrderStatus.AFTERSALE_WAITING]: [OrderStatus.SETTLEMENT_READY, OrderStatus.REFUNDED],
      [OrderStatus.SETTLEMENT_READY]: [OrderStatus.REFUNDED],
      [OrderStatus.CLOSED]: [],
      [OrderStatus.REFUNDED]: [],
      [OrderStatus.CANCELLED]: [],
    };
    return transitions[current]?.includes(next) ?? false;
  }
}
