import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

jest.setTimeout(30000);

describe('QrcodesController (e2e)', () => {
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
      .send({ name: 'QR Test Seller' });
    sellerId = sellerRes.body.id;

    const productRes = await request(app.getHttpServer())
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'QR Test Product', price: 100 });
    productId = productRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should generate a qrcode', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/qrcodes')
      .set('Authorization', `Bearer ${token}`)
      .send({ sellerId, productId })
      .expect(201);

    expect(res.body.imageUrl).toContain('data:image/svg+xml;base64,');
    expect(res.body.sellerId).toBe(sellerId);
    expect(res.body.productId).toBe(productId);
  });

  it('should list qrcodes', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/qrcodes')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.total).toBeGreaterThan(0);
  });

  it('should download qrcode image', async () => {
    const listRes = await request(app.getHttpServer())
      .get('/api/qrcodes')
      .set('Authorization', `Bearer ${token}`);
    const qrcode = listRes.body.items[0];

    const downloadRes = await request(app.getHttpServer())
      .get(`/api/qrcodes/${qrcode.id}/download`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(downloadRes.headers['content-type']).toBe('image/svg+xml');
  });
});
