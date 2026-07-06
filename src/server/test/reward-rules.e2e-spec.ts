import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

jest.setTimeout(30000);

describe('RewardRulesController (e2e)', () => {
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

  it('should create, update, and delete reward rules', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/rewards/rules')
      .set('Authorization', `Bearer ${token}`)
      .send({ ruleType: 'fixed_per_book', fixedAmount: 10, baseValue: 10 })
      .expect(201);
    const id = createRes.body.id;
    expect(createRes.body.ruleType).toBe('fixed_per_book');
    expect(createRes.body.fixedAmount).toBe(10);

    const listRes = await request(app.getHttpServer())
      .get('/api/rewards/rules')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(listRes.body.items.length).toBeGreaterThanOrEqual(1);

    await request(app.getHttpServer())
      .patch(`/api/rewards/rules/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ fixedAmount: 20 })
      .expect(200);

    const detailRes = await request(app.getHttpServer())
      .get(`/api/rewards/rules/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(detailRes.body.fixedAmount).toBe(20);

    await request(app.getHttpServer())
      .delete(`/api/rewards/rules/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
});
