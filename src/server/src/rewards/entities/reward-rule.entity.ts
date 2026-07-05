import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum RewardRuleType {
  FIXED_PER_BOOK = 'fixed_per_book',
  PERCENTAGE = 'percentage',
  TIER = 'tier',
}

@Entity('reward_rules')
export class RewardRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  productId?: string;

  @Column({ type: 'uuid', nullable: true })
  sellerId?: string;

  @Column({
    type: 'enum',
    enum: RewardRuleType,
    default: RewardRuleType.PERCENTAGE,
  })
  ruleType: RewardRuleType;

  @Column({ type: 'int', default: 0 })
  baseValue: number; // 基础值：比例时分母 10000，固定金额时分

  @Column({ type: 'int', default: 0 })
  threshold: number; // 阶梯门槛

  @Column({ type: 'int', nullable: true })
  rate?: number; // 万分比

  @Column({ type: 'int', nullable: true })
  fixedAmount?: number; // 固定金额 分

  @Column({ default: false })
  isDefault: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
