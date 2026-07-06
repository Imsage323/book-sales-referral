import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RewardsService } from './rewards.service';
import { SettlementService } from './settlement.service';
import { CreateRewardRuleDto } from './dto/create-reward-rule.dto';
import { UpdateRewardRuleDto } from './dto/update-reward-rule.dto';
import { QueryRewardRuleDto } from './dto/query-reward-rule.dto';
import { QueryRewardRecordDto } from './dto/query-reward-record.dto';
import { UpdateRewardRecordStatusDto } from './dto/update-reward-record-status.dto';

@Controller('rewards')
@UseGuards(JwtAuthGuard)
export class RewardsController {
  constructor(
    private readonly rewardsService: RewardsService,
    private readonly settlementService: SettlementService,
  ) {}

  @Post('rules')
  createRule(@Body() dto: CreateRewardRuleDto) {
    return this.rewardsService.createRule(dto);
  }

  @Get('rules')
  findAllRules(@Query() query: QueryRewardRuleDto) {
    return this.rewardsService.findAllRules(query);
  }

  @Get('rules/:id')
  findOneRule(@Param('id', ParseUUIDPipe) id: string) {
    return this.rewardsService.findOneRule(id);
  }

  @Patch('rules/:id')
  updateRule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRewardRuleDto,
  ) {
    return this.rewardsService.updateRule(id, dto);
  }

  @Delete('rules/:id')
  removeRule(@Param('id', ParseUUIDPipe) id: string) {
    return this.rewardsService.removeRule(id);
  }

  @Get('records')
  findAllRecords(@Query() query: QueryRewardRecordDto) {
    return this.rewardsService.findAllRecords(query);
  }

  @Get('records/:id')
  findOneRecord(@Param('id', ParseUUIDPipe) id: string) {
    return this.rewardsService.findOneRecord(id);
  }

  @Patch('records/:id/status')
  updateRecordStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRewardRecordStatusDto,
  ) {
    return this.rewardsService.updateRecordStatus(id, dto);
  }

  @Post('settlements/run')
  async runSettlement() {
    const result = await this.settlementService.settleOrders();
    return result;
  }
}
