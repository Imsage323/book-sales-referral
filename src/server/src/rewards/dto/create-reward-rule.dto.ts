import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  IsBoolean,
  Min,
} from 'class-validator';
import { RewardRuleType } from '../entities/reward-rule.entity';

export class CreateRewardRuleDto {
  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  sellerId?: string;

  @IsEnum(RewardRuleType)
  ruleType: RewardRuleType;

  @IsOptional()
  @IsInt()
  @Min(0)
  baseValue?: number = 0;

  @IsOptional()
  @IsInt()
  @Min(0)
  threshold?: number = 0;

  @IsOptional()
  @IsInt()
  @Min(0)
  rate?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  fixedAmount?: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean = false;
}
