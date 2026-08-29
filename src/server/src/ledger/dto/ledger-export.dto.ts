import { IsOptional, IsString, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { OrderStatus } from '../../orders/entities/order.entity';

export class LedgerExportDto {
  @IsOptional()
  @IsString()
  sellerId?: string;

  @IsOptional()
  @Transform(({ value }) => value || undefined)
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}
