import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QrcodesService } from './qrcodes.service';
import { QrcodesController } from './qrcodes.controller';
import { SellerQrcode } from '../sellers/entities/seller-qrcode.entity';
import { SellersModule } from '../sellers/sellers.module';
import { ProductsModule } from '../products/products.module';
import { WxQrcodeService } from './wx-qrcode.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SellerQrcode]),
    SellersModule,
    ProductsModule,
  ],
  controllers: [QrcodesController],
  providers: [QrcodesService, WxQrcodeService],
  exports: [QrcodesService],
})
export class QrcodesModule {}
