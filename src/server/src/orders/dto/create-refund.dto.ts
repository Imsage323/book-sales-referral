import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateRefundDto {
  /** 退款金额（分），缺省为订单剩余可退金额（全额退款） */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000000)
  amount?: number;

  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  reason: string;
}
