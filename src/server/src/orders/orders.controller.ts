import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { RefundsService } from './refunds.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { CreateRefundDto } from './dto/create-refund.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly refundsService: RefundsService,
  ) {}

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.findOne(id);
  }

  @Get()
  findAll(@Query() query: QueryOrderDto) {
    return this.ordersService.findAll(query);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, dto);
  }

  /** 发起退款（管理员），缺省全额 */
  @Post(':id/refund')
  createRefund(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateRefundDto,
    @Req() req: { user?: { username?: string } },
  ) {
    return this.refundsService.createRefund(
      id,
      dto,
      req.user?.username || 'admin',
    );
  }

  /** 订单的退款记录列表 */
  @Get(':id/refunds')
  listRefunds(@Param('id', ParseUUIDPipe) id: string) {
    return this.refundsService.listByOrder(id);
  }

  /** 同步处理中退款的微信侧状态 */
  @Post('refunds/:refundId/sync')
  syncRefund(@Param('refundId', ParseUUIDPipe) refundId: string) {
    return this.refundsService.syncRefund(refundId);
  }
}
