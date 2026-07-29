import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('vip_tiers')
export class VipTier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar' })
  name: string;

  @Index()
  @Column({ type: 'int', default: 1 })
  level: number; // 1..10

  @Column({ type: 'varchar', nullable: true })
  badge: string; // Badge icon/URL

  @Column({ type: 'varchar', nullable: true })
  badgeUrl: string; // Alias for backward compatibility

  @Column({ type: 'varchar', nullable: true })
  icon: string; // Icon URL

  @Column({ type: 'varchar', default: '#FFD700' })
  colorTheme: string; // Hex color code or theme name

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  monthlyPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  quarterlyPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  yearlyPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: number; // For backward compatibility with legacy VipPlan

  @Column({ type: 'int', default: 30 })
  durationDays: number; // Legacy field

  @Column({ type: 'json', nullable: true })
  benefits: string[]; // List of benefit keys or descriptions

  @Column({ type: 'boolean', default: true })
  activationStatus: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean; // Alias for backward compatibility

  @Column({ type: 'varchar', nullable: true })
  description: string;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

export { VipTier as VipPlan };
