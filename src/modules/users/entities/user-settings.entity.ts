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

  @ApiPropertyOptional({
    description: 'Audio quality bitrate preset (e.g. 324, 256, 128)',
  })
  @Column({ type: 'varchar', default: '324' })
  @IsOptional()
  @IsString()
  audioPreset: string;

  @ApiPropertyOptional({ description: 'Enable noise suppression' })
  @Column({ type: 'boolean', default: true })
  @IsOptional()
  @IsBoolean()
  noiseSuppression: boolean;

  @ApiPropertyOptional({ description: 'Enable echo cancellation' })
  @Column({ type: 'boolean', default: true })
  @IsOptional()
  @IsBoolean()
  echoCancellation: boolean;

  @ApiPropertyOptional({ description: 'Enable Automatic Gain Control (AGC)' })
  @Column({ type: 'boolean', default: true })
  @IsOptional()
  @IsBoolean()
  agc: boolean;

  @ApiPropertyOptional({ description: 'Enable mic queue management' })
  @Column({ type: 'boolean', default: true })
  @IsOptional()
  @IsBoolean()
  micQueue: boolean;

  @ApiPropertyOptional({ description: 'Enable toxicity chat filter' })
  @Column({ type: 'boolean', default: true })
  @IsOptional()
  @IsBoolean()
  toxicityFilter: boolean;

  @ApiPropertyOptional({ description: 'Restrict chat to followers only' })
  @Column({ type: 'boolean', default: false })
  @IsOptional()
  @IsBoolean()
  followersOnlyChat: boolean;

  @ApiPropertyOptional({ description: 'Enable email alerts' })
  @Column({ type: 'boolean', default: true })
  @IsOptional()
  @IsBoolean()
  emailAlerts: boolean;

  @ApiPropertyOptional({
    description: 'Preferred streaming protocol (rtmp, webrtc)',
  })
  @Column({ type: 'varchar', default: 'rtmp' })
  @IsOptional()
  @IsString()
  preferredProtocol: string;

  @ApiPropertyOptional({
    description: 'Latency mode (ultra_low, low, standard)',
  })
  @Column({ type: 'varchar', default: 'ultra_low' })
  @IsOptional()
  @IsString()
  latencyMode: string;

  @ApiPropertyOptional({ description: 'Enable stream recording preference' })
  @Column({ type: 'boolean', default: true })
  @IsOptional()
  @IsBoolean()
  recordingPreference: boolean;

  @ApiPropertyOptional({ description: 'Additional streaming preferences' })
  @Column({ type: 'json', nullable: true })
  @IsOptional()
  @IsObject()
  streamingPreferences: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
