import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

jest.setTimeout(30000);

describe('AuthController (e2e)', () => {
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

  it('/api/auth/login (POST) should reject invalid credentials', () => {
    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'wrong' })
      .expect(401);
  });

  it('/api/auth/login (POST) should return access token for valid credentials', () => {
    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123456' })
      .expect(200)
      .expect((res: request.Response) => {
        expect(res.body.accessToken).toBeDefined();
      });
  });
});
