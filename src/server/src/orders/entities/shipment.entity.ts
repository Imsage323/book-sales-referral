import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('shipments')
export class Shipment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  orderId: string;

  @Column({ length: 50 })
  company: string;

  @Column({ length: 100 })
  trackingNo: string;

  @Column()
  shippedAt: Date;

  @Column({ nullable: true })
  aftersaleStart?: Date;

  @Column({ nullable: true })
  aftersaleEnd?: Date;

  @CreateDateColumn()
  createdAt: Date;
}
