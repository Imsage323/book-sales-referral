import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  name: string;

  @Column({ length: 500, nullable: true })
  cover?: string;

  @Column({ type: 'int' })
  price: number; // 单位：分

  @Column({ default: true })
  isOnSale: boolean;

  @Column({ default: 1 })
  defaultQuantity: number;

  @Column({ default: 7 })
  aftersaleDays: number;

  @Column({ length: 500, nullable: true })
  groupQrcode?: string;

  @Column({ type: 'text', nullable: true })
  intro?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
