import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ nullable: true })
  userId?: string;

  @Index()
  @Column()
  module: string;

  @Column()
  action: string;

  @Column({ type: 'jsonb', nullable: true })
  previousValue?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  newValue?: Record<string, any>;

  @Column({ nullable: true })
  ipAddress?: string;

  @CreateDateColumn()
  createdAt: Date;
}
