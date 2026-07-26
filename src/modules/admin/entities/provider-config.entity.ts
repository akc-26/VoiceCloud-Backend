import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

export enum ProviderCategory {
  RTC = 'rtc',
  PAYMENT = 'payment',
  FIREBASE = 'firebase',
  STORAGE = 'storage',
  EMAIL = 'email',
  SMS = 'sms',
  AI = 'ai',
}

@Entity('provider_configs')
@Unique(['category', 'providerType'])
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

  @Column({ default: true })
  isSandbox: boolean;

  @Column({ default: 0 })
  priority: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
