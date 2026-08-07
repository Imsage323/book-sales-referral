import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { AdminUsersModule } from '../admin-users/admin-users.module';
import { BuyerJwtStrategy } from './buyer-jwt.strategy';
import { BuyerJwtAuthGuard } from './buyer-jwt-auth.guard';
import { BuyerTokenService } from './buyer-token.service';

@Module({
  imports: [
    AdminUsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET')!,
        signOptions: {
          expiresIn: (configService.get<string>('JWT_EXPIRES_IN') || '7d') as
            `${number}${'d' | 'h' | 'm' | 's' | 'w' | 'y'}` | number,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    BuyerJwtStrategy,
    BuyerJwtAuthGuard,
    BuyerTokenService,
  ],
  controllers: [AuthController],
  exports: [JwtModule, BuyerJwtAuthGuard, BuyerTokenService],
})
export class AuthModule {}
