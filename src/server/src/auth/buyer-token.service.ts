import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

export interface BuyerTokenPayload {
  sub: string;
  openid: string;
  tokenType: 'buyer';
}

@Injectable()
export class BuyerTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  issue(openid: string): { accessToken: string; expiresIn: string } {
    const expiresIn =
      this.configService.get<string>('BUYER_JWT_EXPIRES_IN') || '2h';
    const payload: BuyerTokenPayload = {
      sub: openid,
      openid,
      tokenType: 'buyer',
    };
    return {
      accessToken: this.jwtService.sign(payload, {
        expiresIn: expiresIn as `${number}${'d' | 'h' | 'm' | 's' | 'w' | 'y'}`,
      }),
      expiresIn,
    };
  }
}
