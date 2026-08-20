/** 微信交易管理（发货信息管理服务 / 订单中心）相关配置集中读取。 */
import type { WxRuntimeMode } from './wx.config';

function readMode(value?: string): WxRuntimeMode {
  if (value === 'real' || value === 'mock') return value;
  return 'disabled';
}

export function getWxTradeMode(): WxRuntimeMode {
  return readMode(process.env.WX_TRADE_MODE);
}

function isMockEnvironment(): boolean {
  return (
    process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
  );
}

export function isWxTradeMockEnabled(): boolean {
  return getWxTradeMode() === 'mock' && isMockEnvironment();
}

/** 微信订单中心订单详情跳转 path；${商品订单号} 是微信侧模板变量，必须原样保留 */
export const WX_ORDER_DETAIL_PATH =
  'pages/buyer/result/result?orderId=${商品订单号}&channel=1';

/** 云托管容器内微信定期推送的免维护接口凭据文件 */
export const CLOUDBASE_TOKEN_FILE =
  '/.tencentcloudbase/wx/cloudbase_access_token';
