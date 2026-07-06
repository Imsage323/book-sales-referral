import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { QrcodesService } from './qrcodes.service';
import { CreateQrcodeDto } from './dto/create-qrcode.dto';
import { QueryQrcodeDto } from './dto/query-qrcode.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('qrcodes')
export class QrcodesController {
  constructor(private readonly qrcodesService: QrcodesService) {}

  @Post()
  create(@Body() dto: CreateQrcodeDto) {
    return this.qrcodesService.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryQrcodeDto) {
    return this.qrcodesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.qrcodesService.findOne(id);
  }

  @Get(':id/download')
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const { buffer, contentType } = await this.qrcodesService.getImageData(id);
    res.setHeader('Content-Type', contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="qrcode-${id}.svg"`,
    );
    res.send(buffer);
  }
}
