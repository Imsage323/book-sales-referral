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
import { RewardStatus } from './entities/reward-record.entity';
import { getPaidRewardEstimateConfig } from '../config/reward.config';

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
      .where('order.status = :status', {
        status: OrderStatus.AFTERSALE_WAITING,
      })
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

  async estimatePaidOrder(
    orderId: string,
  ): Promise<{ estimatedCount: number; skipped: boolean }> {
    const estimateConfig = getPaidRewardEstimateConfig();
    if (!estimateConfig.enabled) {
      return { estimatedCount: 0, skipped: true };
    }

    await this.rewardsService.createDefaultRuleIfMissing();
    return this.recordRepo.manager.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { id: orderId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!order?.paidAt || !order.wxTransactionId) {
        return { estimatedCount: 0, skipped: true };
      }
      if (
        estimateConfig.sellerId &&
        order.sellerId !== estimateConfig.sellerId
      ) {
        return { estimatedCount: 0, skipped: true };
      }

      const existing = await manager.find(RewardRecord, {
        where: { orderId },
      });
      if (existing.length > 0) {
        return { estimatedCount: existing.length, skipped: true };
      }

      const [product, seller] = await Promise.all([
        manager.findOne(Product, { where: { id: order.productId } }),
        manager.findOne(Seller, { where: { id: order.sellerId } }),
      ]);
      if (!product || !seller) {
        this.logger.warn(
          `Order ${order.id} missing product or seller, skip reward estimate`,
        );
        return { estimatedCount: 0, skipped: true };
      }

      const rewardRecords = await this.rewardsService.calculateRewards(
        order,
        product,
        seller,
        RewardStatus.ESTIMATED,
      );
      if (rewardRecords.length > 0) {
        await manager.save(RewardRecord, rewardRecords);
      }
      return { estimatedCount: rewardRecords.length, skipped: false };
    });
  }

  async settleOrder(order: Order): Promise<void> {
    const [product, seller] = await Promise.all([
      this.productRepo.findOne({ where: { id: order.productId } }),
      this.sellerRepo.findOne({ where: { id: order.sellerId } }),
    ]);

    if (!product || !seller) {
      this.logger.warn(
        `Order ${order.id} missing product or seller, skip settlement`,
      );
      return;
    }

    order.status = OrderStatus.SETTLEMENT_READY;
    await this.orderRepo.save(order);

    const existingRecords = await this.recordRepo.find({
      where: { orderId: order.id },
    });
    if (existingRecords.length > 0) {
      const estimatedRecords = existingRecords.filter(
        (record) => record.status === RewardStatus.ESTIMATED,
      );
      for (const record of estimatedRecords) {
        record.status = RewardStatus.READY;
      }
      if (estimatedRecords.length > 0) {
        await this.recordRepo.save(estimatedRecords);
      }
      return;
    }

    const rewardRecords = await this.rewardsService.calculateRewards(
      order,
      product,
      seller,
    );
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
