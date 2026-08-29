import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Aes, Formatter, Rsa, Wechatpay } from 'wechatpay-axios-plugin';
import { Order } from '../orders/entities/order.entity';
import { getWxConfig } from '../config/wx.config';

/** 小程序 wx.requestPayment 所需的支付参数 */
export interface WxJsapiPaymentParams {
  appId: string;
  timeStamp: string;
  nonceStr: string;
  package: string;
  signType: 'RSA';
  paySign: string;
}

/** 支付回调解密后的明文对象（仅列出用到的字段） */
export interface WxNotifyPlaintext {
  out_trade_no: string;
  transaction_id: string;
  trade_state: string;
  amount?: { total?: number };
}

@Injectable()
export class WxPayService {
  private readonly logger = new Logger(WxPayService.name);
  private client: Wechatpay | null = null;

  private getClient(): Wechatpay {
    if (!this.client) {
      const config = getWxConfig();
      // 「微信支付公钥」接入模式：certs 键为微信支付公钥 ID
      this.client = new Wechatpay({
        mchid: config.mchid,
        serial: config.serialNo,
        privateKey: config.privateKey,
        certs: { [config.publicKeyId]: config.publicKey },
      });
    }
    return this.client;
  }

  /** JSAPI 下单并生成 wx.requestPayment 支付参数 */
  async createJsapiOrder(order: Order, description: string): Promise<WxJsapiPaymentParams> {
    const config = getWxConfig();
    const { data } = await this.getClient().v3.pay.transactions.jsapi.post<any>({
      appid: config.appid,
      mchid: config.mchid,
      description,
      out_trade_no: order.orderNo,
      notify_url: config.notifyUrl,
      amount: { total: order.totalAmount, currency: 'CNY' },
      payer: { openid: order.openid },
    });
    const prepayId = data?.prepay_id;
    if (!prepayId) {
      this.logger.error(`JSAPI 下单未返回 prepay_id: ${JSON.stringify(data)}`);
      throw new InternalServerErrorException('微信支付下单失败');
    }
    return this.buildPaymentParams(prepayId);
  }

  /** 用商户私钥对 prepay_id 二次签名，生成 wx.requestPayment 参数 */
  buildPaymentParams(prepayId: string): WxJsapiPaymentParams {
    const config = getWxConfig();
    const params: WxJsapiPaymentParams = {
      appId: config.appid,
      timeStamp: `${Formatter.timestamp()}`,
      nonceStr: Formatter.nonce(),
      package: `prepay_id=${prepayId}`,
      signType: 'RSA',
      paySign: '',
    };
    params.paySign = Rsa.sign(
      Formatter.joinedByLineFeed(params.appId, params.timeStamp, params.nonceStr, params.package),
      config.privateKey,
    );
    return params;
  }

  /** 支付回调验签 + AES-256-GCM 解密 resource，返回明文回调对象；验签失败抛 401 */
  verifyAndDecryptNotify(
    headers: Record<string, string | string[] | undefined>,
    rawBody: string,
  ): WxNotifyPlaintext {
    const config = getWxConfig();
    const timestamp = headers['wechatpay-timestamp'] as string;
    const nonce = headers['wechatpay-nonce'] as string;
    const signature = headers['wechatpay-signature'] as string;
    const serial = headers['wechatpay-serial'] as string;
    if (!timestamp || !nonce || !signature || !serial) {
      throw new UnauthorizedException('缺少微信支付回调签名头');
    }
    if (serial !== config.publicKeyId) {
      throw new UnauthorizedException('未知的微信支付签名序列号');
    }
    let verified = false;
    try {
      verified = Rsa.verify(Formatter.response(timestamp, nonce, rawBody), signature, config.publicKey);
    } catch (err) {
      this.logger.warn(`回调验签异常: ${err}`);
    }
    if (!verified) {
      throw new UnauthorizedException('微信支付回调验签失败');
    }

    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      throw new BadRequestException('回调报文不是合法 JSON');
    }
    const resource = body?.resource;
    if (!resource?.ciphertext || !resource?.nonce) {
      throw new BadRequestException('回调报文缺少 resource');
    }
    const plaintext = Aes.AesGcm.decrypt(
      resource.ciphertext,
      config.apiV3Key,
      resource.nonce,
      resource.associated_data || '',
    );
    return JSON.parse(plaintext);
  }

  /** 按商户订单号主动查询微信侧交易状态，用于对账 */
  async queryByOutTradeNo(orderNo: string): Promise<WxNotifyPlaintext> {
    const config = getWxConfig();
    const { data } = await this.getClient().v3.pay.transactions.outTradeNo.$out_trade_no$.get({
      params: { mchid: config.mchid },
      out_trade_no: orderNo,
    });
    return data;
  }

  /** 发起退款，返回微信退款单号与状态（SUCCESS/PROCESSING/CLOSED/ABNORMAL） */
  async createRefund(input: {
    outTradeNo: string;
    outRefundNo: string;
    refundAmount: number;
    totalAmount: number;
    reason?: string;
  }): Promise<{ refundId: string; status: string }> {
    const { data } = await this.getClient().v3.refund.domestic.refunds.post<any>({
      out_trade_no: input.outTradeNo,
      out_refund_no: input.outRefundNo,
      reason: input.reason,
      amount: {
        refund: input.refundAmount,
        total: input.totalAmount,
        currency: 'CNY',
      },
    });
    return {
      refundId: data?.refund_id ?? '',
      status: data?.status ?? 'PROCESSING',
    };
  }

  /** 按商户退款单号查询退款状态 */
  async queryRefund(outRefundNo: string): Promise<{ refundId: string; status: string }> {
    const { data } = await this.getClient().v3.refund.domestic.refunds._out_refund_no_.get<any>({
      out_refund_no: outRefundNo,
    });
    return {
      refundId: data?.refund_id ?? '',
      status: data?.status ?? 'PROCESSING',
    };
  }

  /** 回调金额（分）必须与订单金额一致才允许落库 */
  static isAmountMatched(notifyTotal: number | undefined, orderTotal: number): boolean {
    return typeof notifyTotal === 'number' && notifyTotal === orderTotal;
  }
}
