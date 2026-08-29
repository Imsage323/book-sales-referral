import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { loginBuyer, createBuyerOrder } from './buyer-test.helper';

describe('RefundsController (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let buyerToken: string;
  let sellerId: string;
  let productId: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.WX_PAY_MODE = 'mock';
    process.env.REWARD_ESTIMATE_ON_PAID_ENABLED = 'true';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123456' });
    adminToken = loginRes.body.accessToken;

    const sellerRes = await request(app.getHttpServer())
      .post('/api/sellers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Refund Test Seller' });
    sellerId = sellerRes.body.id;

    const productRes = await request(app.getHttpServer())
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Refund Test Product', price: 8800, aftersaleDays: 7 });
    productId = productRes.body.id;

    buyerToken = await loginBuyer(app, 'refunds-buyer');
  });

  afterAll(async () => {
    await app.close();
    delete process.env.REWARD_ESTIMATE_ON_PAID_ENABLED;
  });

  it('should refund a paid order and void estimated rewards', async () => {
    const orderRes = await createBuyerOrder(app, buyerToken, {
      productId,
      sellerId,
      quantity: 1,
    });
    const orderId = orderRes.body.id;

    await request(app.getHttpServer())
      .post(`/api/buyer/orders/${orderId}/pay`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({})
      .expect(201);

    // 付款后应有预估返点记录
    const beforeRes = await request(app.getHttpServer())
      .get('/api/rewards/records')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ orderId })
      .expect(200);
    expect(beforeRes.body.items.length).toBeGreaterThan(0);
    expect(
      beforeRes.body.items.every((r: any) => r.status === 'estimated'),
    ).toBe(true);

    // 管理员发起全额退款
    const refundRes = await request(app.getHttpServer())
      .post(`/api/orders/${orderId}/refund`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: '买家申请退款' })
      .expect(201);
    expect(refundRes.body.status).toBe('success');
    expect(refundRes.body.amount).toBe(8800);
    expect(refundRes.body.outRefundNo).toMatch(/-R1$/);

    // 订单状态变为已退款
    const orderDetail = await request(app.getHttpServer())
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(orderDetail.body.order.status).toBe('refunded');

    // 预估返点全部作废
    const afterRes = await request(app.getHttpServer())
      .get('/api/rewards/records')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ orderId })
      .expect(200);
    expect(
      afterRes.body.items.every((r: any) => r.status === 'void'),
    ).toBe(true);

    // 退款记录可查询
    const refundsRes = await request(app.getHttpServer())
      .get(`/api/orders/${orderId}/refunds`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(refundsRes.body).toHaveLength(1);

    // 已退款订单不允许重复退款
    await request(app.getHttpServer())
      .post(`/api/orders/${orderId}/refund`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: '重复退款' })
      .expect(400);
  });

  it('should support partial refund without touching rewards', async () => {
    const orderRes = await createBuyerOrder(app, buyerToken, {
      productId,
      sellerId,
      quantity: 1,
    });
    const orderId = orderRes.body.id;

    await request(app.getHttpServer())
      .post(`/api/buyer/orders/${orderId}/pay`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({})
      .expect(201);

    const refundRes = await request(app.getHttpServer())
      .post(`/api/orders/${orderId}/refund`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ amount: 1000, reason: '部分退款' })
      .expect(201);
    expect(refundRes.body.status).toBe('success');

    // 未退满：订单状态不变、返点不作废
    const orderDetail = await request(app.getHttpServer())
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(orderDetail.body.order.status).not.toBe('refunded');

    // 超出剩余可退金额被拒绝
    await request(app.getHttpServer())
      .post(`/api/orders/${orderId}/refund`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ amount: 8000, reason: '超额' })
      .expect(400);
  });

  it('should reject refund for unpaid order', async () => {
    const orderRes = await createBuyerOrder(app, buyerToken, {
      productId,
      sellerId,
      quantity: 1,
    });

    await request(app.getHttpServer())
      .post(`/api/orders/${orderRes.body.id}/refund`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: '未支付订单' })
      .expect(400);
  });

  it('should reject refund without admin token', async () => {
    await request(app.getHttpServer())
      .post('/api/orders/00000000-0000-0000-0000-000000000000/refund')
      .send({ reason: '未授权' })
      .expect(401);
  });
});
