import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { BuyerTokenPayload } from './buyer-token.service';

@Injectable()
export class BuyerJwtStrategy extends PassportStrategy(Strategy, 'buyer-jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET')!,
    });
  }

  validate(payload: BuyerTokenPayload) {
    if (payload.tokenType !== 'buyer' || !payload.openid) {
      throw new UnauthorizedException();
    }
    return {
      openid: payload.openid,
      tokenType: payload.tokenType,
    };
  }
}
