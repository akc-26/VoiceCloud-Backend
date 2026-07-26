import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('feature_flags')
export class FeatureFlag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ unique: true })
  key: string;

  @Column()
  name: string;

  @Column({ nullable: true, type: 'text' })
  description?: string;

  @Column({ default: true })
  isEnabled: boolean;

  @Column({ type: 'jsonb', nullable: true })
  targetRules?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
