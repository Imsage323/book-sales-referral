import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import * as https from 'https';
import { getWxConfig, isWxLoginEnabled } from '../config/wx.config';
import { generatePlaceholderQrcode } from './qrcode-image.generator';

interface BinaryResponse {
  buffer: Buffer;
  contentType: string;
}

@Injectable()
export class WxQrcodeService {
  private readonly httpsRequest = https.request;
  private stableToken?: { token: string; expiresAt: number };

  async generate(scene: string): Promise<string> {
    if (!this.isRealMode()) {
      return generatePlaceholderQrcode(scene);
    }

    const accessToken = await this.getStableToken();
    const response = await this.postBinary(
      'api.weixin.qq.com',
      `/wxa/getwxacodeunlimit?access_token=${encodeURIComponent(accessToken)}`,
      {
        scene,
        page: 'pages/buyer/index/index',
        check_path: true,
        env_version: 'release',
        width: 430,
      },
    );

    const error = this.parseWechatError(response.buffer, response.contentType);
    if (error) {
      throw new ServiceUnavailableException(
        `微信小程序码接口返回 errcode=${error.errcode}: ${error.errmsg || '未知错误'}`,
      );
    }

    const contentType = response.contentType.startsWith('image/')
      ? response.contentType.split(';')[0]
      : 'image/png';
    return `data:${contentType};base64,${response.buffer.toString('base64')}`;
  }

  private isRealMode(): boolean {
    return process.env.NODE_ENV === 'production' && isWxLoginEnabled();
  }

  private async getStableToken(): Promise<string> {
    const now = Date.now();
    if (this.stableToken && this.stableToken.expiresAt > now) {
      return this.stableToken.token;
    }

    const { appid, secret } = getWxConfig();
    const response = await this.postJson(
      'api.weixin.qq.com',
      '/cgi-bin/stable_token',
      {
        grant_type: 'client_credential',
        appid,
        secret,
        force_refresh: false,
      },
    );
    if (!response.access_token) {
      throw new ServiceUnavailableException(
        `获取微信接口凭证失败: ${JSON.stringify(response).slice(0, 200)}`,
      );
    }

    this.stableToken = {
      token: String(response.access_token),
      expiresAt: now + (Number(response.expires_in || 7200) - 300) * 1000,
    };
    return this.stableToken.token;
  }

  private parseWechatError(
    buffer: Buffer,
    contentType: string,
  ): { errcode: number; errmsg?: string } | null {
    if (!contentType.includes('json') && buffer[0] !== 0x7b) return null;
    try {
      const parsed = JSON.parse(buffer.toString('utf8')) as {
        errcode?: number;
        errmsg?: string;
      };
      return parsed.errcode
        ? { errcode: parsed.errcode, errmsg: parsed.errmsg }
        : null;
    } catch {
      return null;
    }
  }

  private async postJson(
    host: string,
    path: string,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const response = await this.postBinary(host, path, body);
    try {
      return JSON.parse(response.buffer.toString('utf8')) as Record<
        string,
        unknown
      >;
    } catch {
      throw new ServiceUnavailableException('微信接口返回了无法解析的凭证响应');
    }
  }

  private postBinary(
    host: string,
    path: string,
    body: Record<string, unknown>,
  ): Promise<BinaryResponse> {
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
          },
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => {
            const buffer = Buffer.concat(chunks);
            if ((res.statusCode || 0) >= 500) {
              reject(
                new ServiceUnavailableException(
                  `微信接口 HTTP ${res.statusCode}: ${buffer.toString('utf8').slice(0, 200)}`,
                ),
              );
              return;
            }
            resolve({
              buffer,
              contentType: String(res.headers['content-type'] || ''),
            });
          });
        },
      );
      req.on('timeout', () => {
        req.destroy();
        reject(new ServiceUnavailableException('连接微信小程序码接口超时'));
      });
      req.on('error', (error) => reject(error));
      req.write(payload);
      req.end();
    });
  }
}
