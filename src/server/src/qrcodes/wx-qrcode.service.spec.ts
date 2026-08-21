import { ServiceUnavailableException } from '@nestjs/common';
import { WxQrcodeService } from './wx-qrcode.service';

describe('WxQrcodeService', () => {
  const originalEnv = {
    nodeEnv: process.env.NODE_ENV,
    loginMode: process.env.WX_LOGIN_MODE,
    appid: process.env.WX_APPID,
    secret: process.env.WX_SECRET,
  };

  afterEach(() => {
    restoreEnv('NODE_ENV', originalEnv.nodeEnv);
    restoreEnv('WX_LOGIN_MODE', originalEnv.loginMode);
    restoreEnv('WX_APPID', originalEnv.appid);
    restoreEnv('WX_SECRET', originalEnv.secret);
    jest.restoreAllMocks();
  });

  it('uses a placeholder outside production', async () => {
    process.env.NODE_ENV = 'test';
    const service = new WxQrcodeService();

    await expect(service.generate('a'.repeat(32))).resolves.toMatch(
      /^data:image\/svg\+xml;base64,/,
    );
  });

  it('requests a release mini program code in production', async () => {
    enableRealMode();
    const service = new WxQrcodeService();
    jest
      .spyOn(service as never, 'postJson' as never)
      .mockResolvedValue({ access_token: 'token', expires_in: 7200 } as never);
    const postBinary = jest
      .spyOn(service as never, 'postBinary' as never)
      .mockResolvedValue({
        buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
        contentType: 'image/png',
      } as never);

    await expect(service.generate('b'.repeat(32))).resolves.toBe(
      'data:image/png;base64,iVBORw==',
    );
    expect(postBinary).toHaveBeenCalledWith(
      'api.weixin.qq.com',
      '/wxa/getwxacodeunlimit?access_token=token',
      {
        scene: 'b'.repeat(32),
        page: 'pages/buyer/index/index',
        check_path: true,
        env_version: 'release',
        width: 430,
      },
    );
  });

  it('surfaces WeChat JSON errors instead of storing them as images', async () => {
    enableRealMode();
    const service = new WxQrcodeService();
    jest
      .spyOn(service as never, 'postJson' as never)
      .mockResolvedValue({ access_token: 'token', expires_in: 7200 } as never);
    jest.spyOn(service as never, 'postBinary' as never).mockResolvedValue({
      buffer: Buffer.from('{"errcode":41030,"errmsg":"invalid page"}'),
      contentType: 'application/json',
    } as never);

    await expect(service.generate('c'.repeat(32))).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});

function enableRealMode(): void {
  process.env.NODE_ENV = 'production';
  process.env.WX_LOGIN_MODE = 'real';
  process.env.WX_APPID = 'test-appid';
  process.env.WX_SECRET = 'test-secret';
}

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
