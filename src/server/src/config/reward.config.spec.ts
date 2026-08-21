import {
  getPaidRewardEstimateConfig,
  getReferralRewardConfig,
} from './reward.config';

describe('reward config', () => {
  const keys = [
    'REWARD_ESTIMATE_ON_PAID_ENABLED',
    'REWARD_ESTIMATE_SELLER_ID',
    'REFERRAL_REWARD_ENABLED',
    'REFERRAL_REWARD_CENTS_PER_BOOK',
  ] as const;
  let backup: Record<string, string | undefined>;

  beforeEach(() => {
    backup = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
    keys.forEach((key) => delete process.env[key]);
  });

  afterEach(() => {
    for (const key of keys) {
      if (backup[key] === undefined) delete process.env[key];
      else process.env[key] = backup[key];
    }
  });

  it('keeps paid estimates disabled without a valid target seller', () => {
    process.env.REWARD_ESTIMATE_ON_PAID_ENABLED = 'true';
    process.env.REWARD_ESTIMATE_SELLER_ID = 'not-a-uuid';

    expect(getPaidRewardEstimateConfig()).toEqual({
      enabled: false,
      sellerId: null,
    });
  });

  it('enables paid estimates only for an explicit target seller', () => {
    const sellerId = '1c03b880-95fc-4fc2-ae8f-2351ba1f9efd';
    process.env.REWARD_ESTIMATE_ON_PAID_ENABLED = 'true';
    process.env.REWARD_ESTIMATE_SELLER_ID = sellerId;

    expect(getPaidRewardEstimateConfig()).toEqual({
      enabled: true,
      sellerId,
    });
  });

  it('rejects fractional referral amounts', () => {
    process.env.REFERRAL_REWARD_ENABLED = 'true';
    process.env.REFERRAL_REWARD_CENTS_PER_BOOK = '0.5';

    expect(getReferralRewardConfig()).toEqual({
      enabled: true,
      fixedAmountPerBook: 0,
    });
  });
});
