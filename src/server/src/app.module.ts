import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { APP_INTERCEPTOR } from '@nestjs/core';
import databaseConfig from './config/database.config';
import { AuthModule } from './auth/auth.module';
import { AdminUsersModule } from './admin-users/admin-users.module';
import { OperationLogsModule } from './operation-logs/operation-logs.module';
import { OperationLogInterceptor } from './operation-logs/operation-log.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [databaseConfig] }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        configService.get<TypeOrmModuleOptions>('database')!,
    }),
    AuthModule,
    AdminUsersModule,
    OperationLogsModule,
  ],
  providers: [{ provide: APP_INTERCEPTOR, useClass: OperationLogInterceptor }],
})
export class AppModule {}
