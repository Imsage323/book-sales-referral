import { EventEmitter } from 'events';
import * as https from 'https';
import { ServiceUnavailableException } from '@nestjs/common';
import { WxLoginService } from './wx-login.service';

const ENV_KEYS = [
  'NODE_ENV',
  'WX_LOGIN_MODE',
  'WX_APPID',
  'WX_SECRET',
] as const;

describe('WxLoginService', () => {
  let service: WxLoginService;
  let envBackup: Record<string, string | undefined>;

  beforeEach(() => {
    envBackup = Object.fromEntries(
      ENV_KEYS.map((key) => [key, process.env[key]]),
    );
    ENV_KEYS.forEach((key) => delete process.env[key]);
    service = new WxLoginService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    ENV_KEYS.forEach((key) => {
      if (envBackup[key] === undefined) delete process.env[key];
      else process.env[key] = envBackup[key];
    });
  });

  it('returns a placeholder openid only when mock is explicit in test', async () => {
    process.env.NODE_ENV = 'test';
    process.env.WX_LOGIN_MODE = 'mock';

    await expect(service.code2session('test-code')).resolves.toEqual({
      openid: 'dev-openid-test-code',
    });
  });

  it('rejects mock login in production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.WX_LOGIN_MODE = 'mock';

    await expect(service.code2session('test-code')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('fails closed when login mode is missing', async () => {
    process.env.NODE_ENV = 'test';

    await expect(service.code2session('test-code')).rejects.toThrow(
      '微信登录暂不可用',
    );
  });

  it('uses standard TLS verification in real mode', async () => {
    process.env.NODE_ENV = 'test';
    process.env.WX_LOGIN_MODE = 'real';
    process.env.WX_APPID = 'wx-appid';
    process.env.WX_SECRET = 'wx-secret';

    let requestOptions: https.RequestOptions | undefined;
    (service as any).httpsRequest = ((
      options: https.RequestOptions,
      callback: any,
    ) => {
      requestOptions = options;
      const request = new EventEmitter() as any;
      request.destroy = jest.fn();
      request.end = () => {
        const response = new EventEmitter() as any;
        response.statusCode = 200;
        callback(response);
        process.nextTick(() => {
          response.emit(
            'data',
            Buffer.from(JSON.stringify({ openid: 'real-openid' })),
          );
          response.emit('end');
        });
      };
      return request;
    }) as any;

    await expect(service.code2session('real-code')).resolves.toEqual({
      openid: 'real-openid',
    });
    expect(requestOptions).toBeDefined();
    expect(requestOptions?.rejectUnauthorized).not.toBe(false);
    expect(service.getDiag()).toEqual({
      version: 'wx-login-v4',
      loginMode: 'real',
      hasAppid: true,
      hasSecret: true,
    });
  });
});
