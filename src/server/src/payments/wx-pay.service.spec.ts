import { UnauthorizedException } from '@nestjs/common';
import { generateKeyPairSync } from 'crypto';
import { Aes, Rsa } from 'wechatpay-axios-plugin';
import { WxPayService } from './wx-pay.service';

const WX_ENV_KEYS = [
  'WX_PAY_MODE',
  'WX_APPID',
  'WX_MCHID',
  'WX_PAY_SERIAL_NO',
  'WX_PAY_APIV3_KEY',
  'WX_PAY_PRIVATE_KEY',
  'WX_PAY_PUBLIC_KEY_ID',
  'WX_PAY_PUBLIC_KEY',
  'WX_PAY_NOTIFY_URL',
] as const;

describe('WxPayService', () => {
  const service = new WxPayService();
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });
  const privatePem = privateKey
    .export({ type: 'pkcs8', format: 'pem' })
    .toString();
  const publicPem = publicKey
    .export({ type: 'spki', format: 'pem' })
    .toString();
  const apiV3Key = 'a'.repeat(32);
  const publicKeyId = 'PUB_KEY_ID_TEST';
  let envBackup: Record<string, string | undefined>;

  beforeEach(() => {
    envBackup = Object.fromEntries(WX_ENV_KEYS.map((k) => [k, process.env[k]]));
    process.env.WX_PAY_MODE = 'real';
    process.env.WX_APPID = 'wx-appid';
    process.env.WX_MCHID = 'mchid';
    process.env.WX_PAY_SERIAL_NO = 'serial-no';
    process.env.WX_PAY_APIV3_KEY = apiV3Key;
    process.env.WX_PAY_PRIVATE_KEY = privatePem.replace(/\n/g, '\\n');
    process.env.WX_PAY_PUBLIC_KEY_ID = publicKeyId;
    process.env.WX_PAY_PUBLIC_KEY = publicPem.replace(/\n/g, '\\n');
    process.env.WX_PAY_NOTIFY_URL = 'https://example.com/api/wx/notify';
  });

  afterEach(() => {
    WX_ENV_KEYS.forEach((k) => {
      if (envBackup[k] === undefined) {
        delete process.env[k];
      } else {
        process.env[k] = envBackup[k];
      }
    });
  });

  describe('buildPaymentParams', () => {
    it('should build wx.requestPayment params with a verifiable RSA paySign', () => {
      const params = service.buildPaymentParams('prepay-123');

      expect(params.appId).toBe('wx-appid');
      expect(params.package).toBe('prepay_id=prepay-123');
      expect(params.signType).toBe('RSA');
      expect(params.timeStamp).toMatch(/^\d+$/);
      expect(params.nonceStr.length).toBeGreaterThan(0);

      const message = `${params.appId}\n${params.timeStamp}\n${params.nonceStr}\n${params.package}\n`;
      expect(Rsa.verify(message, params.paySign, publicPem)).toBe(true);
    });
  });

  describe('verifyAndDecryptNotify', () => {
    /** 按微信支付回调格式构造合法报文：AES-GCM 加密 resource + 商户私钥签名 */
    function buildSignedNotify(plaintext: object) {
      const resourceNonce = 'resource-nonce';
      const associatedData = 'transaction';
      const ciphertext = Aes.AesGcm.encrypt(
        JSON.stringify(plaintext),
        apiV3Key,
        resourceNonce,
        associatedData,
      );
      const rawBody = JSON.stringify({
        id: 'event-id',
        event_type: 'TRANSACTION.SUCCESS',
        resource: {
          ciphertext,
          nonce: resourceNonce,
          associated_data: associatedData,
        },
      });
      const timestamp = '1720000000';
      const headerNonce = 'header-nonce';
      const signature = Rsa.sign(
        `${timestamp}\n${headerNonce}\n${rawBody}\n`,
        privatePem,
      );
      const headers = {
        'wechatpay-timestamp': timestamp,
        'wechatpay-nonce': headerNonce,
        'wechatpay-signature': signature,
        'wechatpay-serial': publicKeyId,
      };
      return { headers, rawBody };
    }

    it('should verify signature and decrypt resource', () => {
      const plaintext = {
        out_trade_no: 'O-20260723-0001',
        transaction_id: 'wx-tx-1',
        trade_state: 'SUCCESS',
        amount: { total: 200 },
      };
      const { headers, rawBody } = buildSignedNotify(plaintext);

      const result = service.verifyAndDecryptNotify(headers, rawBody);

      expect(result).toEqual(plaintext);
    });

    it('should reject tampered body with 401', () => {
      const { headers, rawBody } = buildSignedNotify({ out_trade_no: 'O-1' });

      expect(() =>
        service.verifyAndDecryptNotify(
          headers,
          rawBody.replace('event-id', 'evil-id'),
        ),
      ).toThrow(UnauthorizedException);
    });

    it('should reject unknown serial with 401', () => {
      const { headers, rawBody } = buildSignedNotify({ out_trade_no: 'O-1' });

      expect(() =>
        service.verifyAndDecryptNotify(
          { ...headers, 'wechatpay-serial': 'OTHER_SERIAL' },
          rawBody,
        ),
      ).toThrow(UnauthorizedException);
    });

    it('should reject missing signature headers with 401', () => {
      expect(() => service.verifyAndDecryptNotify({}, '{}')).toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('isAmountMatched', () => {
    it('should only pass when notify total equals order total', () => {
      expect(WxPayService.isAmountMatched(200, 200)).toBe(true);
      expect(WxPayService.isAmountMatched(100, 200)).toBe(false);
      expect(WxPayService.isAmountMatched(undefined, 200)).toBe(false);
    });
  });
});
