import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

jest.setTimeout(30000);

describe('Payments (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let sellerId: string;
  let productId: string;

  beforeAll(async () => {
    // 确保走 mock 支付模式（.env 中 WX_* 均为空占位，这里再显式兜底）
    process.env.WX_PAY_ENABLED = 'false';
    process.env.WX_APPID = '';
    process.env.WX_SECRET = '';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123456' });
    token = res.body.accessToken;

    const sellerRes = await request(app.getHttpServer())
      .post('/api/sellers')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Payment Test Seller' });
    sellerId = sellerRes.body.id;

    const productRes = await request(app.getHttpServer())
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Payment Test Product', price: 100 });
    productId = productRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/wx/diag returns login module version fingerprint', async () => {
    const res = await request(app.getHttpServer()).get('/api/wx/diag').expect(200);
    expect(res.body.version).toBe('wx-login-v3');
    expect(res.body.hasAppid).toBe(false);
    expect(res.body.hasSecret).toBe(false);
  });

  it('POST /api/wx/login returns placeholder openid when appid/secret not configured', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/wx/login')
      .send({ code: 'test-code' })
      .expect(200);

    expect(res.body.openid).toBe('dev-openid-test-code');
  });

  it('POST /api/wx/login rejects missing code', async () => {
    await request(app.getHttpServer()).post('/api/wx/login').send({}).expect(400);
  });

  it('POST /api/wx/notify rejects invalid signature with 401 and FAIL code', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/wx/notify')
      .set({
        'wechatpay-timestamp': '1720000000',
        'wechatpay-nonce': 'nonce',
        'wechatpay-signature': 'invalid-signature',
        'wechatpay-serial': 'unknown-serial',
      })
      .send({ id: 'fake-event', resource: {} })
      .expect(401);

    expect(res.body.code).toBe('FAIL');
  });

  it('mock pay flow still works and pay-sync is a no-op returning the order', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/orders')
      .send({ productId, sellerId, openid: 'test-openid' });
    const id = createRes.body.id;

    const payRes = await request(app.getHttpServer())
      .post(`/api/orders/${id}/pay`)
      .expect(201);
    // mock 模式直接返回已支付订单，不含支付参数
    expect(payRes.body.status).toBe('paid');
    expect(payRes.body.paySign).toBeUndefined();
    expect(payRes.body.wxTransactionId).toMatch(/^MOCK-/);

    const syncRes = await request(app.getHttpServer())
      .post(`/api/orders/${id}/pay-sync`)
      .expect(201);
    expect(syncRes.body.status).toBe('paid');
  });
});
