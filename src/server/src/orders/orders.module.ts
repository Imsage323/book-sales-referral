import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order } from './entities/order.entity';
import { OrderAddress } from './entities/order-address.entity';
import { Product } from '../products/entities/product.entity';
import { Seller } from '../sellers/entities/seller.entity';
import { PaymentEvent } from '../payments/entities/payment-event.entity';
import { PaymentsModule } from '../payments/payments.module';
import { BuyerOrdersController } from './buyer-orders.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderAddress,
      Product,
      Seller,
      PaymentEvent,
    ]),
    AuthModule,
    forwardRef(() => PaymentsModule),
  ],
  controllers: [OrdersController, BuyerOrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
