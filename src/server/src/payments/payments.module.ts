import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentEvent } from './entities/payment-event.entity';
import { Order } from '../orders/entities/order.entity';
import { OrdersModule } from '../orders/orders.module';
import { WxPayService } from './wx-pay.service';
import { WxLoginService } from './wx-login.service';
import { WxController } from './wx.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentEvent, Order]),
    forwardRef(() => OrdersModule),
  ],
  controllers: [WxController],
  providers: [WxPayService, WxLoginService],
  exports: [WxPayService, WxLoginService],
})
export class PaymentsModule {}
