import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AnnouncementTarget {
  GLOBAL = 'GLOBAL',
  VIP = 'VIP',
  AGENCY = 'AGENCY',
  HOST = 'HOST',
}

export enum AnnouncementPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

@Entity('announcements')
export class Announcement {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'Platform Scheduled Maintenance' })
  @Column({ type: 'varchar' })
  title: string;

  @ApiProperty({
    example:
      'VoiceCloud services will undergo maintenance on Sunday from 02:00 to 04:00 UTC.',
  })
  @Column({ type: 'text' })
  content: string;

  @ApiPropertyOptional({
    example: 'https://cdn.voicecloud.com/announcements/banner.jpg',
    nullable: true,
  })
  @Column({ type: 'varchar', nullable: true })
  mediaUrl: string;

  @ApiProperty({ enum: AnnouncementTarget, example: AnnouncementTarget.GLOBAL })
  @Column({
    type: 'varchar',
    default: AnnouncementTarget.GLOBAL,
  })
  @Index()
  targetAudience: AnnouncementTarget;

  @ApiProperty({
    enum: AnnouncementPriority,
    example: AnnouncementPriority.HIGH,
  })
  @Column({
    type: 'varchar',
    default: AnnouncementPriority.MEDIUM,
  })
  priority: AnnouncementPriority;

  @ApiPropertyOptional({ example: null, nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  scheduledAt: Date | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  @ApiProperty({ example: true })
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ApiProperty({ example: 'admin-uuid-123' })
  @Column({ type: 'varchar' })
  createdById: string;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
}
