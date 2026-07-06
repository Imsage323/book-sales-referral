import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RewardsController } from './rewards.controller';
import { RewardsService } from './rewards.service';
import { SettlementService } from './settlement.service';
import { RewardRule } from './entities/reward-rule.entity';
import { RewardRecord } from './entities/reward-record.entity';
import { Order } from '../orders/entities/order.entity';
import { Shipment } from '../orders/entities/shipment.entity';
import { Product } from '../products/entities/product.entity';
import { Seller } from '../sellers/entities/seller.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RewardRule,
      RewardRecord,
      Order,
      Shipment,
      Product,
      Seller,
    ]),
  ],
  controllers: [RewardsController],
  providers: [RewardsService, SettlementService],
  exports: [RewardsService, SettlementService],
})
export class RewardsModule {}
