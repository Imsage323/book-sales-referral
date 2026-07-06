import { IsEnum, IsOptional, IsString } from 'class-validator';
import { RewardStatus } from '../entities/reward-record.entity';

export class UpdateRewardRecordStatusDto {
  @IsEnum(RewardStatus)
  status: RewardStatus;

  @IsOptional()
  @IsString()
  remark?: string;
}
