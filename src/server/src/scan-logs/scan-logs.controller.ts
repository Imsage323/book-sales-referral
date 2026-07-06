import { Controller, Post, Body } from '@nestjs/common';
import { ScanLogsService } from './scan-logs.service';
import { CreateScanLogDto } from './dto/create-scan-log.dto';

@Controller('scan-logs')
export class ScanLogsController {
  constructor(private readonly scanLogsService: ScanLogsService) {}

  @Post()
  create(@Body() dto: CreateScanLogDto) {
    return this.scanLogsService.create(dto);
  }
}
