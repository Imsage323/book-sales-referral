import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LedgerService } from './ledger.service';
import { LedgerExportDto } from './dto/ledger-export.dto';

@Controller('ledger')
@UseGuards(JwtAuthGuard)
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Get('export')
  async export(@Query() query: LedgerExportDto, @Res() res: Response) {
    const orderRows = await this.ledgerService.exportOrders(query);
    const summaryRows = await this.ledgerService.exportSummary(query);
    const buffer = this.ledgerService.generateExcel(orderRows, summaryRows);

    const filename = `ledger-${new Date().toISOString().slice(0, 10)}-${Date.now()}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
