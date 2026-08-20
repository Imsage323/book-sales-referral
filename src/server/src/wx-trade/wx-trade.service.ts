import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as https from 'https';
import { getWxConfig } from '../config/wx.config';
import {
  CLOUDBASE_TOKEN_FILE,
  getWxTradeMode,
  isWxTradeMockEnabled,
  WX_ORDER_DETAIL_PATH,
} from '../config/wx-trade.config';
import type { WxRuntimeMode } from '../config/wx.config';

export interface DeliveryCompany {
  deliveryId: string;
  deliveryName: string;
}

export interface UploadShippingParams {
  mchid: string;
  outTradeNo: string;
  openid: string;
  trackingNo: string;
  expressCompanyId: string;
  itemDesc: string;
}

/**
 * 微信交易管理接口封装（发货信息管理服务 + 订单中心）。
 * 鉴权优先级：云托管容器免维护 token 文件 → stable_token（appid/secret）。
 * mock 仅允许在 development/test 显式启用，disabled 时调用直接报 503。
 */
@Injectable()
export class WxTradeService {
  private readonly logger = new Logger(WxTradeService.name);
  private readonly httpsRequest = https.request;
  private readonly fileExists = fs.existsSync;
  private readonly fileRead = fs.readFileSync;
  private stableToken?: { token: string; expiresAt: number };
  private deliveryCache?: { items: DeliveryCompany[]; cachedAt: number };

  getMode(): WxRuntimeMode {
    return getWxTradeMode();
  }

  /** 管理后台诊断：发货信息管理服务开通与确认状态 */
  async getStatus(): Promise<{
    mode: WxRuntimeMode;
    isTradeManaged?: boolean;
    confirmationCompleted?: boolean;
  }> {
    const mode = getWxTradeMode();
    if (mode !== 'real') return { mode };
    const { appid } = getWxConfig();
    const managed = await this.callApi('/wxa/sec/order/is_trade_managed', {
      appid,
    });
    const confirmation = await this.callApi(
      '/wxa/sec/order/is_trade_management_confirmation_completed',
      { appid },
    );
    return {
      mode,
      isTradeManaged: Boolean(managed?.is_trade_managed),
      confirmationCompleted: Boolean(confirmation?.completed),
    };
  }

  /** 微信快递公司（运力）编码表，内存缓存 1 小时 */
  async listExpressCompanies(): Promise<DeliveryCompany[]> {
    if (isWxTradeMockEnabled()) {
      return [
        { deliveryId: 'SF', deliveryName: '顺丰速运' },
        { deliveryId: 'YTO', deliveryName: '圆通速递' },
      ];
    }
    const now = Date.now();
    if (this.deliveryCache && now - this.deliveryCache.cachedAt < 3600_000) {
      return this.deliveryCache.items;
    }
    const data = await this.callApi(
      '/cgi-bin/express/delivery/open_msg/get_delivery_list',
      {},
    );
    const items: DeliveryCompany[] = (data?.delivery_list || []).map(
      (d: any) => ({
        deliveryId: d.delivery_id,
        deliveryName: d.delivery_name,
      }),
    );
    this.deliveryCache = { items, cachedAt: now };
    return items;
  }

  /** 配置微信订单中心的订单详情跳转 path（幂等，可重复调用） */
  async updateOrderDetailPath(): Promise<{ path: string }> {
    if (!isWxTradeMockEnabled()) {
      await this.callApi('/wxa/sec/order/update_order_detail_path', {
        path: WX_ORDER_DETAIL_PATH,
      });
    }
    return { path: WX_ORDER_DETAIL_PATH };
  }

  /** 发货信息录入（实体物流、统一发货） */
  async uploadShippingInfo(params: UploadShippingParams): Promise<void> {
    if (isWxTradeMockEnabled()) {
      this.logger.log(`mock 上传发货信息: ${params.outTradeNo}`);
      return;
    }
    await this.callApi('/wxa/sec/order/upload_shipping_info', {
      order_key: {
        order_number_type: 2,
        mchid: params.mchid,
        out_trade_no: params.outTradeNo,
      },
      logistics_type: 1,
      delivery_mode: 1,
      shipping_list: [
        {
          tracking_no: params.trackingNo,
          express_company: params.expressCompanyId,
          item_desc: params.itemDesc,
        },
      ],
      upload_time: formatBeijingTime(new Date()),
      payer: { openid: params.openid },
    });
  }

  private async callApi(
    path: string,
    body: Record<string, unknown>,
  ): Promise<any> {
    if (getWxTradeMode() !== 'real') {
      throw new ServiceUnavailableException(
        '微信交易管理未启用（WX_TRADE_MODE 未配置为 real）',
      );
    }
    const query = await this.resolveTokenQuery();
    const data = await this.postJson(
      'api.weixin.qq.com',
      `${path}${query}`,
      body,
    );
    if (data?.errcode) {
      throw new ServiceUnavailableException(
        `微信交易接口返回 errcode=${data.errcode}: ${data.errmsg || '未知错误'}`,
      );
    }
    return data;
  }

  private async resolveTokenQuery(): Promise<string> {
    const fileToken = this.readCloudbaseToken();
    if (fileToken) {
      return `?cloudbase_access_token=${encodeURIComponent(fileToken)}`;
    }
    const token = await this.getStableToken();
    return `?access_token=${encodeURIComponent(token)}`;
  }

  /** 云托管容器内微信推送的 token 文件（纯文本或 JSON 均兼容） */
  private readCloudbaseToken(): string | null {
    try {
      if (!this.fileExists(CLOUDBASE_TOKEN_FILE)) return null;
      const raw = this.fileRead(CLOUDBASE_TOKEN_FILE, 'utf8').trim();
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        return parsed.token || parsed.cloudbase_access_token || raw;
      } catch {
        return raw;
      }
    } catch {
      return null;
    }
  }

  private async getStableToken(): Promise<string> {
    const now = Date.now();
    if (this.stableToken && this.stableToken.expiresAt > now) {
      return this.stableToken.token;
    }
    const { appid, secret } = getWxConfig();
    const data = await this.postJson(
      'api.weixin.qq.com',
      '/cgi-bin/stable_token',
      {
        grant_type: 'client_credential',
        appid,
        secret,
        force_refresh: false,
      },
    );
    if (!data?.access_token) {
      throw new ServiceUnavailableException(
        `获取微信接口凭据失败: ${JSON.stringify(data).slice(0, 200)}`,
      );
    }
    this.stableToken = {
      token: data.access_token,
      expiresAt: now + ((data.expires_in || 7200) - 300) * 1000,
    };
    return this.stableToken.token;
  }

  private postJson(
    host: string,
    path: string,
    body: Record<string, unknown>,
  ): Promise<any> {
    const payload = JSON.stringify(body);
    return new Promise((resolve, reject) => {
      const req = this.httpsRequest(
        {
          host,
          path,
          method: 'POST',
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
            Accept: 'application/json',
          },
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => {
            const raw = Buffer.concat(chunks).toString('utf8');
            if ((res.statusCode || 0) >= 500) {
              reject(
                new Error(`微信接口 HTTP ${res.statusCode}: ${raw.slice(0, 200)}`),
              );
              return;
            }
            try {
              resolve(JSON.parse(raw));
            } catch {
              reject(new Error(`微信接口返回非 JSON: ${raw.slice(0, 200)}`));
            }
          });
        },
      );
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('连接微信交易接口超时'));
      });
      req.on('error', (err) => reject(err));
      req.write(payload);
      req.end();
    });
  }
}

/** 微信要求的上传时间格式：yyyy-MM-dd HH:mm:ss（北京时间） */
function formatBeijingTime(d: Date): string {
  return new Date(d.getTime() + 8 * 3600_000)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ');
}
