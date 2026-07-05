import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('operation_logs')
export class OperationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  adminId?: string;

  @Column({ length: 100 })
  action: string;

  @Column({ length: 100, nullable: true })
  target?: string;

  @Column({ type: 'json', nullable: true })
  detail?: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;
}
