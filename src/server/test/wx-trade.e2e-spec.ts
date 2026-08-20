import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

jest.setTimeout(30000);

describe('WxTradeController (e2e)', () => {
  let app: INestApplication;
  let token: string;

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
  });

  afterAll(async () => {
    delete process.env.WX_TRADE_MODE;
    await app.close();
  });

  it('should require admin auth', async () => {
    await request(app.getHttpServer()).get('/api/wx-trade/status').expect(401);
  });

  it('should report current trade mode', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/wx-trade/status')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.mode).toBe('mock');
  });

  it('should list express companies (mock sample)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/wx-trade/express-companies')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty('deliveryId');
    expect(res.body[0]).toHaveProperty('deliveryName');
  });

  it('should configure wx order detail path', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/wx-trade/order-detail-path')
      .set('Authorization', `Bearer ${token}`)
      .expect(201);
    expect(res.body.path).toContain('${商品订单号}');
  });
});
