import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class OrderAddressDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  recipient: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  phone: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  province: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  city: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  district: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  address: string;

  @IsOptional()
  @IsString()
  remark?: string;
}
