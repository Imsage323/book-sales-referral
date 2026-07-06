import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { Shipment } from '../orders/entities/shipment.entity';
import { Product } from '../products/entities/product.entity';
import { Seller } from '../sellers/entities/seller.entity';
import { RewardRecord } from './entities/reward-record.entity';
import { RewardsService } from './rewards.service';

@Injectable()
export class SettlementService {
  private readonly logger = new Logger(SettlementService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Shipment)
    private readonly shipmentRepo: Repository<Shipment>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Seller)
    private readonly sellerRepo: Repository<Seller>,
    @InjectRepository(RewardRecord)
    private readonly recordRepo: Repository<RewardRecord>,
    private readonly rewardsService: RewardsService,
  ) {}

  async findReadyOrders(): Promise<Order[]> {
    const orders = await this.orderRepo
      .createQueryBuilder('order')
      .innerJoin(Shipment, 'shipment', 'shipment.orderId = order.id')
      .where('order.status = :status', { status: OrderStatus.AFTERSALE_WAITING })
      .andWhere('shipment.aftersaleEnd < :now', { now: new Date() })
      .getMany();

    return orders;
  }

  async settleOrders(): Promise<{ settledCount: number }> {
    await this.rewardsService.createDefaultRuleIfMissing();
    const orders = await this.findReadyOrders();

    for (const order of orders) {
      await this.settleOrder(order);
    }

    return { settledCount: orders.length };
  }

  async settleOrder(order: Order): Promise<void> {
    const [product, seller] = await Promise.all([
      this.productRepo.findOne({ where: { id: order.productId } }),
      this.sellerRepo.findOne({ where: { id: order.sellerId } }),
    ]);

    if (!product || !seller) {
      this.logger.warn(`Order ${order.id} missing product or seller, skip settlement`);
      return;
    }

    order.status = OrderStatus.SETTLEMENT_READY;
    await this.orderRepo.save(order);

    const rewardRecords = await this.rewardsService.calculateRewards(order, product, seller);
    if (rewardRecords.length > 0) {
      await this.recordRepo.save(rewardRecords);
    }
  }

  @Cron('0 2 * * *')
  async handleCron(): Promise<void> {
    this.logger.log('Running daily settlement scan');
    const result = await this.settleOrders();
    this.logger.log(`Settled ${result.settledCount} orders`);
  }
}
