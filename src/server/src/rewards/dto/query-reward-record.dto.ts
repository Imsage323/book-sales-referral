import { IsOptional, IsString, IsEnum, IsInt, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { RewardType, RewardStatus } from '../entities/reward-record.entity';

export class QueryRewardRecordDto {
  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsString()
  sellerId?: string;

  @IsOptional()
  @IsString()
  beneficiaryId?: string;

  @IsOptional()
  @Transform(({ value }) => value || undefined)
  @IsEnum(RewardType)
  rewardType?: RewardType;

  @IsOptional()
  @Transform(({ value }) => value || undefined)
  @IsEnum(RewardStatus)
  status?: RewardStatus;

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
