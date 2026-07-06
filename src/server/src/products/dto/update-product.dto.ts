import { IsOptional, IsString, IsInt, IsBoolean, IsUrl, Min, MaxLength } from 'class-validator';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  cover?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsBoolean()
  isOnSale?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  defaultQuantity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  aftersaleDays?: number;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  groupQrcode?: string;

  @IsOptional()
  @IsString()
  intro?: string;
}
