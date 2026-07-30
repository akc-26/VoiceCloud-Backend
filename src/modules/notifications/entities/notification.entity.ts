import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum NotificationType {
  IN_APP = 'IN_APP',
  SYSTEM = 'SYSTEM',
  ROOM_INVITATION = 'ROOM_INVITATION',
  GIFT = 'GIFT',
  VIP = 'VIP',
  AGENCY = 'AGENCY',
  HOST_APPROVAL = 'HOST_APPROVAL',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
}

@Entity('notifications')
export class Notification {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: '11111111-1111-1111-1111-111111111111' })
  @Column({ type: 'varchar' })
  @Index()
  userId: string;

  @ApiProperty({
    example: '22222222-2222-2222-2222-222222222222',
    nullable: true,
  })
  @Column({ type: 'varchar', nullable: true })
  senderId: string | null;

  @ApiProperty({ enum: NotificationType, example: NotificationType.IN_APP })
  @Column({
    type: 'varchar',
    default: NotificationType.IN_APP,
  })
  type: NotificationType;

  @ApiProperty({ example: 'New Room Invitation' })
  @Column({ type: 'varchar' })
  title: string;

  @ApiProperty({
    example: 'You have been invited to join the VIP Lounge room.',
  })
  @Column({ type: 'text' })
  message: string;

  @ApiProperty({ example: { roomId: 'room-123' }, nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, unknown> | null;

  @ApiProperty({ example: false })
  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @ApiProperty({ example: null, nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  readAt: Date | null;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
}
