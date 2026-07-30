import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { ProviderCategory } from './provider-config.entity';

@Entity('provider_config_histories')
export class ProviderConfigHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  providerConfigId: string;

  @Index()
  @Column({
    type: 'enum',
    enum: ProviderCategory,
  })
  category: ProviderCategory;

  @Column()
  providerType: string;

  @Column()
  name: string;

  @Column({ type: 'jsonb' })
  config: Record<string, any>;

  @Column({ default: false })
  isEnabled: boolean;

  @Column({ default: false })
  isActive: boolean;

  @Column({ type: 'integer', default: 1 })
  version: number;

  @Column({ nullable: true })
  changedByUserId?: string;

  @Column({ type: 'text', nullable: true })
  changeReason?: string;

  @Column({ nullable: true })
  clientIp?: string;

  @Column({ nullable: true })
  userAgent?: string;

  @CreateDateColumn()
  createdAt: Date;
}
