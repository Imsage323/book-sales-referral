import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum RefundStatus {
  PROCESSING = 'processing',
  SUCCESS = 'success',
  ABNORMAL = 'abnormal',
  CLOSED = 'closed',
}

@Entity('refund_records')
export class RefundRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  orderId: string;

  @Column({ type: 'int' })
  amount: number;

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @Column({ length: 100 })
  operator: string;

  /** 商户退款单号（微信侧唯一） */
  @Column({ type: 'varchar', length: 64, unique: true, nullable: true })
  outRefundNo?: string;

  /** 退款状态：processing 处理中 / success 成功 / abnormal 异常 / closed 已关闭 */
  @Column({
    type: 'enum',
    enum: RefundStatus,
    default: RefundStatus.PROCESSING,
  })
  status: RefundStatus;

  /** 微信退款单号 */
  @Column({ type: 'varchar', length: 64, nullable: true })
  wxRefundId?: string;

  @CreateDateColumn()
  createdAt: Date;
}
