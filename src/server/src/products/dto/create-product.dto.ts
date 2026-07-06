import { IsNotEmpty, IsOptional, IsString, IsInt, IsBoolean, IsUrl, Min, MaxLength } from 'class-validator';

export class CreateProductDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  cover?: string;

  @IsInt()
  @Min(0)
  price: number;

  @IsOptional()
  @IsBoolean()
  isOnSale?: boolean = true;

  @IsOptional()
  @IsInt()
  @Min(1)
  defaultQuantity?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(0)
  aftersaleDays?: number = 7;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  groupQrcode?: string;

  @IsOptional()
  @IsString()
  intro?: string;
}
