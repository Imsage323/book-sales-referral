import { IsOptional, IsString, IsEnum } from 'class-validator';
import { OrderStatus } from '../../orders/entities/order.entity';

export class LedgerExportDto {
  @IsOptional()
  @IsString()
  sellerId?: string;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}
