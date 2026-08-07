import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { loginBuyer } from './buyer-test.helper';

jest.setTimeout(30000);

describe('ScanLogsController (e2e)', () => {
  let app: INestApplication;
  let buyerToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    buyerToken = await loginBuyer(app, 'scan-log-buyer');
  });

  afterAll(async () => {
    await app.close();
  });

  it('should derive scan-log openid from buyer authentication', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/scan-logs')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        sellerCode: 'S-TEST01',
        scene: 'test-scene',
      })
      .expect(201);
    expect(res.body.sellerCode).toBe('S-TEST01');
    expect(res.body.openid).toBe('dev-openid-scan-log-buyer');
  });

  it('should reject unauthenticated scan logs', async () => {
    await request(app.getHttpServer())
      .post('/api/scan-logs')
      .send({ sellerCode: 'S-TEST01', scene: 'test-scene' })
      .expect(401);
  });
});
