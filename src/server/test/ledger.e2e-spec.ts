import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { createBuyerOrder, loginBuyer } from './buyer-test.helper';

jest.setTimeout(30000);

describe('LedgerController (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let sellerId: string;
  let productId: string;
  let buyerToken: string;

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
      .send({ name: 'Ledger Test Seller' });
    sellerId = sellerRes.body.id;

    const productRes = await request(app.getHttpServer())
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Ledger Test Product', price: 100 });
    productId = productRes.body.id;
    buyerToken = await loginBuyer(app, 'ledger-buyer');
  });

  afterAll(async () => {
    await app.close();
  });

  it('should export order ledger as xlsx', async () => {
    const orderRes = await createBuyerOrder(app, buyerToken, {
      productId,
      sellerId,
      quantity: 2,
    });
    const orderId = orderRes.body.id;

    await request(app.getHttpServer())
      .post('/api/shipments')
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId, company: '顺丰', trackingNo: 'SF123456' });

    const res = await request(app.getHttpServer())
      .get('/api/ledger/export')
      .set('Authorization', `Bearer ${token}`)
      .buffer(true)
      .parse((res: any, cb: any) => {
        res.data = Buffer.alloc(0);
        res.on('data', (chunk: Buffer) => {
          res.data = Buffer.concat([res.data, chunk]);
        });
        res.on('end', () => cb(null, res.data));
      })
      .expect(200);

    expect(res.headers['content-type']).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(res.headers['content-disposition']).toMatch(
      /attachment; filename="ledger-.*\.xlsx"/,
    );
    expect(Buffer.isBuffer(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('should reject unauthorized ledger export', async () => {
    await request(app.getHttpServer()).get('/api/ledger/export').expect(401);
  });
});
