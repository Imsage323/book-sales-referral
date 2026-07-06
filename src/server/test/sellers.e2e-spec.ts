import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

jest.setTimeout(30000);

describe('SellersController (e2e)', () => {
  let app: INestApplication;
  let token: string;

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
  });

  afterAll(async () => {
    await app.close();
  });

  it('should reject unauthenticated requests', () => {
    return request(app.getHttpServer()).get('/api/sellers').expect(401);
  });

  it('should create a seller with auto-generated sellerCode', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/sellers')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'E2E Test Seller' })
      .expect(201);

    expect(res.body.name).toBe('E2E Test Seller');
    expect(res.body.sellerCode).toMatch(/^S[A-Z0-9]{6}$/);
  });

  it('should list sellers', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/sellers')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.total).toBeGreaterThan(0);
  });

  it('should prevent self-referential parent', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/sellers')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Parent Test' });
    const id = createRes.body.id;

    await request(app.getHttpServer())
      .patch(`/api/sellers/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ parentId: id })
      .expect(400);
  });
});
