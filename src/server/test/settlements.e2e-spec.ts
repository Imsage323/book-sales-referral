import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

jest.setTimeout(30000);

describe('SettlementController (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let sellerId: string;
  let parentSellerId: string;
  let productId: string;

  beforeAll(async () => {
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

    const parentRes = await request(app.getHttpServer())
      .post('/api/sellers')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Settlement Parent Seller' });
    parentSellerId = parentRes.body.id;

    const sellerRes = await request(app.getHttpServer())
      .post('/api/sellers')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Settlement Child Seller', parentId: parentSellerId });
    sellerId = sellerRes.body.id;

    const productRes = await request(app.getHttpServer())
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Settlement Test Product', price: 100, aftersaleDays: 0 });
    productId = productRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should settle an order after aftersale period and create reward records', async () => {
    const orderRes = await request(app.getHttpServer())
      .post('/api/orders')
      .send({ productId, sellerId, openid: 'test-openid', quantity: 2 });
    const orderId = orderRes.body.id;

    await request(app.getHttpServer())
      .post(`/api/orders/${orderId}/pay`)
      .send({})
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/orders/${orderId}/address`)
      .send({
        recipient: '张三',
        phone: '13800138000',
        province: '北京',
        city: '北京市',
        district: '朝阳区',
        address: '测试地址',
      })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/shipments')
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId, company: '顺丰', trackingNo: 'SF123456' });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const settlementRes = await request(app.getHttpServer())
      .post('/api/rewards/settlements/run')
      .set('Authorization', `Bearer ${token}`)
      .expect(201);
    expect(settlementRes.body.settledCount).toBeGreaterThanOrEqual(1);

    const orderDetail = await request(app.getHttpServer())
      .get(`/api/orders/${orderId}`)
      .expect(200);
    expect(orderDetail.body.order.status).toBe('settlement_ready');

    const recordsRes = await request(app.getHttpServer())
      .get('/api/rewards/records')
      .set('Authorization', `Bearer ${token}`)
      .query({ orderId })
      .expect(200);
    expect(recordsRes.body.items.length).toBe(2);
    const types = recordsRes.body.items.map((r: any) => r.rewardType);
    expect(types).toContain('seller');
    expect(types).toContain('referral');
  });
});
