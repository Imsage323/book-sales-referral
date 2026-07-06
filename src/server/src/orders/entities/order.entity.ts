import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum OrderStatus {
  PENDING_PAYMENT = 'pending_payment',
  PAID = 'paid',
  ADDRESS_PENDING = 'address_pending',
  SHIPPING_PENDING = 'shipping_pending',
  SHIPPED = 'shipped',
  AFTERSALE_WAITING = 'aftersale_waiting',
  SETTLEMENT_READY = 'settlement_ready',
  CLOSED = 'closed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50, unique: true })
  orderNo: string;

  @Column({ type: 'uuid' })
  productId: string;

  @Column({ type: 'uuid' })
  sellerId: string;

  @Column({ length: 100 })
  openid: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'int' })
  unitPrice: number; // 分

  @Column({ type: 'int' })
  totalAmount: number; // 分

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING_PAYMENT,
  })
  status: OrderStatus;

  @Column({ nullable: true })
  paidAt?: Date;

  @Column({ length: 100, nullable: true })
  wxTransactionId?: string;

  @Column({ type: 'text', nullable: true })
  remark?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
