import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { createBuyerOrder, loginBuyer } from './buyer-test.helper';

jest.setTimeout(30000);

describe('Payments (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let sellerId: string;
  let productId: string;
  let buyerToken: string;

  beforeAll(async () => {
    // 测试环境显式开启登录和支付 mock；生产环境禁止该模式。
    process.env.NODE_ENV = 'test';
    process.env.WX_LOGIN_MODE = 'mock';
    process.env.WX_PAY_MODE = 'mock';
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
    buyerToken = await loginBuyer(app, 'payments-buyer');
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/wx/diag returns login module version fingerprint', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/wx/diag')
      .expect(200);
    expect(res.body.version).toBe('wx-login-v4');
    expect(res.body.loginMode).toBe('mock');
    expect(res.body.hasAppid).toBe(false);
    expect(res.body.hasSecret).toBe(false);
  });

  it('POST /api/wx/login returns a buyer token without exposing openid', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/wx/login')
      .send({ code: 'test-code' })
      .expect(200);

    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.expiresIn).toBe('2h');
    expect(res.body.openid).toBeUndefined();
  });

  it('POST /api/wx/login rejects missing code', async () => {
    await request(app.getHttpServer())
      .post('/api/wx/login')
      .send({})
      .expect(400);
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
    const createRes = await createBuyerOrder(app, buyerToken, {
      productId,
      sellerId,
    });
    const id = createRes.body.id;

    const payRes = await request(app.getHttpServer())
      .post(`/api/buyer/orders/${id}/pay`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .expect(201);
    // mock 模式直接返回已支付订单，不含支付参数
    expect(payRes.body.status).toBe('paid');
    expect(payRes.body.paySign).toBeUndefined();
    expect(payRes.body.wxTransactionId).toMatch(/^MOCK-/);

    const syncRes = await request(app.getHttpServer())
      .post(`/api/buyer/orders/${id}/pay-sync`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .expect(201);
    expect(syncRes.body.status).toBe('paid');
  });

  it('production runtime refuses login and payment mock without changing the order', async () => {
    const createRes = await createBuyerOrder(app, buyerToken, {
      productId,
      sellerId,
    });
    const id = createRes.body.id;
    const previousNodeEnv = process.env.NODE_ENV;

    process.env.NODE_ENV = 'production';
    try {
      await request(app.getHttpServer())
        .post('/api/wx/login')
        .send({ code: 'test-code' })
        .expect(503);
      await request(app.getHttpServer())
        .post(`/api/buyer/orders/${id}/pay`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(503);
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
    }

    const orderRes = await request(app.getHttpServer())
      .get(`/api/orders/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(orderRes.body.order.status).toBe('pending_payment');
  });
});
