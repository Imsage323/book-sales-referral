import { IsOptional, IsString, IsEnum, IsInt, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { OrderStatus } from '../entities/order.entity';

export class QueryOrderDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  // 前端清空筛选时会传空字符串，需归一为 undefined 避免 IsEnum 校验失败
  @IsOptional()
  @Transform(({ value }) => value || undefined)
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsString()
  sellerId?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 20;
}
