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

  @ManyToOne(() => Seller, (seller) => seller.qrcodes)
  @JoinColumn({ name: 'seller_id' })
  seller: Seller;

  @Column({ type: 'uuid', nullable: true })
  productId?: string;

  @Column({ type: 'longtext' })
  imageUrl: string;

  @CreateDateColumn()
  createdAt: Date;
}
