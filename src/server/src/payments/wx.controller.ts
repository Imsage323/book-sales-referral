import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  InternalServerErrorException,
  Logger,
  Post,
  RawBodyRequest,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { WxLoginService } from './wx-login.service';
import { WxPayService } from './wx-pay.service';
import { OrdersService } from '../orders/orders.service';
import { BuyerTokenService } from '../auth/buyer-token.service';

@Controller('wx')
export class WxController {
  private readonly logger = new Logger(WxController.name);

  constructor(
    private readonly wxLoginService: WxLoginService,
    private readonly wxPayService: WxPayService,
    private readonly ordersService: OrdersService,
    private readonly buyerTokenService: BuyerTokenService,
  ) {}

  /** 部署探针：确认登录加固版本是否在线（不泄露密钥） */
  @Get('diag')
  diag() {
    return this.wxLoginService.getDiag();
  }

  /** 小程序静默登录：wx.login 的 code 换 openid */
  @Post('login')
  @HttpCode(200)
  async login(@Body('code') code: string) {
    if (!code) {
      throw new BadRequestException('缺少 code');
    }
    try {
      const { openid } = await this.wxLoginService.code2session(code);
      return this.buyerTokenService.issue(openid);
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`wx login 未捕获异常: ${message}`);
      throw new BadRequestException(`微信登录异常: ${message}`);
    }
  }

  /**
   * 微信支付结果回调。验签失败返回 401 + {code:'FAIL'}；
   * 成功或业务幂等命中都返回 {code:'SUCCESS', message:'成功'}。
   * body 不走 DTO 校验，验签使用 rawBody 原始报文。
   */
  @Post('notify')
  @HttpCode(200)
  async notify(@Req() req: RawBodyRequest<Request>) {
    const rawBody = req.rawBody ? req.rawBody.toString('utf8') : '';
    try {
      const plaintext = this.wxPayService.verifyAndDecryptNotify(
        req.headers as Record<string, string | string[] | undefined>,
        rawBody,
      );
      await this.ordersService.handleWxNotify(plaintext, rawBody);
      return { code: 'SUCCESS', message: '成功' };
    } catch (err) {
      if (
        err instanceof UnauthorizedException ||
        err instanceof BadRequestException
      ) {
        throw new HttpException(
          { code: 'FAIL', message: err.message },
          err.getStatus(),
        );
      }
      this.logger.error(`支付回调处理失败: ${err}`);
      throw new InternalServerErrorException({
        code: 'FAIL',
        message: '处理失败',
      });
    }
  }
}
