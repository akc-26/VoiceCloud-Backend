import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsEnum, IsNumber, IsOptional } from 'class-validator';
import { User } from '../../users/entities/user.entity';
import { CreatorSettlementStatus } from '../../../common/enums';

const decimalTransformer = {
  to: (value: number) => value,
  from: (value: string | number) =>
    value === null || value === undefined ? 0 : Number(value),
};

const bigintTransformer = {
  to: (value: number) => value,
  from: (value: string | number) =>
    value === null || value === undefined ? 0 : Number(value),
};

@Entity('creator_settlements')
export class CreatorSettlement {
  @ApiProperty({ description: 'Unique creator settlement ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Creator user ID' })
  @Index('IDX_creator_settlements_creatorId')
  @Column({ type: 'uuid' })
  @IsUUID()
  creatorId: string;

  @ApiPropertyOptional({ description: 'Settlement period start date' })
  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  periodStart: Date;

  @ApiPropertyOptional({ description: 'Settlement period end date' })
  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  periodEnd: Date;

  @ApiProperty({ description: 'Total gifts received count/diamonds' })
  @Column({ type: 'bigint', default: 0, transformer: bigintTransformer })
  totalGiftsReceived: number;

  @ApiProperty({ description: 'Total room earnings diamonds' })
  @Column({ type: 'bigint', default: 0, transformer: bigintTransformer })
  totalRoomEarnings: number;

  @ApiProperty({ description: 'Gross diamond earnings' })
  @Column({ type: 'bigint', default: 0, transformer: bigintTransformer })
  grossDiamondEarnings: number;

  @ApiProperty({ description: 'Platform fee share percentage' })
  @Column({
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: 20.0,
    transformer: decimalTransformer,
  })
  @IsNumber()
  platformFeeShare: number;

  @ApiProperty({ description: 'Agency fee share percentage' })
  @Column({
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: 0.0,
    transformer: decimalTransformer,
  })
  @IsNumber()
  agencyFeeShare: number;

  @ApiProperty({ description: 'Net diamonds settled' })
  @Column({ type: 'bigint', default: 0, transformer: bigintTransformer })
  netDiamondsSettled: number;

  @ApiProperty({ description: 'Payout amount in USD' })
  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  @IsNumber()
  payoutAmountUsd: number;

  @ApiProperty({
    enum: CreatorSettlementStatus,
    default: CreatorSettlementStatus.PENDING,
  })
  @Index('IDX_creator_settlements_status')
  @Column({ type: 'varchar', default: CreatorSettlementStatus.PENDING })
  @IsEnum(CreatorSettlementStatus)
  status: CreatorSettlementStatus;

  @ApiPropertyOptional({ description: 'Timestamp when settled' })
  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  settledAt: Date;

  @CreateDateColumn()
  @Index('IDX_creator_settlements_createdAt')
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'creatorId' })
  creator: User;
}
