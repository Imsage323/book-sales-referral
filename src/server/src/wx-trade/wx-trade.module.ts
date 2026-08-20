import { Module } from '@nestjs/common';
import { WxTradeController } from './wx-trade.controller';
import { WxTradeService } from './wx-trade.service';

@Module({
  controllers: [WxTradeController],
  providers: [WxTradeService],
  exports: [WxTradeService],
})
export class WxTradeModule {}
