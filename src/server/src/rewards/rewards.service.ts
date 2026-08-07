import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { RewardRule, RewardRuleType } from './entities/reward-rule.entity';
import {
  RewardRecord,
  RewardStatus,
  RewardType,
} from './entities/reward-record.entity';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { Product } from '../products/entities/product.entity';
import { Seller } from '../sellers/entities/seller.entity';
import { CreateRewardRuleDto } from './dto/create-reward-rule.dto';
import { UpdateRewardRuleDto } from './dto/update-reward-rule.dto';
import { QueryRewardRuleDto } from './dto/query-reward-rule.dto';
import { QueryRewardRecordDto } from './dto/query-reward-record.dto';
import { UpdateRewardRecordStatusDto } from './dto/update-reward-record-status.dto';

export interface RewardCalculationResult {
  sellerReward: RewardRecord;
  referralReward?: RewardRecord;
}

interface RewardSummaryGroup {
  count: number;
  totalAmount: number;
}

export interface RewardRecordsSummary {
  sellerId: string;
  totalAmount: number;
  count: number;
  byStatus: Partial<Record<RewardStatus, RewardSummaryGroup>>;
  byType: Partial<Record<RewardType, RewardSummaryGroup>>;
}

@Injectable()
export class RewardsService {
  constructor(
    @InjectRepository(RewardRule)
    private readonly ruleRepo: Repository<RewardRule>,
    @InjectRepository(RewardRecord)
    private readonly recordRepo: Repository<RewardRecord>,
  ) {}

  async createRule(dto: CreateRewardRuleDto): Promise<RewardRule> {
    const rule = this.ruleRepo.create(dto);
    return this.ruleRepo.save(rule);
  }

  async findAllRules(
    query: QueryRewardRuleDto,
  ): Promise<{ items: RewardRule[]; total: number }> {
    const { productId, sellerId, ruleType, isDefault, page = 1, pageSize = 20 } = query;
    const where: any = {};
    if (productId) where.productId = productId;
    if (sellerId) where.sellerId = sellerId;
    if (ruleType) where.ruleType = ruleType;
    if (isDefault !== undefined) where.isDefault = isDefault;

    const [items, total] = await this.ruleRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { items, total };
  }

  async findOneRule(id: string): Promise<RewardRule> {
    const rule = await this.ruleRepo.findOne({ where: { id } });
    if (!rule) {
      throw new NotFoundException('返点规则不存在');
    }
    return rule;
  }

  async updateRule(id: string, dto: UpdateRewardRuleDto): Promise<RewardRule> {
    const rule = await this.findOneRule(id);
    Object.assign(rule, dto);
    return this.ruleRepo.save(rule);
  }

  async removeRule(id: string): Promise<void> {
    await this.findOneRule(id);
    await this.ruleRepo.delete(id);
  }

  async findBestRule(
    productId: string,
    sellerId: string,
  ): Promise<RewardRule | null> {
    const qb = this.ruleRepo.createQueryBuilder('rule');

    qb.where(
      '(rule.productId = :productId AND rule.sellerId = :sellerId)',
      { productId, sellerId },
    );
    qb.orWhere(
      '(rule.productId = :productId AND rule.sellerId IS NULL)',
      { productId },
    );
    qb.orWhere(
      '(rule.productId IS NULL AND rule.sellerId = :sellerId)',
      { sellerId },
    );
    qb.orWhere('(rule.isDefault = true)');

    qb.orderBy('rule.createdAt', 'DESC');

    const rules = await qb.getMany();

    return (
      rules.find((r) => r.productId === productId && r.sellerId === sellerId) ||
      rules.find((r) => r.productId === productId && !r.sellerId) ||
      rules.find((r) => !r.productId && r.sellerId === sellerId) ||
      rules.find((r) => r.isDefault) ||
      null
    );
  }

  calculateRewardAmount(
    order: Order,
    rule: RewardRule,
  ): number {
    switch (rule.ruleType) {
      case RewardRuleType.FIXED_PER_BOOK:
        return order.quantity * (rule.fixedAmount || rule.baseValue || 0);
      case RewardRuleType.PERCENTAGE:
        return Math.floor((order.totalAmount * (rule.rate || 0)) / 10000);
      case RewardRuleType.TIER:
        if (order.quantity >= rule.threshold) {
          return Math.floor((order.totalAmount * (rule.rate || 0)) / 10000);
        }
        return order.quantity * (rule.baseValue || 0);
      default:
        return 0;
    }
  }

  async calculateRewards(
    order: Order,
    product: Product,
    seller: Seller,
  ): Promise<RewardRecord[]> {
    const records: RewardRecord[] = [];

    const rule =
      (await this.findBestRule(order.productId, order.sellerId)) ||
      this.createDefaultRule();

    const sellerAmount = this.calculateRewardAmount(order, rule);
    records.push(
      this.recordRepo.create({
        orderId: order.id,
        productId: order.productId,
        sellerId: order.sellerId,
        beneficiaryId: order.sellerId,
        rewardType: RewardType.SELLER,
        status: RewardStatus.READY,
        amount: sellerAmount,
        ruleSnapshot: rule as any,
        formula: `${this.describeRule(rule)} × 数量${order.quantity} = ${sellerAmount}分`,
        calculatedAt: new Date(),
      }),
    );

    if (seller.parentId) {
      const referralAmount = order.quantity * 0.5; // 占位：每本 0.5 分推荐奖励
      records.push(
        this.recordRepo.create({
          orderId: order.id,
          productId: order.productId,
          sellerId: order.sellerId,
          beneficiaryId: seller.parentId,
          rewardType: RewardType.REFERRAL,
          status: RewardStatus.READY,
          amount: referralAmount,
          ruleSnapshot: { placeholder: '一层直接推荐奖励 0.5分/本' },
          formula: `0.5分/本 × 数量${order.quantity} = ${referralAmount}分`,
          calculatedAt: new Date(),
        }),
      );
    }

    return records;
  }

  async findAllRecords(
    query: QueryRewardRecordDto,
  ): Promise<{ items: RewardRecord[]; total: number }> {
    const {
      orderId,
      sellerId,
      beneficiaryId,
      rewardType,
      status,
      page = 1,
      pageSize = 20,
    } = query;
    const where: any = {};
    if (orderId) where.orderId = orderId;
    if (sellerId) where.sellerId = sellerId;
    if (beneficiaryId) where.beneficiaryId = beneficiaryId;
    if (rewardType) where.rewardType = rewardType;
    if (status) where.status = status;

    const [items, total] = await this.recordRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { items, total };
  }

  async getRecordsSummary(sellerId: string): Promise<RewardRecordsSummary> {
    const rows = await this.recordRepo
      .createQueryBuilder('record')
      .select('record.status', 'status')
      .addSelect('record.rewardType', 'rewardType')
      .addSelect('COUNT(record.id)', 'count')
      .addSelect('COALESCE(SUM(record.amount), 0)', 'totalAmount')
      .where('record.sellerId = :sellerId', { sellerId })
      .groupBy('record.status')
      .addGroupBy('record.rewardType')
      .getRawMany<{
        status: RewardStatus;
        rewardType: RewardType;
        count: string | number;
        totalAmount: string | number;
      }>();

    const summary: RewardRecordsSummary = {
      sellerId,
      totalAmount: 0,
      count: 0,
      byStatus: {},
      byType: {},
    };

    for (const row of rows) {
      const count = Number(row.count) || 0;
      const totalAmount = Number(row.totalAmount) || 0;

      summary.count += count;
      summary.totalAmount += totalAmount;
      this.addSummaryGroup(summary.byStatus, row.status, count, totalAmount);
      this.addSummaryGroup(summary.byType, row.rewardType, count, totalAmount);
    }

    return summary;
  }

  async findOneRecord(id: string): Promise<RewardRecord> {
    const record = await this.recordRepo.findOne({ where: { id } });
    if (!record) {
      throw new NotFoundException('返点记录不存在');
    }
    return record;
  }

  async updateRecordStatus(
    id: string,
    dto: UpdateRewardRecordStatusDto,
  ): Promise<RewardRecord> {
    const record = await this.findOneRecord(id);
    record.status = dto.status;
    if (dto.remark) record.remark = dto.remark;

    if (dto.status === RewardStatus.PROCESSED) {
      record.processedAmount = record.amount;
      record.processedAt = new Date();
    }

    return this.recordRepo.save(record);
  }

  async createDefaultRuleIfMissing(): Promise<void> {
    const existing = await this.ruleRepo.findOne({ where: { isDefault: true } });
    if (!existing) {
      const rule = this.ruleRepo.create({
        ruleType: RewardRuleType.FIXED_PER_BOOK,
        fixedAmount: 1,
        baseValue: 1,
        isDefault: true,
      });
      await this.ruleRepo.save(rule);
    }
  }

  private createDefaultRule(): RewardRule {
    return this.ruleRepo.create({
      ruleType: RewardRuleType.FIXED_PER_BOOK,
      fixedAmount: 1,
      baseValue: 1,
      isDefault: true,
    });
  }

  private describeRule(rule: RewardRule): string {
    switch (rule.ruleType) {
      case RewardRuleType.FIXED_PER_BOOK:
        return `${rule.fixedAmount || rule.baseValue}分/本`;
      case RewardRuleType.PERCENTAGE:
        return `${rule.rate || 0}‱`;
      case RewardRuleType.TIER:
        return `阶梯（≥${rule.threshold}本，${rule.rate}‱）`;
      default:
        return '默认规则';
    }
  }

  private addSummaryGroup<T extends string>(
    groups: Partial<Record<T, RewardSummaryGroup>>,
    key: T,
    count: number,
    totalAmount: number,
  ): void {
    const current = groups[key] || { count: 0, totalAmount: 0 };
    groups[key] = {
      count: current.count + count,
      totalAmount: current.totalAmount + totalAmount,
    };
  }
}
