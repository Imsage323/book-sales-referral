import { INestApplication } from '@nestjs/common';
import request from 'supertest';

export async function loginBuyer(
  app: INestApplication,
  code: string,
): Promise<string> {
  process.env.NODE_ENV = 'test';
  process.env.WX_LOGIN_MODE = 'mock';
  const response = await request(app.getHttpServer())
    .post('/api/wx/login')
    .send({ code })
    .expect(200);
  return response.body.accessToken;
}

export async function createBuyerOrder(
  app: INestApplication,
  buyerToken: string,
  data: { productId: string; sellerId: string; quantity?: number },
) {
  return request(app.getHttpServer())
    .post('/api/buyer/orders')
    .set('Authorization', `Bearer ${buyerToken}`)
    .send(data)
    .expect(201);
}
