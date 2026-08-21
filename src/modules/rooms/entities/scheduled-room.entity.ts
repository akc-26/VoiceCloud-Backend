import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsEnum,
  IsArray,
  IsUUID,
  IsNumber,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';
import { User } from '../../users/entities/user.entity';
import { Club } from '../../clubs/entities/club.entity';
import { RoomTicket } from './room-ticket.entity';
import { Room } from './room.entity';
import { ScheduledRoomStatus, VisibilityType } from '../../../common/enums';

@Entity('scheduled_rooms')
export class ScheduledRoom {
  @ApiProperty({ description: 'Unique scheduled room ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Scheduled room title' })
  @Index()
  @Column({ type: 'varchar' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Detailed room description' })
  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  description: string;

  @ApiProperty({ description: 'Category' })
  @Index()
  @Column({ type: 'varchar', default: 'General' })
  @IsString()
  category: string;

  @ApiProperty({ description: 'Primary language' })
  @Column({ type: 'varchar', default: 'en' })
  @IsString()
  language: string;

  @ApiPropertyOptional({ description: 'Tags list' })
  @Column({ type: 'json', nullable: true })
  @IsOptional()
  @IsArray()
  tags: string[];

  @ApiPropertyOptional({ description: 'Cover image URL' })
  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  coverUrl: string;

  @ApiProperty({ description: 'Host user ID' })
  @Index()
  @Column({ type: 'uuid' })
  @IsUUID()
  hostId: string;

  @ApiPropertyOptional({ description: 'Associated Club ID' })
  @Index()
  @Column({ type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  clubId: string;

  @ApiProperty({ description: 'Scheduled start time' })
  @Index()
  @Column({ type: 'timestamptz' })
  @Type(() => Date)
  @IsDate()
  scheduledStartTime: Date;

  @ApiProperty({ description: 'Estimated duration in minutes' })
  @Column({ type: 'int', default: 60 })
  @IsInt()
  durationMinutes: number;

  @ApiProperty({ description: 'Time zone string' })
  @Column({ type: 'varchar', default: 'UTC' })
  @IsString()
  timeZone: string;

  @ApiProperty({
    enum: ScheduledRoomStatus,
    default: ScheduledRoomStatus.SCHEDULED,
  })
  @Index()
  @Column({ type: 'varchar', default: ScheduledRoomStatus.SCHEDULED })
  @IsEnum(ScheduledRoomStatus)
  status: ScheduledRoomStatus;

  @ApiProperty({ enum: VisibilityType, default: VisibilityType.PUBLIC })
  @Column({ type: 'varchar', default: VisibilityType.PUBLIC })
  @IsEnum(VisibilityType)
  visibility: VisibilityType;

  @ApiProperty({ description: 'Invite-only flag' })
  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  isInviteOnly: boolean;

  @ApiProperty({ description: 'Maximum allowed participants' })
  @Column({ type: 'int', default: 500 })
  @IsInt()
  maxParticipants: number;

  @ApiProperty({ description: 'Total RSVP count' })
  @Column({ type: 'int', default: 0 })
  @IsInt()
  rsvpCount: number;

  @ApiProperty({ description: 'Is premium / paid room' })
  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  isPremium: boolean;

  @ApiProperty({ description: 'Ticket price in USD' })
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  @IsNumber()
  ticketPriceAmount: number;

  @ApiProperty({ description: 'Currency code' })
  @Column({ type: 'varchar', default: 'USD' })
  @IsString()
  currency: string;

  @ApiPropertyOptional({ description: 'Reminder settings JSON' })
  @Column({ type: 'json', nullable: true })
  @IsOptional()
  reminderSettings: Record<string, boolean>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hostId' })
  host: User;

  @ManyToOne(() => Club, (club) => club.scheduledRooms, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'clubId' })
  club: Club;

  @OneToMany(() => RoomTicket, (ticket) => ticket.scheduledRoom)
  tickets: RoomTicket[];

  @OneToOne(() => Room, (room) => room.scheduledRoom, { nullable: true })
  liveRoom: Room;
}
