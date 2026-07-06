import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateShipmentDto {
  @IsNotEmpty()
  @IsUUID()
  orderId: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  company: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  trackingNo: string;
}
