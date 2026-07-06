import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import databaseConfig from './config/database.config';
import { AuthModule } from './auth/auth.module';
import { AdminUsersModule } from './admin-users/admin-users.module';
import { OperationLogsModule } from './operation-logs/operation-logs.module';
import { SellersModule } from './sellers/sellers.module';
import { ProductsModule } from './products/products.module';
import { QrcodesModule } from './qrcodes/qrcodes.module';
import { ScanLogsModule } from './scan-logs/scan-logs.module';
import { OrdersModule } from './orders/orders.module';
import { ShipmentsModule } from './shipments/shipments.module';
import { LedgerModule } from './ledger/ledger.module';
import { RewardsModule } from './rewards/rewards.module';
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
    ScheduleModule.forRoot(),
    AuthModule,
    AdminUsersModule,
    OperationLogsModule,
    SellersModule,
    ProductsModule,
    QrcodesModule,
    ScanLogsModule,
    OrdersModule,
    ShipmentsModule,
    LedgerModule,
    RewardsModule,
  ],
  providers: [{ provide: APP_INTERCEPTOR, useClass: OperationLogInterceptor }],
})
export class AppModule {}
