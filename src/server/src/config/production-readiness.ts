const LOGIN_REQUIRED_KEYS = ['WX_APPID', 'WX_SECRET'] as const;
const PAY_REQUIRED_KEYS = [
  'WX_APPID',
  'WX_MCHID',
  'WX_PAY_SERIAL_NO',
  'WX_PAY_APIV3_KEY',
  'WX_PAY_PRIVATE_KEY',
  'WX_PAY_PUBLIC_KEY_ID',
  'WX_PAY_PUBLIC_KEY',
  'WX_PAY_NOTIFY_URL',
] as const;

function hasValue(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * 生产环境必须显式启用真实微信登录和支付，并且配置完整。
 * 错误只输出字段名，禁止把密钥值带入启动日志。
 */
export function validateProductionReadiness(
  config: Record<string, unknown>,
): Record<string, unknown> {
  if (config.NODE_ENV !== 'production') return config;

  const invalidKeys = new Set<string>();

  if (config.WX_LOGIN_MODE !== 'real') invalidKeys.add('WX_LOGIN_MODE');
  if (config.WX_PAY_MODE !== 'real') invalidKeys.add('WX_PAY_MODE');

  for (const key of [...LOGIN_REQUIRED_KEYS, ...PAY_REQUIRED_KEYS]) {
    if (!hasValue(config[key])) invalidKeys.add(key);
  }

  if (
    hasValue(config.WX_PAY_APIV3_KEY) &&
    (config.WX_PAY_APIV3_KEY as string).length !== 32
  ) {
    invalidKeys.add('WX_PAY_APIV3_KEY');
  }

  if (hasValue(config.WX_PAY_NOTIFY_URL)) {
    try {
      const notifyUrl = new URL(config.WX_PAY_NOTIFY_URL as string);
      if (notifyUrl.protocol !== 'https:') invalidKeys.add('WX_PAY_NOTIFY_URL');
    } catch {
      invalidKeys.add('WX_PAY_NOTIFY_URL');
    }
  }

  if (invalidKeys.size > 0) {
    throw new Error(
      `生产微信配置不完整或无效: ${Array.from(invalidKeys).sort().join(', ')}`,
    );
  }

  return config;
}
