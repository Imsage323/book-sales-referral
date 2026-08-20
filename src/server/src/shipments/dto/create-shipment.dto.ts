import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateShipmentDto {
  @IsNotEmpty()
  @IsUUID()
  orderId: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  company: string;

  /** 微信运力编码（delivery_id），从微信快递公司编码表选择时传入 */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  companyId?: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  trackingNo: string;
}
