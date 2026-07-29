import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, Min } from 'class-validator';
import { User } from '../../users/entities/user.entity';
import { WalletTransaction } from './wallet-transaction.entity';

const bigintTransformer = {
  to: (value: number) => value,
  from: (value: string | number) =>
    value === null || value === undefined ? 0 : Number(value),
};

@Entity('wallet_balances')
export class WalletBalance {
  @ApiProperty({ description: 'Unique wallet balance ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'User ID owner of this wallet' })
  @Column({ type: 'uuid', unique: true })
  @Index('IDX_wallet_balances_userId', { unique: true })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Coin balance' })
  @Column({ type: 'bigint', default: 0, transformer: bigintTransformer })
  @Min(0)
  coinBalance: number;

  @ApiProperty({ description: 'Diamond balance' })
  @Column({ type: 'bigint', default: 0, transformer: bigintTransformer })
  @Min(0)
  diamondBalance: number;

  @ApiProperty({ description: 'Bonus balance' })
  @Column({ type: 'bigint', default: 0, transformer: bigintTransformer })
  @Min(0)
  bonusBalance: number;

  @ApiProperty({ description: 'Promotional balance' })
  @Column({ type: 'bigint', default: 0, transformer: bigintTransformer })
  @Min(0)
  promotionalBalance: number;

  @ApiProperty({ description: 'Frozen balance' })
  @Column({ type: 'bigint', default: 0, transformer: bigintTransformer })
  @Min(0)
  frozenBalance: number;

  @ApiProperty({ description: 'Withdrawable balance' })
  @Column({ type: 'bigint', default: 0, transformer: bigintTransformer })
  @Min(0)
  withdrawableBalance: number;

  @ApiProperty({ description: 'Total coins purchased' })
  @Column({ type: 'bigint', default: 0, transformer: bigintTransformer })
  @Min(0)
  totalCoinsPurchased: number;

  @ApiProperty({ description: 'Total coins spent' })
  @Column({ type: 'bigint', default: 0, transformer: bigintTransformer })
  @Min(0)
  totalCoinsSpent: number;

  @ApiProperty({ description: 'Total diamonds earned' })
  @Column({ type: 'bigint', default: 0, transformer: bigintTransformer })
  @Min(0)
  totalDiamondsEarned: number;

  @ApiProperty({ description: 'Total diamonds withdrawn' })
  @Column({ type: 'bigint', default: 0, transformer: bigintTransformer })
  @Min(0)
  totalDiamondsWithdrawn: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => User, (user) => user.walletBalance, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => WalletTransaction, (transaction) => transaction.wallet)
  transactions: WalletTransaction[];
}
