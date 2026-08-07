import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { BuyerTokenService } from './buyer-token.service';

describe('BuyerTokenService', () => {
  it('issues a short-lived token with an explicit buyer token type', () => {
    const jwtService = new JwtService({ secret: 'test-secret' });
    const configService = {
      get: jest.fn().mockReturnValue('30m'),
    } as unknown as ConfigService;
    const service = new BuyerTokenService(jwtService, configService);

    const result = service.issue('buyer-openid');
    const payload = jwtService.verify(result.accessToken);

    expect(result.expiresIn).toBe('30m');
    expect(payload).toMatchObject({
      sub: 'buyer-openid',
      openid: 'buyer-openid',
      tokenType: 'buyer',
    });
  });
});
