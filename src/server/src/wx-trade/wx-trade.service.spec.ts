import { EventEmitter } from 'events';
import * as https from 'https';
import { ServiceUnavailableException } from '@nestjs/common';
import { WxTradeService } from './wx-trade.service';

const ENV_KEYS = [
  'NODE_ENV',
  'WX_TRADE_MODE',
  'WX_APPID',
  'WX_SECRET',
] as const;

/** 按 path 分发响应的 https.request mock，返回记录到的请求 options 列表 */
function mockHttps(service: WxTradeService, responder: (path: string) => any) {
  const calls: https.RequestOptions[] = [];
  (service as any).httpsRequest = (
    options: https.RequestOptions,
    callback: any,
  ) => {
    calls.push(options);
    const req = new EventEmitter() as any;
    req.write = jest.fn();
    req.destroy = jest.fn();
    req.end = jest.fn(() => {
      const res = new EventEmitter() as any;
      res.statusCode = 200;
      callback(res);
      process.nextTick(() => {
        res.emit('data', Buffer.from(JSON.stringify(responder(options.path!))));
        res.emit('end');
      });
    });
    return req;
  };
  return calls;
}

const UPLOAD_PARAMS = {
  mchid: 'mchid',
  outTradeNo: 'O-20260813-0001',
  openid: 'openid-1',
  trackingNo: 'SF1234567890',
  expressCompanyId: 'SF',
  itemDesc: '测试图书',
};

describe('WxTradeService', () => {
  let service: WxTradeService;
  let envBackup: Record<string, string | undefined>;

  beforeEach(() => {
    envBackup = Object.fromEntries(
      ENV_KEYS.map((key) => [key, process.env[key]]),
    );
    ENV_KEYS.forEach((key) => delete process.env[key]);
    process.env.NODE_ENV = 'test';
    service = new WxTradeService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    ENV_KEYS.forEach((key) => {
      if (envBackup[key] === undefined) delete process.env[key];
      else process.env[key] = envBackup[key];
    });
  });

  it('mock mode short-circuits without http calls', async () => {
    process.env.WX_TRADE_MODE = 'mock';
    (service as any).httpsRequest = jest.fn();

    await expect(
      service.uploadShippingInfo(UPLOAD_PARAMS),
    ).resolves.toBeUndefined();
    await expect(service.updateOrderDetailPath()).resolves.toEqual({
      path: expect.stringContaining('${商品订单号}'),
    });
    await expect(service.listExpressCompanies()).resolves.toHaveLength(2);
    expect((service as any).httpsRequest).not.toHaveBeenCalled();
  });

  it('rejects mock mode in production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.WX_TRADE_MODE = 'mock';

    await expect(
      service.uploadShippingInfo(UPLOAD_PARAMS),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('fails closed when trade mode is disabled', async () => {
    await expect(service.getStatus()).resolves.toEqual({ mode: 'disabled' });
    await expect(
      service.uploadShippingInfo(UPLOAD_PARAMS),
    ).rejects.toThrow('WX_TRADE_MODE');
  });

  it('real mode fetches and caches stable_token when no cloudbase token file', async () => {
    process.env.WX_TRADE_MODE = 'real';
    process.env.WX_APPID = 'wx-appid';
    process.env.WX_SECRET = 'wx-secret';
    (service as any).fileExists = () => false;
    const calls = mockHttps(service, (path) =>
      path.includes('stable_token')
        ? { access_token: 'stable-tok', expires_in: 7200 }
        : { errcode: 0 },
    );

    await service.uploadShippingInfo(UPLOAD_PARAMS);
    await service.uploadShippingInfo(UPLOAD_PARAMS);

    const tokenCalls = calls.filter((c) => c.path!.includes('stable_token'));
    const apiCalls = calls.filter((c) =>
      c.path!.includes('upload_shipping_info'),
    );
    expect(tokenCalls).toHaveLength(1);
    expect(apiCalls).toHaveLength(2);
    expect(apiCalls[0].path).toContain('access_token=stable-tok');
  });

  it('real mode prefers cloudbase token file over stable_token', async () => {
    process.env.WX_TRADE_MODE = 'real';
    process.env.WX_APPID = 'wx-appid';
    process.env.WX_SECRET = 'wx-secret';
    (service as any).fileExists = () => true;
    (service as any).fileRead = () => 'file-token\n';
    const calls = mockHttps(service, () => ({ errcode: 0 }));

    await service.uploadShippingInfo(UPLOAD_PARAMS);

    expect(calls).toHaveLength(1);
    expect(calls[0].path).toContain('cloudbase_access_token=file-token');
  });

  it('throws with errcode detail when wx api returns error', async () => {
    process.env.WX_TRADE_MODE = 'real';
    process.env.WX_APPID = 'wx-appid';
    process.env.WX_SECRET = 'wx-secret';
    (service as any).fileExists = () => true;
    (service as any).fileRead = () => 'file-token';
    mockHttps(service, () => ({ errcode: 47001, errmsg: 'invalid tracking_no' }));

    await expect(
      service.uploadShippingInfo(UPLOAD_PARAMS),
    ).rejects.toThrow('errcode=47001');
  });
});
