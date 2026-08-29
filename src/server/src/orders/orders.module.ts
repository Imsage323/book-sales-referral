import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { RefundsService } from './refunds.service';
import { OrdersController } from './orders.controller';
import { Order } from './entities/order.entity';
import { OrderAddress } from './entities/order-address.entity';
import { RefundRecord } from './entities/refund-record.entity';
import { Product } from '../products/entities/product.entity';
import { Seller } from '../sellers/entities/seller.entity';
import { PaymentEvent } from '../payments/entities/payment-event.entity';
import { RewardRecord } from '../rewards/entities/reward-record.entity';
import { PaymentsModule } from '../payments/payments.module';
import { BuyerOrdersController } from './buyer-orders.controller';
import { AuthModule } from '../auth/auth.module';
import { RewardsModule } from '../rewards/rewards.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderAddress,
      RefundRecord,
      RewardRecord,
      Product,
      Seller,
      PaymentEvent,
    ]),
    AuthModule,
    RewardsModule,
    forwardRef(() => PaymentsModule),
  ],
  controllers: [OrdersController, BuyerOrdersController],
  providers: [OrdersService, RefundsService],
  exports: [OrdersService, RefundsService],
})
export class OrdersModule {}
