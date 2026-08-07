import { validateProductionReadiness } from './production-readiness';

function createProductionConfig(): Record<string, string> {
  return {
    NODE_ENV: 'production',
    WX_LOGIN_MODE: 'real',
    WX_PAY_MODE: 'real',
    WX_APPID: 'wx-appid',
    WX_SECRET: 'login-secret-value',
    WX_MCHID: 'merchant-id',
    WX_PAY_SERIAL_NO: 'serial-no',
    WX_PAY_APIV3_KEY: 'a'.repeat(32),
    WX_PAY_PRIVATE_KEY: 'private-key-value',
    WX_PAY_PUBLIC_KEY_ID: 'public-key-id',
    WX_PAY_PUBLIC_KEY: 'public-key-value',
    WX_PAY_NOTIFY_URL: 'https://example.com/api/wx/notify',
  };
}

describe('validateProductionReadiness', () => {
  it('allows non-production environments without real wx config', () => {
    const config = { NODE_ENV: 'test' };
    expect(validateProductionReadiness(config)).toBe(config);
  });

  it('accepts a complete production config in real mode', () => {
    const config = createProductionConfig();
    expect(validateProductionReadiness(config)).toBe(config);
  });

  it('rejects production mock modes and missing fields without leaking values', () => {
    const config = createProductionConfig();
    config.WX_LOGIN_MODE = 'mock';
    config.WX_PAY_MODE = 'mock';
    delete config.WX_SECRET;

    expect(() => validateProductionReadiness(config)).toThrow(
      /WX_LOGIN_MODE, WX_PAY_MODE, WX_SECRET/,
    );

    try {
      validateProductionReadiness(config);
    } catch (error) {
      expect((error as Error).message).not.toContain('private-key-value');
      expect((error as Error).message).not.toContain('login-secret-value');
    }
  });

  it('rejects an invalid APIv3 key or non-https notify url', () => {
    const config = createProductionConfig();
    config.WX_PAY_APIV3_KEY = 'too-short';
    config.WX_PAY_NOTIFY_URL = 'http://example.com/api/wx/notify';

    expect(() => validateProductionReadiness(config)).toThrow(
      /WX_PAY_APIV3_KEY, WX_PAY_NOTIFY_URL/,
    );
  });
});
