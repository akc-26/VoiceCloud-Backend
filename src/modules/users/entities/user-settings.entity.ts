import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsObject } from 'class-validator';

@Entity('user_settings')
export class UserSettings {
  @ApiProperty({ description: 'Unique settings ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Associated User ID' })
  @Index({ unique: true })
  @Column({ type: 'varchar', unique: true })
  @IsString()
  userId: string;

  @ApiProperty({
    description:
      'Who can send direct messages (everyone, following, friends, none)',
  })
  @Column({ type: 'varchar', default: 'everyone' })
  @IsString()
  messagingPermission: string;

  @ApiProperty({
    description: 'Who can follow user (everyone, approval, none)',
  })
  @Column({ type: 'varchar', default: 'everyone' })
  @IsString()
  followPermission: string;

  @ApiProperty({
    description: 'Who can invite user to rooms/clubs (everyone, friends, none)',
  })
  @Column({ type: 'varchar', default: 'everyone' })
  @IsString()
  invitationPermission: string;

  @ApiProperty({
    description: 'Who can see profile visitor logs (everyone, friends, none)',
  })
  @Column({ type: 'varchar', default: 'everyone' })
  @IsString()
  visitorPermission: string;

  @ApiProperty({ description: 'Allow system to track profile visitors' })
  @Column({ type: 'boolean', default: true })
  @IsBoolean()
  allowVisitorTracking: boolean;

  @ApiProperty({ description: 'Visit other profiles anonymously by default' })
  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  anonymousVisiting: boolean;

  @ApiPropertyOptional({ description: 'Notification channel preferences' })
  @Column({ type: 'json', nullable: true })
  @IsOptional()
  @IsObject()
  notificationPreferences: Record<string, boolean>;

  @ApiProperty({ description: 'Preferred application language code' })
  @Column({ type: 'varchar', default: 'en' })
  @IsString()
  language: string;

  @ApiProperty({ description: 'Preferred theme (light, dark, system)' })
  @Column({ type: 'varchar', default: 'light' })
  @IsString()
  theme: string;

  @ApiProperty({ description: 'User timezone string' })
  @Column({ type: 'varchar', default: 'UTC' })
  @IsString()
  timezone: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
