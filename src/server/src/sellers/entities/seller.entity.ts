import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { SellerQrcode } from './seller-qrcode.entity';

export enum SellerStatus {
  ACTIVE = 'active',
  DISABLED = 'disabled',
}

@Entity('sellers')
export class Seller {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Index({ unique: true })
  @Column({ length: 50, unique: true })
  sellerCode: string;

  @Column({ length: 100, nullable: true })
  school?: string;

  @Column({ length: 100, nullable: true })
  region?: string;

  @Column({ length: 50, nullable: true })
  phone?: string;

  @Column({ type: 'uuid', nullable: true })
  parentId?: string;

  @ManyToOne(() => Seller, (seller) => seller.children, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent?: Seller;

  @OneToMany(() => Seller, (seller) => seller.parent)
  children: Seller[];

  @Column({ type: 'enum', enum: SellerStatus, default: SellerStatus.ACTIVE })
  status: SellerStatus;

  @Column({ type: 'text', nullable: true })
  remark?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => SellerQrcode, (qrcode) => qrcode.seller)
  qrcodes: SellerQrcode[];
}
