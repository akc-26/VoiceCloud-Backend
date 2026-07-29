import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('gifts')
export class Gift {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  description: string;

  // Gift Type: static, animated, svga, lottie, video, premium, limited, seasonal, country_specific, hidden
  @Column({ type: 'varchar', default: 'static' })
  type: string;

  // Gift Rarity: common, rare, epic, legendary, mythic
  @Column({ type: 'varchar', default: 'common' })
  rarity: string;

  @Index()
  @Column({ type: 'varchar', default: 'Popular' })
  category: string;

  @Column({ type: 'int', default: 10 })
  coinPrice: number;

  @Column({ type: 'float', default: 70.0 })
  creatorEarningsPercentage: number;

  @Column({ type: 'float', default: 10.0 })
  agencyEarningsPercentage: number;

  @Column({ type: 'varchar', nullable: true })
  iconUrl: string;

  @Column({ type: 'varchar', nullable: true })
  animationUrl: string;

  @Column({ type: 'varchar', nullable: true })
  previewUrl: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isArchived: boolean;

  @Column({ type: 'boolean', default: false })
  isHidden: boolean;

  @Column({ type: 'boolean', default: false })
  isVipOnly: boolean;

  @Column({ type: 'boolean', default: false })
  isHostExclusive: boolean;

  @Column({ type: 'boolean', default: false })
  isAgencyExclusive: boolean;

  @Column({ type: 'json', nullable: true })
  allowedCountries: string[]; // e.g. ['US', 'IN'] or null/empty for all

  @Column({ type: 'timestamp', nullable: true })
  availableFrom: Date;

  @Column({ type: 'timestamp', nullable: true })
  availableUntil: Date;

  @Column({ type: 'boolean', default: false })
  isLimitedEdition: boolean;

  @Column({ type: 'int', nullable: true })
  totalStock: number;

  @Column({ type: 'int', nullable: true })
  remainingStock: number;

  @Column({ type: 'boolean', default: false })
  isSeasonal: boolean;

  @Column({ type: 'varchar', nullable: true })
  seasonTag: string; // e.g., 'summer_2026', 'ramadan', 'christmas'

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'json', nullable: true })
  tags: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
