import { IsNotEmpty, IsOptional, IsUUID, IsString, MaxLength } from 'class-validator';

export class CreateQrcodeDto {
  @IsNotEmpty()
  @IsUUID()
  sellerId: string;

  @IsOptional()
  @IsUUID()
  productId?: string;
}
