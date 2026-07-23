/**
 * 微信支付 / 微信登录相关环境变量集中读取。
 * WX_PAY_ENABLED=true 且密钥齐全时才走真实微信支付，否则保持 mock 支付行为。
 */
export interface WxConfig {
  appid: string;
  secret: string;
  mchid: string;
  serialNo: string;
  apiV3Key: string;
  privateKey: string;
  publicKeyId: string;
  publicKey: string;
  notifyUrl: string;
  enabled: boolean;
}

/** 环境变量中的 PEM 内容以 \n 转义存储，读取时还原为真实换行 */
function readPem(value?: string): string {
  return (value || '').replace(/\\n/g, '\n');
}

export function getWxConfig(): WxConfig {
  return {
    appid: process.env.WX_APPID || '',
    secret: process.env.WX_SECRET || '',
    mchid: process.env.WX_MCHID || '',
    serialNo: process.env.WX_PAY_SERIAL_NO || '',
    apiV3Key: process.env.WX_PAY_APIV3_KEY || '',
    privateKey: readPem(process.env.WX_PAY_PRIVATE_KEY),
    publicKeyId: process.env.WX_PAY_PUBLIC_KEY_ID || '',
    publicKey: readPem(process.env.WX_PAY_PUBLIC_KEY),
    notifyUrl: process.env.WX_PAY_NOTIFY_URL || '',
    enabled: process.env.WX_PAY_ENABLED === 'true',
  };
}

export function isWxPayEnabled(): boolean {
  const config = getWxConfig();
  return (
    config.enabled &&
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
