import { BadRequestException, Injectable, Logger } from '@nestjs/common';
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
    const res = await fetch(url);
    const data = (await res.json()) as { openid?: string; errmsg?: string };
    if (!data.openid) {
      this.logger.warn(`jscode2session 失败: ${JSON.stringify(data)}`);
      throw new BadRequestException(data.errmsg || '微信登录失败');
    }
    return { openid: data.openid };
  }
}
