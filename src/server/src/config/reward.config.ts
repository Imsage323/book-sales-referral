export interface ReferralRewardConfig {
  enabled: boolean;
  fixedAmountPerBook: number;
}

export interface PaidRewardEstimateConfig {
  enabled: boolean;
  sellerId: string | null;
}

export function getPaidRewardEstimateConfig(): PaidRewardEstimateConfig {
  const sellerId = process.env.REWARD_ESTIMATE_SELLER_ID || '';
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      sellerId,
    );
  return {
    // 付款后预估对全量销售方生效；REWARD_ESTIMATE_SELLER_ID 仅作为可选的
    // 单销售方限制（测试用），缺省或非法时不限制
    enabled: process.env.REWARD_ESTIMATE_ON_PAID_ENABLED === 'true',
    sellerId: isUuid ? sellerId : null,
  };
}

export function getReferralRewardConfig(): ReferralRewardConfig {
  const enabled = process.env.REFERRAL_REWARD_ENABLED === 'true';
  const amount = Number(process.env.REFERRAL_REWARD_CENTS_PER_BOOK);

  return {
    enabled,
    fixedAmountPerBook: Number.isSafeInteger(amount) && amount > 0 ? amount : 0,
  };
}
