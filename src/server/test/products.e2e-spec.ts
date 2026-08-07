import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { AppModule } from './../src/app.module';

jest.setTimeout(30000);

describe('ProductsController (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let configService: ConfigService;
  let storefrontSellerCode: string;
  let storefrontProductId: string;
  let envBackup: {
    DEFAULT_SELLER_CODE?: string;
    DEFAULT_PRODUCT_ID?: string;
  };

  beforeAll(async () => {
    envBackup = {
      DEFAULT_SELLER_CODE: process.env.DEFAULT_SELLER_CODE,
      DEFAULT_PRODUCT_ID: process.env.DEFAULT_PRODUCT_ID,
    };
    delete process.env.DEFAULT_SELLER_CODE;
    delete process.env.DEFAULT_PRODUCT_ID;
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    configService = app.get(ConfigService);

    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123456' });
    token = res.body.accessToken;

    const sellerRes = await request(app.getHttpServer())
      .post('/api/sellers')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Storefront Direct Seller' });
    storefrontSellerCode = sellerRes.body.sellerCode;

    const productRes = await request(app.getHttpServer())
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Storefront Product', price: 100 });
    storefrontProductId = productRes.body.id;
  });

  afterAll(async () => {
    await app.close();
    if (envBackup.DEFAULT_SELLER_CODE === undefined) {
      delete process.env.DEFAULT_SELLER_CODE;
    } else {
      process.env.DEFAULT_SELLER_CODE = envBackup.DEFAULT_SELLER_CODE;
    }
    if (envBackup.DEFAULT_PRODUCT_ID === undefined) {
      delete process.env.DEFAULT_PRODUCT_ID;
    } else {
      process.env.DEFAULT_PRODUCT_ID = envBackup.DEFAULT_PRODUCT_ID;
    }
  });

  it('should reject unauthenticated requests', () => {
    return request(app.getHttpServer()).get('/api/products').expect(401);
  });

  it('should create a product', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'E2E Test Product', price: 100 })
      .expect(201);

    expect(res.body.name).toBe('E2E Test Product');
    expect(res.body.price).toBe(100);
  });

  it('should list products', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.total).toBeGreaterThan(0);
  });

  it('should fail closed when the default storefront is not configured', async () => {
    configService.set('DEFAULT_SELLER_CODE', '');
    configService.set('DEFAULT_PRODUCT_ID', '');

    await request(app.getHttpServer())
      .get('/api/products/storefront')
      .expect(503);
  });

  it('should return the explicitly configured direct storefront', async () => {
    configService.set('DEFAULT_SELLER_CODE', storefrontSellerCode);
    configService.set('DEFAULT_PRODUCT_ID', storefrontProductId);

    const res = await request(app.getHttpServer())
      .get('/api/products/storefront')
      .expect(200);

    expect(res.body.source).toBe('default');
    expect(res.body.seller.sellerCode).toBe(storefrontSellerCode);
    expect(res.body.product.id).toBe(storefrontProductId);
  });
});
