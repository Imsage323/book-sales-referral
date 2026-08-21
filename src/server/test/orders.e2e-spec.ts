import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { createBuyerOrder, loginBuyer } from './buyer-test.helper';

jest.setTimeout(30000);

describe('OrdersController (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let sellerId: string;
  let productId: string;
  let buyerToken: string;
  let otherBuyerToken: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.WX_PAY_MODE = 'mock';

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
      .send({ name: 'Order Test Seller' });
    sellerId = sellerRes.body.id;

    const productRes = await request(app.getHttpServer())
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Order Test Product', price: 100 });
    productId = productRes.body.id;
    buyerToken = await loginBuyer(app, 'orders-buyer');
    otherBuyerToken = await loginBuyer(app, 'orders-other-buyer');
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create an order', async () => {
    const res = await createBuyerOrder(app, buyerToken, {
      productId,
      sellerId,
      quantity: 2,
    });
    expect(res.body.orderNo).toMatch(/^O-\d{8}-\d{4}$/);
    expect(res.body.totalAmount).toBe(200);
  });

  it('should get order details', async () => {
    const createRes = await createBuyerOrder(app, buyerToken, {
      productId,
      sellerId,
    });

    const res = await request(app.getHttpServer())
      .get(`/api/buyer/orders/${createRes.body.id}`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .expect(200);
    expect(res.body.order.id).toBe(createRes.body.id);
  });

  it('should get order details by orderNo (微信订单中心入口)', async () => {
    const createRes = await createBuyerOrder(app, buyerToken, {
      productId,
      sellerId,
    });

    const res = await request(app.getHttpServer())
      .get(`/api/buyer/orders/${createRes.body.orderNo}`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .expect(200);
    expect(res.body.order.id).toBe(createRes.body.id);

    await request(app.getHttpServer())
      .get(`/api/buyer/orders/${createRes.body.orderNo}`)
      .set('Authorization', `Bearer ${otherBuyerToken}`)
      .expect(404);
  });

  it('should hide one buyer order from another buyer', async () => {
    const createRes = await createBuyerOrder(app, buyerToken, {
      productId,
      sellerId,
    });
    await request(app.getHttpServer())
      .get(`/api/buyer/orders/${createRes.body.id}`)
      .set('Authorization', `Bearer ${otherBuyerToken}`)
      .expect(404);
    await request(app.getHttpServer())
      .post(`/api/buyer/orders/${createRes.body.id}/pay`)
      .set('Authorization', `Bearer ${otherBuyerToken}`)
      .expect(404);
  });

  it('should require admin auth for the legacy order detail endpoint', async () => {
    const createRes = await createBuyerOrder(app, buyerToken, {
      productId,
      sellerId,
    });
    await request(app.getHttpServer())
      .get(`/api/orders/${createRes.body.id}`)
      .expect(401);
    await request(app.getHttpServer())
      .get(`/api/orders/${createRes.body.id}`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .expect(401);
    await request(app.getHttpServer())
      .get(`/api/buyer/orders/${createRes.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
    await request(app.getHttpServer())
      .get(`/api/orders/${createRes.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('should pay an order and record mock transaction id', async () => {
    const createRes = await createBuyerOrder(app, buyerToken, {
      productId,
      sellerId,
    });
    const id = createRes.body.id;

    const payRes = await request(app.getHttpServer())
      .post(`/api/buyer/orders/${id}/pay`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .expect(201);

    expect(payRes.body.status).toBe('paid');
    expect(payRes.body.paidAt).toBeTruthy();
    expect(payRes.body.wxTransactionId).toMatch(/^MOCK-/);

    const orderRes = await request(app.getHttpServer())
      .get(`/api/orders/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(orderRes.body.order.status).toBe('paid');
  });

  it('should reject paying an already paid order', async () => {
    const createRes = await createBuyerOrder(app, buyerToken, {
      productId,
      sellerId,
    });
    const id = createRes.body.id;

    await request(app.getHttpServer())
      .post(`/api/buyer/orders/${id}/pay`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/buyer/orders/${id}/pay`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .expect(400);
  });

  it('should reject address submission before payment is confirmed', async () => {
    const createRes = await createBuyerOrder(app, buyerToken, {
      productId,
      sellerId,
    });
    const id = createRes.body.id;

    const res = await request(app.getHttpServer())
      .patch(`/api/buyer/orders/${id}/address`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        recipient: '张三',
        phone: '13800138000',
        province: '北京',
        city: '北京市',
        district: '朝阳区',
        address: '测试地址',
      })
      .expect(400);

    expect(res.body.message).toContain('支付结果尚未确认');

    const orderRes = await request(app.getHttpServer())
      .get(`/api/orders/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(orderRes.body.order.status).toBe('pending_payment');
    expect(orderRes.body.address).toBeNull();
  });
});
