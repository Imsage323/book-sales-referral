import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('scan_logs')
export class ScanLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  sellerCode: string;

  @Column({ type: 'uuid', nullable: true })
  sellerId?: string;

  @Column({ type: 'uuid', nullable: true })
  productId?: string;

  @Column({ length: 100 })
  openid: string;

  @Column({ length: 100, nullable: true })
  scene?: string;

  @Column({ length: 100, nullable: true })
  ip?: string;

  @CreateDateColumn()
  createdAt: Date;
}
