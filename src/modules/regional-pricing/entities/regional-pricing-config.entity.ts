import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('regional_pricing_configs')
export class RegionalPricingConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar' })
  countryCode: string; // e.g., 'US', 'IN', 'GB', 'BR', 'SA'

  @Column({ type: 'varchar' })
  countryName: string;

  @Column({ type: 'varchar', default: 'USD' })
  currencyCode: string; // e.g., 'USD', 'INR', 'GBP', 'BRL', 'SAR'

  @Column({ type: 'float', default: 1.0 })
  exchangeRateToCoin: number; // 1 unit of local currency = X standard coins

  @Column({ type: 'float', default: 0.0 })
  localTaxPercentage: number; // e.g. 18.0 for 18% GST

  @Column({ type: 'float', default: 0.7 })
  creatorEarningShareRate: number; // e.g. 0.70 = 70% share to creator

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
