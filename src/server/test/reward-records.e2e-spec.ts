import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

jest.setTimeout(30000);

describe('RewardRecordsController (e2e)', () => {
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

  it('should list reward records and update status', async () => {
    const recordsRes = await request(app.getHttpServer())
      .get('/api/rewards/records')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(recordsRes.body.items).toBeDefined();
    expect(recordsRes.body.total).toBeGreaterThanOrEqual(0);

    if (recordsRes.body.items.length > 0) {
      const record = recordsRes.body.items[0];
      await request(app.getHttpServer())
        .patch(`/api/rewards/records/${record.id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'processed' })
        .expect(200);

      const detailRes = await request(app.getHttpServer())
        .get(`/api/rewards/records/${record.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(detailRes.body.status).toBe('processed');
      expect(detailRes.body.processedAt).toBeTruthy();
    }
  });
});
