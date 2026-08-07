/** 微信支付 / 微信登录相关环境变量集中读取。 */
export type WxRuntimeMode = 'real' | 'mock' | 'disabled';

export interface WxConfig {
  loginMode: WxRuntimeMode;
  payMode: WxRuntimeMode;
  appid: string;
  secret: string;
  mchid: string;
  serialNo: string;
  apiV3Key: string;
  privateKey: string;
  publicKeyId: string;
  publicKey: string;
  notifyUrl: string;
}

/** 环境变量中的 PEM 内容以 \n 转义存储，读取时还原为真实换行 */
function readPem(value?: string): string {
  return (value || '').replace(/\\n/g, '\n');
}

function readMode(value?: string): WxRuntimeMode {
  if (value === 'real' || value === 'mock') return value;
  return 'disabled';
}

function isMockEnvironment(): boolean {
  return (
    process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
  );
}

export function getWxConfig(): WxConfig {
  return {
    loginMode: readMode(process.env.WX_LOGIN_MODE),
    payMode: readMode(process.env.WX_PAY_MODE),
    appid: process.env.WX_APPID || '',
    secret: process.env.WX_SECRET || '',
    mchid: process.env.WX_MCHID || '',
    serialNo: process.env.WX_PAY_SERIAL_NO || '',
    apiV3Key: process.env.WX_PAY_APIV3_KEY || '',
    privateKey: readPem(process.env.WX_PAY_PRIVATE_KEY),
    publicKeyId: process.env.WX_PAY_PUBLIC_KEY_ID || '',
    publicKey: readPem(process.env.WX_PAY_PUBLIC_KEY),
    notifyUrl: process.env.WX_PAY_NOTIFY_URL || '',
  };
}

export function isWxLoginEnabled(): boolean {
  const config = getWxConfig();
  return config.loginMode === 'real' && !!config.appid && !!config.secret;
}

export function isWxLoginMockEnabled(): boolean {
  return getWxConfig().loginMode === 'mock' && isMockEnvironment();
}

export function isWxPayEnabled(): boolean {
  const config = getWxConfig();
  return (
    config.payMode === 'real' &&
    !!config.appid &&
    !!config.mchid &&
    !!config.serialNo &&
    !!config.apiV3Key &&
    !!config.privateKey &&
    !!config.publicKeyId &&
    !!config.publicKey &&
    !!config.notifyUrl
  );
}

export function isWxPayMockEnabled(): boolean {
  return getWxConfig().payMode === 'mock' && isMockEnvironment();
}
