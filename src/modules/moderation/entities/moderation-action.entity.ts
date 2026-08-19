import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ModerationActionType {
  WARN = 'WARN',
  MUTE = 'MUTE',
  SUSPEND = 'SUSPEND',
  BAN = 'BAN',
  UNBAN = 'UNBAN',
  UNSUSPEND = 'UNSUSPEND',
  APPROVE_REPORT = 'APPROVE_REPORT',
  DISMISS_REPORT = 'DISMISS_REPORT',
}

@Entity('moderation_actions')
export class ModerationAction {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: '22222222-2222-2222-2222-222222222222' })
  @Column({ type: 'varchar' })
  @Index()
  targetUserId: string;

  @ApiProperty({ example: '11111111-1111-1111-1111-111111111111' })
  @Column({ type: 'varchar' })
  @Index()
  moderatorId: string;

  @ApiProperty({
    enum: ModerationActionType,
    example: ModerationActionType.SUSPEND,
  })
  @Column({
    type: 'varchar',
  })
  actionType: ModerationActionType;

  @ApiProperty({ example: 'Repeated harassment violations' })
  @Column({ type: 'text' })
  reason: string;

  @ApiPropertyOptional({
    example: 1440,
    description: 'Duration in minutes (e.g. 1440 = 24 hours)',
  })
  @Column({ type: 'int', nullable: true })
  durationMinutes: number | null;

  @ApiPropertyOptional({ example: null })
  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  @ApiProperty({ example: false })
  @Column({ type: 'boolean', default: false })
  isPermanent: boolean;

  @ApiPropertyOptional({ example: 'Reviewed by admin team' })
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;
}
