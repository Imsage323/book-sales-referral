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

  /** 部署探针用：确认当前实例是否包含登录加固版本（不泄露密钥） */
  getDiag() {
    const { appid, secret } = getWxConfig();
    return {
      version: 'wx-login-v3',
      hasAppid: Boolean(appid),
      hasSecret: Boolean(secret),
      appidTail: appid ? appid.slice(-6) : '',
    };
  }

  /** wx.login 的 code 换 openid；未配置 AppID/Secret 时返回占位 openid 保持本地开发可用 */
  async code2session(code: string): Promise<{ openid: string }> {
    try {
      const { appid, secret } = getWxConfig();
      if (!appid || !secret) {
        return { openid: `dev-openid-${code}` };
      }

      const path =
        '/sns/jscode2session' +
        `?appid=${encodeURIComponent(appid)}` +
        `&secret=${encodeURIComponent(secret)}` +
        `&js_code=${encodeURIComponent(code)}` +
        '&grant_type=authorization_code';

      const data = await this.getJson('api.weixin.qq.com', path);

      if (!data || typeof data !== 'object') {
        throw new ServiceUnavailableException(
          '微信登录接口返回异常，请检查云托管出网',
        );
      }

      if (!data.openid) {
        this.logger.warn(`jscode2session 失败: ${JSON.stringify(data)}`);
        const detail =
          data.errmsg ||
          (data.errcode != null
            ? `微信登录失败(errcode=${data.errcode})`
            : '微信登录失败');
        throw new BadRequestException(detail);
      }

      return { openid: data.openid };
    } catch (err) {
      if (
        err instanceof BadRequestException ||
        err instanceof ServiceUnavailableException
      ) {
        throw err;
      }
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`jscode2session 未预期异常: ${message}`);
      throw new ServiceUnavailableException(
        `无法访问微信登录接口: ${message}`,
      );
    }
  }

  private getJson(host: string, path: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          host,
          path,
          method: 'GET',
          timeout: 10000,
          headers: { Accept: 'application/json' },
          // 微信云托管开启「开放接口服务」时，对 api.weixin.qq.com 走 VPC 代理，
          // 证书为代理自签，Node 默认校验会报 self-signed certificate。
          // 仅针对微信域名关闭校验；公网直连官方证书时同样可工作。
          rejectUnauthorized: false,
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => {
            const raw = Buffer.concat(chunks).toString('utf8');
            if ((res.statusCode || 0) >= 500) {
              reject(
                new Error(
                  `微信接口 HTTP ${res.statusCode}: ${raw.slice(0, 200)}`,
                ),
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
        reject(new Error('连接微信登录接口超时'));
      });
      req.on('error', (err) => reject(err));
      req.end();
    });
  }
}
