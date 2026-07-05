import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

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

  @CreateDateColumn()
  createdAt: Date;
}
