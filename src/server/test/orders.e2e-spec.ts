import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

jest.setTimeout(30000);

describe('OrdersController (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let sellerId: string;
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
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create an order', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/orders')
      .send({ productId, sellerId, openid: 'test-openid', quantity: 2 })
      .expect(201);
    expect(res.body.orderNo).toMatch(/^O-\d{8}-\d{4}$/);
    expect(res.body.totalAmount).toBe(200);
  });

  it('should get order details', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/orders')
      .send({ productId, sellerId, openid: 'test-openid' });

    const res = await request(app.getHttpServer())
      .get(`/api/orders/${createRes.body.id}`)
      .expect(200);
    expect(res.body.order.id).toBe(createRes.body.id);
  });

  it('should update order status to paid and fill address', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/orders')
      .send({ productId, sellerId, openid: 'test-openid' });
    const id = createRes.body.id;

    await request(app.getHttpServer())
      .patch(`/api/orders/${id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'paid' })
      .expect(200);

    const res = await request(app.getHttpServer())
      .patch(`/api/orders/${id}/address`)
      .send({
        recipient: '张三',
        phone: '13800138000',
        province: '北京',
        city: '北京市',
        district: '朝阳区',
        address: '测试地址',
      })
      .expect(200);
    expect(res.body.recipient).toBe('张三');

    const orderRes = await request(app.getHttpServer())
      .get(`/api/orders/${id}`)
      .expect(200);
    expect(orderRes.body.order.status).toBe('address_pending');
  });
});
