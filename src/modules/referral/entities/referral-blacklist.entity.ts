import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BlacklistType } from '../enums/referral.enums';

@Entity('referral_blacklists')
export class ReferralBlacklist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: BlacklistType,
  })
  type: BlacklistType;

  @Column('varchar')
  value: string;

  @Column('text', { nullable: true })
  reason: string | null;

  @Column('varchar', { nullable: true })
  createdBy: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
