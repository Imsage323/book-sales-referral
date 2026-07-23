import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderAddressDto } from './dto/order-address.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { PayOrderDto } from './dto/pay-order.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.findOne(id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Query() query: QueryOrderDto) {
    return this.ordersService.findAll(query);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, dto);
  }

  @Patch(':id/address')
  updateAddress(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: OrderAddressDto,
  ) {
    return this.ordersService.updateAddress(id, dto);
  }

  @Post(':id/pay')
  pay(@Param('id', ParseUUIDPipe) id: string, @Body() _dto: PayOrderDto) {
    return this.ordersService.payOrder(id);
  }

  @Post(':id/pay-sync')
  paySync(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.syncPayment(id);
  }
}
