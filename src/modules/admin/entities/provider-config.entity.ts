import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ProviderCategory {
  RTC = 'rtc',
  PAYMENT = 'payment',
  FIREBASE = 'firebase',
  STORAGE = 'storage',
  EMAIL = 'email',
  SMS = 'sms',
  AI = 'ai',
  MAPS = 'maps',
}

export type ProviderHealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'not_tested';

@Entity('provider_configs')
export class ProviderConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({
    type: 'enum',
    enum: ProviderCategory,
  })
  category: ProviderCategory;

  @Index()
  @Column()
  providerType: string;

  @Column()
  name: string;

  @Column({ type: 'jsonb', default: {} })
  config: Record<string, any>;

  @Column({ default: false })
  isEnabled: boolean;

  @Column({ default: false })
  isActive: boolean;

  @Column({ default: true })
  isSandbox: boolean;

  @Column({ default: 0 })
  priority: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'jsonb', nullable: true, default: [] })
  tags?: string[];

  // Health Monitoring
  @Column({ type: 'varchar', default: 'not_tested' })
  healthStatus: ProviderHealthStatus;

  @Column({ type: 'timestamp', nullable: true })
  lastTestedAt?: Date;

  @Column({ type: 'integer', nullable: true })
  lastLatencyMs?: number;

  @Column({ type: 'text', nullable: true })
  lastErrorMessage?: string;

  @Column({ type: 'integer', default: 0 })
  successCount: number;

  @Column({ type: 'integer', default: 0 })
  failureCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastSuccessAt?: Date;

  @Column({ type: 'jsonb', nullable: true, default: {} })
  statusDetails?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
