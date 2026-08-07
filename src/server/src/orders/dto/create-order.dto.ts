import { IsNotEmpty, IsOptional, IsUUID, IsInt, Min } from 'class-validator';

export class CreateOrderDto {
  @IsNotEmpty()
  @IsUUID()
  productId: string;

  @IsNotEmpty()
  @IsUUID()
  sellerId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number = 1;
}
