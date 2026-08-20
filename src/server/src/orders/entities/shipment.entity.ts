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

  /** 微信运力编码（delivery_id），发货信息上传必填 */
  @Column({ type: 'varchar', length: 50, nullable: true })
  companyId?: string | null;

  @Column({ length: 100 })
  trackingNo: string;

  /** 微信发货信息同步状态：pending/success/failed/skipped */
  @Column({ length: 20, default: 'pending' })
  wxSyncStatus: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  wxSyncError?: string | null;

  @Column({ type: 'datetime', nullable: true })
  wxSyncedAt?: Date | null;

  @Column()
  shippedAt: Date;

  @Column({ nullable: true })
  aftersaleStart?: Date;

  @Column({ nullable: true })
  aftersaleEnd?: Date;

  @CreateDateColumn()
  createdAt: Date;
}
