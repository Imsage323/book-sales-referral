import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WxTradeService } from './wx-trade.service';

@UseGuards(JwtAuthGuard)
@Controller('wx-trade')
export class WxTradeController {
  constructor(private readonly wxTradeService: WxTradeService) {}

  /** 诊断：发货信息管理服务开通状态与当前运行模式 */
  @Get('status')
  getStatus() {
    return this.wxTradeService.getStatus();
  }

  /** 微信快递公司（运力）编码表 */
  @Get('express-companies')
  listExpressCompanies() {
    return this.wxTradeService.listExpressCompanies();
  }

  /** 配置微信订单中心的订单详情跳转 path（幂等） */
  @Post('order-detail-path')
  updateOrderDetailPath() {
    return this.wxTradeService.updateOrderDetailPath();
  }
}
