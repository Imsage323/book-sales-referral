import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { ScanLogsService } from './scan-logs.service';
import { CreateScanLogDto } from './dto/create-scan-log.dto';
import { BuyerJwtAuthGuard } from '../auth/buyer-jwt-auth.guard';

interface BuyerRequest {
  user: { openid: string };
}

@Controller('scan-logs')
export class ScanLogsController {
  constructor(private readonly scanLogsService: ScanLogsService) {}

  @Post()
  @UseGuards(BuyerJwtAuthGuard)
  create(@Req() req: BuyerRequest, @Body() dto: CreateScanLogDto) {
    return this.scanLogsService.create(dto, req.user.openid);
  }
}
