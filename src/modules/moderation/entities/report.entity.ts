import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ReportTargetType {
  USER = 'USER',
  ROOM = 'ROOM',
  MESSAGE = 'MESSAGE',
  AGENCY = 'AGENCY',
  HOST = 'HOST',
}

export enum ReportReason {
  SPAM = 'SPAM',
  ABUSE = 'ABUSE',
  HARASSMENT = 'HARASSMENT',
  FAKE_PROFILE = 'FAKE_PROFILE',
  SEXUAL_CONTENT = 'SEXUAL_CONTENT',
  VIOLENCE = 'VIOLENCE',
  OTHER = 'OTHER',
}

export enum ReportStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DISMISSED = 'DISMISSED',
}

@Entity('reports')
export class Report {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: '11111111-1111-1111-1111-111111111111' })
  @Column({ type: 'varchar' })
  @Index()
  reporterId: string;

  @ApiProperty({ enum: ReportTargetType, example: ReportTargetType.USER })
  @Column({
    type: 'varchar',
  })
  targetType: ReportTargetType;

  @ApiProperty({ example: '22222222-2222-2222-2222-222222222222' })
  @Column({ type: 'varchar' })
  @Index()
  targetId: string;

  @ApiProperty({ enum: ReportReason, example: ReportReason.HARASSMENT })
  @Column({
    type: 'varchar',
  })
  reason: ReportReason;

  @ApiPropertyOptional({
    example: 'User was sending abusive language in the voice room.',
  })
  @Column({ type: 'text', nullable: true })
  description: string;

  @ApiProperty({ enum: ReportStatus, example: ReportStatus.PENDING })
  @Column({
    type: 'varchar',
    default: ReportStatus.PENDING,
  })
  @Index()
  status: ReportStatus;

  @ApiPropertyOptional({ example: 'User issued 24-hour mute warning.' })
  @Column({ type: 'text', nullable: true })
  resolutionNotes: string;

  @ApiPropertyOptional({ example: 'admin-uuid-123' })
  @Column({ type: 'varchar', nullable: true })
  reviewedById: string;

  @ApiPropertyOptional({ example: null })
  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date | null;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
}
