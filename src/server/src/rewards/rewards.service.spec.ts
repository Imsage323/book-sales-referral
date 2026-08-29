import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RewardsService } from './rewards.service';
import { RewardRule, RewardRuleType } from './entities/reward-rule.entity';
import {
  RewardRecord,
  RewardStatus,
  RewardType,
} from './entities/reward-record.entity';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { Product } from '../products/entities/product.entity';
import { Seller } from '../sellers/entities/seller.entity';

describe('RewardsService', () => {
  let service: RewardsService;
  let ruleRepo: Repository<RewardRule>;
  let recordRepo: Repository<RewardRecord>;
  let orderRepo: Repository<Order>;
  let sellerRepo: Repository<Seller>;
  const originalReferralEnabled = process.env.REFERRAL_REWARD_ENABLED;
  const originalReferralAmount = process.env.REFERRAL_REWARD_CENTS_PER_BOOK;
  const originalDirectSellerCode = process.env.DEFAULT_SELLER_CODE;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RewardsService,
        {
          provide: getRepositoryToken(RewardRule),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(RewardRecord),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(Order),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(Seller),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<RewardsService>(RewardsService);
    ruleRepo = module.get<Repository<RewardRule>>(
      getRepositoryToken(RewardRule),
    );
    recordRepo = module.get<Repository<RewardRecord>>(
      getRepositoryToken(RewardRecord),
    );
    orderRepo = module.get<Repository<Order>>(getRepositoryToken(Order));
    sellerRepo = module.get<Repository<Seller>>(getRepositoryToken(Seller));
  });

  afterEach(() => {
    restoreEnv('REFERRAL_REWARD_ENABLED', originalReferralEnabled);
    restoreEnv('REFERRAL_REWARD_CENTS_PER_BOOK', originalReferralAmount);
    restoreEnv('DEFAULT_SELLER_CODE', originalDirectSellerCode);
  });

  it('should calculate fixed per book reward', () => {
    const order = {
      id: 'order-1',
      productId: 'product-1',
      sellerId: 'seller-1',
      quantity: 3,
      totalAmount: 300,
    } as Order;
    const rule = {
      ruleType: RewardRuleType.FIXED_PER_BOOK,
      fixedAmount: 10,
      baseValue: 10,
    } as RewardRule;

    expect(service.calculateRewardAmount(order, rule)).toBe(30);
  });

  it('should calculate percentage reward', () => {
    const order = {
      id: 'order-1',
      productId: 'product-1',
      sellerId: 'seller-1',
      quantity: 1,
      totalAmount: 10000,
    } as Order;
    const rule = {
      ruleType: RewardRuleType.PERCENTAGE,
      rate: 500, // 5%
    } as RewardRule;

    expect(service.calculateRewardAmount(order, rule)).toBe(500);
  });

  it('should calculate tier reward when threshold met', () => {
    const order = {
      id: 'order-1',
      productId: 'product-1',
      sellerId: 'seller-1',
      quantity: 5,
      totalAmount: 50000,
    } as Order;
    const rule = {
      ruleType: RewardRuleType.TIER,
      threshold: 5,
      rate: 1000, // 10%
      baseValue: 5,
    } as RewardRule;

    expect(service.calculateRewardAmount(order, rule)).toBe(5000);
  });

  it('should calculate tier reward base when threshold not met', () => {
    const order = {
      id: 'order-1',
      productId: 'product-1',
      sellerId: 'seller-1',
      quantity: 2,
      totalAmount: 20000,
    } as Order;
    const rule = {
      ruleType: RewardRuleType.TIER,
      threshold: 5,
      rate: 1000,
      baseValue: 5,
    } as RewardRule;

    expect(service.calculateRewardAmount(order, rule)).toBe(10);
  });

  it('should create seller and referral rewards', async () => {
    process.env.REFERRAL_REWARD_ENABLED = 'true';
    process.env.REFERRAL_REWARD_CENTS_PER_BOOK = '1';
    const order = {
      id: 'order-1',
      productId: 'product-1',
      sellerId: 'seller-1',
      quantity: 1,
      totalAmount: 100,
    } as Order;
    const product = {
      id: 'product-1',
      name: 'Test Book',
    } as Product;
    const seller = {
      id: 'seller-1',
      parentId: 'seller-parent',
    } as Seller;

    jest.spyOn(ruleRepo, 'createQueryBuilder').mockReturnValue({
      where: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    } as any);
    jest
      .spyOn(ruleRepo, 'create')
      .mockImplementation((dto: any) => dto as RewardRule);
    jest
      .spyOn(recordRepo, 'create')
      .mockImplementation((dto: any) => dto as RewardRecord);
    jest.spyOn(sellerRepo, 'findOne').mockResolvedValue({
      id: 'seller-parent',
      sellerCode: 'PARENT01',
    } as Seller);

    const records = await service.calculateRewards(order, product, seller);

    expect(records).toHaveLength(2);
    expect(records[0].rewardType).toBe(RewardType.SELLER);
    expect(records[0].amount).toBe(1); // 默认 1分/本
    expect(records[0].status).toBe(RewardStatus.READY);
    expect(records[1].rewardType).toBe(RewardType.REFERRAL);
    expect(records[1].amount).toBe(1); // 1分/本 × 1
    expect(records[1].beneficiaryId).toBe('seller-parent');
  });

  it('should skip referral reward when parent is the direct seller', async () => {
    process.env.REFERRAL_REWARD_ENABLED = 'true';
    process.env.REFERRAL_REWARD_CENTS_PER_BOOK = '1';
    process.env.DEFAULT_SELLER_CODE = 'SMFMSVV';
    const order = {
      id: 'order-1',
      productId: 'product-1',
      sellerId: 'seller-1',
      quantity: 1,
      totalAmount: 100,
    } as Order;
    const seller = {
      id: 'seller-1',
      parentId: 'seller-parent',
    } as Seller;

    jest.spyOn(ruleRepo, 'createQueryBuilder').mockReturnValue({
      where: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    } as any);
    jest
      .spyOn(ruleRepo, 'create')
      .mockImplementation((dto: any) => dto as RewardRule);
    jest
      .spyOn(recordRepo, 'create')
      .mockImplementation((dto: any) => dto as RewardRecord);
    jest.spyOn(sellerRepo, 'findOne').mockResolvedValue({
      id: 'seller-parent',
      sellerCode: 'SMFMSVV',
    } as Seller);

    const records = await service.calculateRewards(
      order,
      { id: 'product-1' } as Product,
      seller,
    );

    expect(records).toHaveLength(1);
    expect(records[0].rewardType).toBe(RewardType.SELLER);
  });

  it('should keep referral rewards disabled by default', async () => {
    delete process.env.REFERRAL_REWARD_ENABLED;
    delete process.env.REFERRAL_REWARD_CENTS_PER_BOOK;
    const order = {
      id: 'order-1',
      productId: 'product-1',
      sellerId: 'seller-1',
      quantity: 1,
      totalAmount: 100,
    } as Order;
    const seller = { id: 'seller-1', parentId: 'seller-parent' } as Seller;

    jest.spyOn(ruleRepo, 'createQueryBuilder').mockReturnValue({
      where: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    } as any);
    jest
      .spyOn(ruleRepo, 'create')
      .mockImplementation((dto: any) => dto as RewardRule);
    jest
      .spyOn(recordRepo, 'create')
      .mockImplementation((dto: any) => dto as RewardRecord);

    const records = await service.calculateRewards(
      order,
      { id: 'product-1' } as Product,
      seller,
    );

    expect(records).toHaveLength(1);
    expect(records[0].rewardType).toBe(RewardType.SELLER);
  });

  it('should find best rule by priority', async () => {
    const rules = [
      {
        id: '1',
        productId: 'product-1',
        sellerId: 'seller-1',
        ruleType: RewardRuleType.FIXED_PER_BOOK,
        isDefault: false,
      } as unknown as RewardRule,
      {
        id: '2',
        productId: 'product-1',
        sellerId: null,
        ruleType: RewardRuleType.FIXED_PER_BOOK,
        isDefault: false,
      } as unknown as RewardRule,
      {
        id: '3',
        productId: null,
        sellerId: 'seller-1',
        ruleType: RewardRuleType.FIXED_PER_BOOK,
        isDefault: false,
      } as unknown as RewardRule,
      {
        id: '4',
        productId: null,
        sellerId: null,
        ruleType: RewardRuleType.FIXED_PER_BOOK,
        isDefault: true,
      } as unknown as RewardRule,
    ];

    jest.spyOn(ruleRepo, 'createQueryBuilder').mockReturnValue({
      where: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(rules),
    } as any);

    const best = await service.findBestRule('product-1', 'seller-1');
    expect(best?.id).toBe('1');

    const best2 = await service.findBestRule('product-1', 'other-seller');
    expect(best2?.id).toBe('2');

    const best3 = await service.findBestRule('other-product', 'seller-1');
    expect(best3?.id).toBe('3');
  });

  it('should summarize reward records by status and type', async () => {
    jest.spyOn(recordRepo, 'createQueryBuilder').mockReturnValue({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([
        {
          status: RewardStatus.READY,
          rewardType: RewardType.SELLER,
          count: '2',
          totalAmount: '300',
        },
        {
          status: RewardStatus.READY,
          rewardType: RewardType.REFERRAL,
          count: '1',
          totalAmount: '50',
        },
        {
          status: RewardStatus.PROCESSED,
          rewardType: RewardType.SELLER,
          count: '3',
          totalAmount: '600',
        },
      ]),
    } as any);

    await expect(service.getRecordsSummary('seller-1')).resolves.toEqual({
      sellerId: 'seller-1',
      totalAmount: 950,
      count: 6,
      byStatus: {
        ready: { count: 3, totalAmount: 350 },
        processed: { count: 3, totalAmount: 600 },
      },
      byType: {
        seller: { count: 5, totalAmount: 900 },
        referral: { count: 1, totalAmount: 50 },
      },
    });
  });

  it('should include the merchant order number in reward record lists', async () => {
    jest.spyOn(recordRepo, 'findAndCount').mockResolvedValue([
      [
        {
          id: 'record-1',
          orderId: 'order-1',
          rewardType: RewardType.SELLER,
          status: RewardStatus.ESTIMATED,
          amount: 3,
        } as RewardRecord,
      ],
      1,
    ]);
    jest.spyOn(orderRepo, 'find').mockResolvedValue([
      { id: 'order-1', orderNo: 'O-20260822-0001' } as Order,
    ]);

    await expect(service.findAllRecords({})).resolves.toMatchObject({
      total: 1,
      items: [
        {
          id: 'record-1',
          orderNo: 'O-20260822-0001',
        },
      ],
    });
  });
});

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
