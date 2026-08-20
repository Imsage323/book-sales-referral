import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { createBuyerOrder, loginBuyer } from './buyer-test.helper';

jest.setTimeout(30000);

describe('ShipmentsController (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let sellerId: string;
  let productId: string;
  let orderId: string;
  let buyerToken: string;

  beforeAll(async () => {
    process.env.WX_TRADE_MODE = 'mock';
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
      .send({ name: 'Shipment Test Seller' });
    sellerId = sellerRes.body.id;

    const productRes = await request(app.getHttpServer())
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Shipment Test Product', price: 100 });
    productId = productRes.body.id;

    buyerToken = await loginBuyer(app, 'shipments-buyer');
    const orderRes = await createBuyerOrder(app, buyerToken, {
      productId,
      sellerId,
    });
    orderId = orderRes.body.id;

    await request(app.getHttpServer())
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'paid' });

    await request(app.getHttpServer())
      .patch(`/api/buyer/orders/${orderId}/address`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        recipient: '张三',
        phone: '13800138000',
        province: '北京',
        city: '北京市',
        district: '朝阳区',
        address: '测试地址',
      });
  });

  afterAll(async () => {
    delete process.env.WX_TRADE_MODE;
    await app.close();
  });

  it('should create a shipment and sync shipping info to wx (mock)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/shipments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        orderId,
        company: '顺丰速运',
        companyId: 'SF',
        trackingNo: 'SF1234567890',
      })
      .expect(201);
    expect(res.body.company).toBe('顺丰速运');
    expect(res.body.trackingNo).toBe('SF1234567890');
    expect(res.body.wxSyncStatus).toBe('success');
    expect(res.body.wxSyncedAt).toBeTruthy();

    const orderRes = await request(app.getHttpServer())
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(orderRes.body.order.status).toBe('aftersale_waiting');
  });

  it('should reject wx-sync retry for an already synced shipment', async () => {
    const listRes = await request(app.getHttpServer())
      .get('/api/shipments')
      .set('Authorization', `Bearer ${token}`)
      .query({ orderId })
      .expect(200);
    const shipmentId = listRes.body.items[0].id;

    await request(app.getHttpServer())
      .post(`/api/shipments/${shipmentId}/wx-sync`)
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });

  it('should list shipments', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/shipments')
      .set('Authorization', `Bearer ${token}`)
      .query({ orderId })
      .expect(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThan(0);
  });
});
