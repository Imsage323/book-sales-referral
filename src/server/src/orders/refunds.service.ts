import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { RefundRecord, RefundStatus } from './entities/refund-record.entity';
import {
  RewardRecord,
  RewardStatus,
} from '../rewards/entities/reward-record.entity';
import { WxPayService } from '../payments/wx-pay.service';
import { isWxPayEnabled, isWxPayMockEnabled } from '../config/wx.config';
import { CreateRefundDto } from './dto/create-refund.dto';

@Injectable()
export class RefundsService {
  private readonly logger = new Logger(RefundsService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(RefundRecord)
    private readonly refundRepo: Repository<RefundRecord>,
    @InjectRepository(RewardRecord)
    private readonly rewardRepo: Repository<RewardRecord>,
    private readonly wxPayService: WxPayService,
  ) {}

  /** 发起退款（管理员）。全额退款成功后订单置为已退款并冲销返点 */
  async createRefund(
    orderId: string,
    dto: CreateRefundDto,
    operator: string,
  ): Promise<RefundRecord> {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    if (!order.paidAt || order.status === OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException('订单未支付，无法退款');
    }
    if (order.status === OrderStatus.REFUNDED) {
      throw new BadRequestException('订单已全额退款');
    }
    if (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.CLOSED) {
      throw new BadRequestException('订单已关闭，无法退款');
    }

    const refundedSoFar = await this.sumRefundedAmount(orderId);
    const remaining = order.totalAmount - refundedSoFar;
    if (remaining <= 0) {
      throw new BadRequestException('订单无可退金额');
    }
    const amount = dto.amount ?? remaining;
    if (amount > remaining) {
      throw new BadRequestException(`退款金额超出可退金额（剩余 ${remaining} 分）`);
    }

    // 同一订单多次退款时追加序号，保证 outRefundNo 唯一
    const existingCount = await this.refundRepo.count({ where: { orderId } });
    const outRefundNo = `${order.orderNo}-R${existingCount + 1}`;

    let status = RefundStatus.PROCESSING;
    let wxRefundId = '';
    if (isWxPayMockEnabled() || !isWxPayEnabled()) {
      // mock/未启用真实支付：直接视为退款成功（与 mock 支付对齐）
      status = RefundStatus.SUCCESS;
    } else {
      try {
        const result = await this.wxPayService.createRefund({
          outTradeNo: order.orderNo,
          outRefundNo,
          refundAmount: amount,
          totalAmount: order.totalAmount,
          reason: dto.reason,
        });
        wxRefundId = result.refundId;
        status = this.mapWxStatus(result.status);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`订单 ${order.orderNo} 发起退款失败: ${message}`);
        throw new BadRequestException(`微信退款发起失败：${message}`);
      }
    }

    const record = await this.refundRepo.save(
      this.refundRepo.create({
        orderId,
        amount,
        reason: dto.reason,
        operator,
        outRefundNo,
        status,
        wxRefundId: wxRefundId || undefined,
      }),
    );

    if (status === RefundStatus.SUCCESS) {
      await this.finalizeRefund(order, record);
    }
    return record;
  }

  /** 按微信侧最新状态同步一笔处理中的退款（管理员手动触发） */
  async syncRefund(refundId: string): Promise<RefundRecord> {
    const record = await this.refundRepo.findOne({ where: { id: refundId } });
    if (!record) {
      throw new NotFoundException('退款记录不存在');
    }
    if (record.status !== RefundStatus.PROCESSING) {
      return record;
    }
    if (!record.outRefundNo) {
      throw new BadRequestException('退款记录缺少商户退款单号');
    }
    if (isWxPayMockEnabled() || !isWxPayEnabled()) {
      record.status = RefundStatus.SUCCESS;
    } else {
      const result = await this.wxPayService.queryRefund(record.outRefundNo);
      record.status = this.mapWxStatus(result.status);
      if (result.refundId) {
        record.wxRefundId = result.refundId;
      }
    }
    const saved = await this.refundRepo.save(record);
    if (saved.status === RefundStatus.SUCCESS) {
      const order = await this.orderRepo.findOne({
        where: { id: record.orderId },
      });
      if (order) {
        await this.finalizeRefund(order, saved);
      }
    }
    return saved;
  }

  async listByOrder(orderId: string): Promise<RefundRecord[]> {
    return this.refundRepo.find({
      where: { orderId },
      order: { createdAt: 'DESC' },
    });
  }

  /** 退款成功后的收尾：累计退满则订单置为已退款并冲销返点 */
  private async finalizeRefund(
    order: Order,
    record: RefundRecord,
  ): Promise<void> {
    const refundedTotal = await this.sumRefundedAmount(order.id);
    if (refundedTotal < order.totalAmount) {
      this.logger.log(
        `订单 ${order.orderNo} 部分退款 ${record.amount} 分（累计 ${refundedTotal}/${order.totalAmount}），暂不冲销返点`,
      );
      return;
    }

    await this.orderRepo.manager.transaction(async (manager) => {
      const locked = await manager.findOne(Order, {
        where: { id: order.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!locked || locked.status === OrderStatus.REFUNDED) {
        return; // 幂等：已退款的不重复冲销
      }
      locked.status = OrderStatus.REFUNDED;
      await manager.save(locked);
      await this.reverseRewards(manager, locked, record);
    });
    this.logger.log(
      `订单 ${order.orderNo} 已全额退款（${refundedTotal} 分），订单关闭并冲销返点`,
    );
  }

  /** 返点冲销：未结算（预估/待结算/待处理）作废；已结算的生成等额负向冲销记录 */
  private async reverseRewards(
    manager: import('typeorm').EntityManager,
    order: Order,
    record: RefundRecord,
  ): Promise<void> {
    const records = await manager.find(RewardRecord, {
      where: {
        orderId: order.id,
        status: In([
          RewardStatus.ESTIMATED,
          RewardStatus.READY,
          RewardStatus.PENDING,
          RewardStatus.PROCESSED,
        ]),
      },
    });
    for (const reward of records) {
      if (reward.status === RewardStatus.PROCESSED) {
        // 已结算：保留原记录，追加负向冲销记录
        await manager.save(
          manager.create(RewardRecord, {
            orderId: reward.orderId,
            productId: reward.productId,
            sellerId: reward.sellerId,
            beneficiaryId: reward.beneficiaryId,
            rewardType: reward.rewardType,
            status: RewardStatus.REVERSED,
            amount: -reward.amount,
            ruleSnapshot: reward.ruleSnapshot,
            formula: `退款冲销（退款单 ${record.outRefundNo}）：-${reward.amount}分`,
            calculatedAt: new Date(),
            remark: `关联原记录 ${reward.id}`,
          }),
        );
      } else {
        // 未结算：直接作废
        reward.status = RewardStatus.VOID;
        reward.remark = `退款作废（退款单 ${record.outRefundNo}）`;
        await manager.save(reward);
      }
    }
  }

  /** 已累计退款金额（只统计处理中+成功的，异常/关闭的不占额度） */
  private async sumRefundedAmount(orderId: string): Promise<number> {
    const records = await this.refundRepo.find({
      where: {
        orderId,
        status: In([RefundStatus.PROCESSING, RefundStatus.SUCCESS]),
      },
    });
    return records.reduce((sum, item) => sum + item.amount, 0);
  }

  private mapWxStatus(wxStatus: string): RefundStatus {
    switch (wxStatus) {
      case 'SUCCESS':
        return RefundStatus.SUCCESS;
      case 'CLOSED':
        return RefundStatus.CLOSED;
      case 'ABNORMAL':
        return RefundStatus.ABNORMAL;
      default:
        return RefundStatus.PROCESSING;
    }
  }
}
