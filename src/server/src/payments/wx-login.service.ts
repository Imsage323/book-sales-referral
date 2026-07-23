import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as https from 'https';
import { getWxConfig } from '../config/wx.config';

@Injectable()
export class WxLoginService {
  private readonly logger = new Logger(WxLoginService.name);

  /** wx.login 的 code 换 openid；未配置 AppID/Secret 时返回占位 openid 保持本地开发可用 */
  async code2session(code: string): Promise<{ openid: string }> {
    const { appid, secret } = getWxConfig();
    if (!appid || !secret) {
      return { openid: `dev-openid-${code}` };
    }

    const url =
      'https://api.weixin.qq.com/sns/jscode2session' +
      `?appid=${encodeURIComponent(appid)}` +
      `&secret=${encodeURIComponent(secret)}` +
      `&js_code=${encodeURIComponent(code)}` +
      '&grant_type=authorization_code';

    let data: {
      openid?: string;
      session_key?: string;
      errcode?: number;
      errmsg?: string;
    };
    try {
      data = await this.getJson(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`jscode2session 网络/解析失败: ${message}`);
      // 常见：云托管未开公网出站、DNS/TLS 失败
      throw new ServiceUnavailableException(
        `无法访问微信登录接口: ${message}`,
      );
    }

    if (!data.openid) {
      this.logger.warn(`jscode2session 失败: ${JSON.stringify(data)}`);
      throw new BadRequestException(
        data.errmsg ||
          (data.errcode != null
            ? `微信登录失败(errcode=${data.errcode})`
            : '微信登录失败'),
      );
    }
    return { openid: data.openid };
  }

  /** 使用 Node https，避免部分运行环境 fetch 异常时只抛裸 500 */
  private getJson(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const req = https.get(url, { timeout: 10000 }, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          if ((res.statusCode || 0) >= 500) {
            reject(new Error(`微信接口 HTTP ${res.statusCode}: ${raw.slice(0, 200)}`));
            return;
          }
          try {
            resolve(JSON.parse(raw));
          } catch {
            reject(new Error(`微信接口返回非 JSON: ${raw.slice(0, 200)}`));
          }
        });
      });
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('连接微信登录接口超时'));
      });
      req.on('error', (err) => reject(err));
    });
  }
}
