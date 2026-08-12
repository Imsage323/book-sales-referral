import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { BuyerJwtAuthGuard } from '../auth/buyer-jwt-auth.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderAddressDto } from './dto/order-address.dto';
import { PayOrderDto } from './dto/pay-order.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { OrdersService } from './orders.service';

interface BuyerRequest {
  user: {
    openid: string;
    tokenType: 'buyer';
  };
}

@Controller('buyer/orders')
@UseGuards(BuyerJwtAuthGuard)
export class BuyerOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Req() req: BuyerRequest, @Body() dto: CreateOrderDto) {
    return this.ordersService.createForBuyer(dto, req.user.openid);
  }

  @Get()
  findMine(@Req() req: BuyerRequest, @Query() query: QueryOrderDto) {
    return this.ordersService.findMine(req.user.openid, query);
  }

  // 详情接口同时接受内部订单 id 和商户订单号（orderNo），后者用于微信订单中心跳转
  @Get(':id')
  findOne(@Req() req: BuyerRequest, @Param('id') idOrOrderNo: string) {
    return this.ordersService.findOneForBuyer(idOrOrderNo, req.user.openid);
  }

  @Patch(':id/address')
  updateAddress(
    @Req() req: BuyerRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: OrderAddressDto,
  ) {
    return this.ordersService.updateAddressForBuyer(id, req.user.openid, dto);
  }

  @Post(':id/pay')
  pay(
    @Req() req: BuyerRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() _dto: PayOrderDto,
  ) {
    return this.ordersService.payOrderForBuyer(id, req.user.openid);
  }

  @Post(':id/pay-sync')
  paySync(@Req() req: BuyerRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.syncPaymentForBuyer(id, req.user.openid);
  }
}
