import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ShipmentsService } from './shipments.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { QueryShipmentDto } from './dto/query-shipment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('shipments')
export class ShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @Post()
  create(@Body() dto: CreateShipmentDto) {
    return this.shipmentsService.create(dto);
  }

  /** 手动重试微信发货信息同步 */
  @Post(':id/wx-sync')
  retryWxSync(@Param('id') id: string) {
    return this.shipmentsService.retryWxSync(id);
  }

  @Get()
  findAll(@Query() query: QueryShipmentDto) {
    return this.shipmentsService.findAll(query);
  }
}
