import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum AdminRole {
  ADMIN = 'admin',
  SUPER = 'super',
}

export enum AdminStatus {
  ACTIVE = 'active',
  DISABLED = 'disabled',
}

@Entity('admin_users')
export class AdminUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 50 })
  username: string;

  @Column({ length: 255 })
  passwordHash: string;

  @Column({ type: 'enum', enum: AdminRole, default: AdminRole.ADMIN })
  role: AdminRole;

  @Column({ type: 'enum', enum: AdminStatus, default: AdminStatus.ACTIVE })
  status: AdminStatus;

  @Column({ length: 100, nullable: true })
  nickname?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
