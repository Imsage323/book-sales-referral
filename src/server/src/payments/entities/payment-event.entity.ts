import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('payment_events')
export class PaymentEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  orderNo: string;

  @Column({ type: 'text' })
  rawBody: string;

  @Column({ default: false })
  verified: boolean;

  @Column({ type: 'int', nullable: true })
  amount?: number;

  @Column({ length: 50, nullable: true })
  result?: string;

  @CreateDateColumn()
  createdAt: Date;
}
