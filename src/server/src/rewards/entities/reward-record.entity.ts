import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum RewardType {
  SELLER = 'seller',
  REFERRAL = 'referral',
}

export enum RewardStatus {
  ESTIMATED = 'estimated',
  READY = 'ready',
  PENDING = 'pending',
  PROCESSED = 'processed',
  REVERSED = 'reversed',
  VOID = 'void',
}

@Entity('reward_records')
export class RewardRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  orderId: string;

  @Column({ type: 'uuid' })
  productId: string;

  @Column({ type: 'uuid' })
  sellerId: string;

  @Column({ type: 'uuid' })
  beneficiaryId: string;

  @Column({ type: 'enum', enum: RewardType })
  rewardType: RewardType;

  @Column({ type: 'enum', enum: RewardStatus, default: RewardStatus.ESTIMATED })
  status: RewardStatus;

  @Column({ type: 'int' })
  amount: number;

  @Column({ type: 'json' })
  ruleSnapshot: Record<string, unknown>;

  @Column({ type: 'text' })
  formula: string;

  @Column()
  calculatedAt: Date;

  @Column({ type: 'int', nullable: true })
  processedAmount?: number;

  @Column({ nullable: true })
  processedAt?: Date;

  @Column({ type: 'text', nullable: true })
  remark?: string;

  @CreateDateColumn()
  createdAt: Date;
}
