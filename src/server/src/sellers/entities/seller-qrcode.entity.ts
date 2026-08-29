import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Seller } from './seller.entity';

@Entity('seller_qrcodes')
export class SellerQrcode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  sellerId: string;

  // JoinColumn 必须指向实际存值的 sellerId 列，否则关联查询永远为 null
  @ManyToOne(() => Seller, (seller) => seller.qrcodes)
  @JoinColumn({ name: 'sellerId' })
  seller: Seller;

  @Column({ type: 'uuid', nullable: true })
  productId?: string;

  @Column({ type: 'longtext' })
  imageUrl: string;

  @CreateDateColumn()
  createdAt: Date;
}
