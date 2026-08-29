import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { RefundsService } from './refunds.service';
import { Order, OrderStatus } from './entities/order.entity';
import { RefundRecord, RefundStatus } from './entities/refund-record.entity';
import {
  RewardRecord,
  RewardStatus,
  RewardType,
} from '../rewards/entities/reward-record.entity';
import { WxPayService } from '../payments/wx-pay.service';

describe('RefundsService', () => {
  let service: RefundsService;
  let orderRepo: any;
  let refundRepo: any;
  let rewardRepo: any;
  let manager: any;

  const paidOrder = {
    id: 'order-1',
    orderNo: 'O-20260829-0001',
    totalAmount: 8800,
    status: OrderStatus.PAID,
    paidAt: new Date(),
    wxTransactionId: 'wx-tx-1',
  } as Order;

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';
    process.env.WX_PAY_MODE = 'mock';

    manager = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((_entity: unknown, dto: any) => dto),
      save: jest.fn(async (entity: any) => entity),
    };
    orderRepo = {
      findOne: jest.fn(),
      manager: {
        transaction: jest.fn(async (cb: any) => cb(manager)),
      },
    };
    refundRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn((dto: any) => dto),
      save: jest.fn(async (entity: any) => ({ id: 'refund-1', ...entity })),
    };
    rewardRepo = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefundsService,
        { provide: getRepositoryToken(Order), useValue: orderRepo },
        { provide: getRepositoryToken(RefundRecord), useValue: refundRepo },
        { provide: getRepositoryToken(RewardRecord), useValue: rewardRepo },
        { provide: WxPayService, useValue: {} },
      ],
    }).compile();

    service = module.get<RefundsService>(RefundsService);
  });

  afterEach(() => {
    delete process.env.WX_PAY_MODE;
  });

  it('rejects refund for unpaid order', async () => {
    orderRepo.findOne.mockResolvedValue({
      ...paidOrder,
      status: OrderStatus.PENDING_PAYMENT,
      paidAt: undefined,
    });

    await expect(
      service.createRefund('order-1', { reason: '测试' }, 'admin'),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects refund amount exceeding remaining', async () => {
    orderRepo.findOne.mockResolvedValue(paidOrder);
    refundRepo.find.mockResolvedValue([
      { amount: 5000, status: RefundStatus.SUCCESS },
    ]);

    await expect(
      service.createRefund(
        'order-1',
        { amount: 4000, reason: '超额' },
        'admin',
      ),
    ).rejects.toThrow('退款金额超出可退金额');
  });

  it('full refund closes order and voids estimated rewards', async () => {
    orderRepo.findOne.mockResolvedValue(paidOrder);
    // 第一次 find 是发起退款前查已退金额（无），之后是 finalize 时统计（含本次）
    refundRepo.find
      .mockResolvedValueOnce([])
      .mockResolvedValue([{ amount: 8800, status: RefundStatus.SUCCESS }]);
    const lockedOrder = { ...paidOrder };
    manager.findOne.mockResolvedValue(lockedOrder);
    const estimated = {
      id: 'reward-1',
      orderId: 'order-1',
      productId: 'product-1',
      sellerId: 'seller-1',
      beneficiaryId: 'seller-1',
      rewardType: RewardType.SELLER,
      status: RewardStatus.ESTIMATED,
      amount: 3520,
      ruleSnapshot: {},
      formula: '4000‱ × 数量1 = 3520分',
    } as RewardRecord;
    manager.find.mockResolvedValue([estimated]);

    const record = await service.createRefund(
      'order-1',
      { reason: '买家申请' },
      'admin',
    );

    expect(record.status).toBe(RefundStatus.SUCCESS);
    expect(record.amount).toBe(8800);
    expect(record.outRefundNo).toBe('O-20260829-0001-R1');
    expect(lockedOrder.status).toBe(OrderStatus.REFUNDED);
    expect(estimated.status).toBe(RewardStatus.VOID);
    expect(estimated.remark).toContain('退款作废');
  });

  it('partial refund keeps order open and rewards untouched', async () => {
    orderRepo.findOne.mockResolvedValue(paidOrder);
    refundRepo.find
      .mockResolvedValueOnce([])
      .mockResolvedValue([{ amount: 1000, status: RefundStatus.SUCCESS }]);

    const record = await service.createRefund(
      'order-1',
      { amount: 1000, reason: '部分退款' },
      'admin',
    );

    expect(record.status).toBe(RefundStatus.SUCCESS);
    expect(record.amount).toBe(1000);
    // 未退满，不进入冲销分支
    expect(manager.find).not.toHaveBeenCalled();
  });

  it('creates negative reversal record for processed rewards', async () => {
    orderRepo.findOne.mockResolvedValue(paidOrder);
    refundRepo.find
      .mockResolvedValueOnce([])
      .mockResolvedValue([{ amount: 8800, status: RefundStatus.SUCCESS }]);
    const lockedOrder = { ...paidOrder };
    manager.findOne.mockResolvedValue(lockedOrder);
    const processed = {
      id: 'reward-9',
      orderId: 'order-1',
      productId: 'product-1',
      sellerId: 'seller-1',
      beneficiaryId: 'seller-1',
      rewardType: RewardType.SELLER,
      status: RewardStatus.PROCESSED,
      amount: 3520,
      ruleSnapshot: {},
      formula: '4000‱ × 数量1 = 3520分',
    } as RewardRecord;
    manager.find.mockResolvedValue([processed]);

    await service.createRefund('order-1', { reason: '售后退款' }, 'admin');

    expect(processed.status).toBe(RewardStatus.PROCESSED); // 原记录不动
    const reversal = manager.save.mock.calls
      .map((call: any[]) => call[0])
      .find((item: any) => item.status === RewardStatus.REVERSED);
    expect(reversal).toBeDefined();
    expect(reversal.amount).toBe(-3520);
    expect(reversal.formula).toContain('退款冲销');
    expect(reversal.remark).toContain('reward-9');
  });
});
