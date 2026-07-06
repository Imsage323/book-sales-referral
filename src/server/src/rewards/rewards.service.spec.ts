import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RewardsService } from './rewards.service';
import { RewardRule, RewardRuleType } from './entities/reward-rule.entity';
import { RewardRecord, RewardStatus, RewardType } from './entities/reward-record.entity';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { Product } from '../products/entities/product.entity';
import { Seller } from '../sellers/entities/seller.entity';

describe('RewardsService', () => {
  let service: RewardsService;
  let ruleRepo: Repository<RewardRule>;
  let recordRepo: Repository<RewardRecord>;

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
      ],
    }).compile();

    service = module.get<RewardsService>(RewardsService);
    ruleRepo = module.get<Repository<RewardRule>>(getRepositoryToken(RewardRule));
    recordRepo = module.get<Repository<RewardRecord>>(getRepositoryToken(RewardRecord));
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
    const order = {
      id: 'order-1',
      productId: 'product-1',
      sellerId: 'seller-1',
      quantity: 2,
      totalAmount: 200,
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
    jest.spyOn(ruleRepo, 'create').mockImplementation((dto: any) => dto as RewardRule);
    jest.spyOn(recordRepo, 'create').mockImplementation((dto: any) => dto as RewardRecord);

    const records = await service.calculateRewards(order, product, seller);

    expect(records).toHaveLength(2);
    expect(records[0].rewardType).toBe(RewardType.SELLER);
    expect(records[0].amount).toBe(2); // 默认 1分/本
    expect(records[0].status).toBe(RewardStatus.READY);
    expect(records[1].rewardType).toBe(RewardType.REFERRAL);
    expect(records[1].amount).toBe(1); // 0.5分/本 × 2
    expect(records[1].beneficiaryId).toBe('seller-parent');
  });

  it('should find best rule by priority', async () => {
    const rules = [
      { id: '1', productId: 'product-1', sellerId: 'seller-1', ruleType: RewardRuleType.FIXED_PER_BOOK, isDefault: false } as unknown as RewardRule,
      { id: '2', productId: 'product-1', sellerId: null, ruleType: RewardRuleType.FIXED_PER_BOOK, isDefault: false } as unknown as RewardRule,
      { id: '3', productId: null, sellerId: 'seller-1', ruleType: RewardRuleType.FIXED_PER_BOOK, isDefault: false } as unknown as RewardRule,
      { id: '4', productId: null, sellerId: null, ruleType: RewardRuleType.FIXED_PER_BOOK, isDefault: true } as unknown as RewardRule,
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
});
