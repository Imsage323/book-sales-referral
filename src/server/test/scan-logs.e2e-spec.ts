import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

jest.setTimeout(30000);

describe('ScanLogsController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should record a scan log without authentication', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/scan-logs')
      .send({
        sellerCode: 'S-TEST01',
        openid: 'test-openid',
        scene: 'test-scene',
      })
      .expect(201);
    expect(res.body.sellerCode).toBe('S-TEST01');
    expect(res.body.openid).toBe('test-openid');
  });
});
