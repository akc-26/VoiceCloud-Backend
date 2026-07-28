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

  @Column({ type: 'varchar', default: 'General' })
  category: string;

  @Column({ type: 'int', default: 10 })
  coinPrice: number;

  @Column({ type: 'varchar', nullable: true })
  iconUrl: string;

  @Column({ type: 'varchar', nullable: true })
  animationUrl: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
