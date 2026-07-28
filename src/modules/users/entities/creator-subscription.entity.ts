import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { User } from './user.entity';
import { CreatorPlan } from './creator-plan.entity';
import { SubscriptionStatus } from '../../../common/enums';

@Entity('creator_subscriptions')
export class CreatorSubscription {
  @ApiProperty({ description: 'Unique creator subscription ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Subscriber user ID' })
  @Index('IDX_creator_subscriptions_subscriberId')
  @Column({ type: 'uuid' })
  @IsUUID()
  subscriberId: string;

  @ApiProperty({ description: 'Creator user ID' })
  @Index('IDX_creator_subscriptions_creatorId')
  @Column({ type: 'uuid' })
  @IsUUID()
  creatorId: string;

  @ApiProperty({ description: 'Creator plan ID' })
  @Index('IDX_creator_subscriptions_planId')
  @Column({ type: 'uuid' })
  @IsUUID()
  planId: string;

  @ApiProperty({ enum: SubscriptionStatus, default: SubscriptionStatus.ACTIVE })
  @Index('IDX_creator_subscriptions_status')
  @Column({ type: 'varchar', default: SubscriptionStatus.ACTIVE })
  @IsEnum(SubscriptionStatus)
  status: SubscriptionStatus;

  @ApiProperty({ description: 'Auto renewal active indicator' })
  @Column({ type: 'boolean', default: true })
  @IsBoolean()
  autoRenew: boolean;

  @CreateDateColumn()
  startedAt: Date;

  @ApiPropertyOptional({ description: 'Subscription expiration date' })
  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  expiresAt: Date;

  @ApiPropertyOptional({ description: 'Subscription cancellation date' })
  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  cancelledAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subscriberId' })
  subscriber: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'creatorId' })
  creator: User;

  @ManyToOne(() => CreatorPlan, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'planId' })
  plan: CreatorPlan;
}
