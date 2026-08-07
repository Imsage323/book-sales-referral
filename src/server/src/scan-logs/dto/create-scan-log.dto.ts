import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateScanLogDto {
  @IsNotEmpty()
  @IsString()
  sellerCode: string;

  @IsOptional()
  @IsUUID()
  sellerId?: string;

  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsString()
  scene?: string;

  @IsOptional()
  @IsString()
  ip?: string;
}
