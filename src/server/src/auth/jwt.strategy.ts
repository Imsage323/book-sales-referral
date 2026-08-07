import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AdminUsersService } from '../admin-users/admin-users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly adminUsersService: AdminUsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET')!,
    });
  }

  async validate(payload: {
    sub: string;
    username: string;
    tokenType: 'admin';
  }) {
    if (payload.tokenType !== 'admin' || !payload.username) {
      throw new UnauthorizedException();
    }
    const user = await this.adminUsersService.findByUsername(payload.username);
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException();
    }
    return {
      userId: user.id,
      username: user.username,
      role: user.role,
      tokenType: payload.tokenType,
    };
  }
}
