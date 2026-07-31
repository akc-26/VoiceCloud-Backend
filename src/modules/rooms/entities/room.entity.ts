import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsUUID,
  IsNumber,
} from 'class-validator';
import { Club } from '../../clubs/entities/club.entity';
import { ScheduledRoom } from './scheduled-room.entity';

@Entity('rooms')
export class Room {
  @ApiProperty({ description: 'Unique room ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Room title' })
  @Index()
  @Column({ type: 'varchar' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Room description' })
  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  description: string;

  @ApiProperty({ description: 'Host user ID' })
  @Column({ type: 'varchar' })
  @IsString()
  hostId: string;

  @ApiPropertyOptional({ description: 'Cover image URL' })
  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  coverUrl: string;

  @ApiProperty({ description: 'Room locked state' })
  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  isLocked: boolean;

  @ApiProperty({ description: 'Room live state' })
  @Column({ type: 'boolean', default: true })
  @IsBoolean()
  isLive: boolean;

  @ApiProperty({ description: 'Room Lifecycle Status (offline, live, paused, ended)' })
  @Column({ type: 'varchar', default: 'offline' })
  @IsString()
  status: string;

  @ApiProperty({ description: 'Audio quality profile' })
  @Column({ type: 'varchar', default: '324kbps Ultra HD' })
  @IsString()
  audioQuality: string;

  @ApiPropertyOptional({ description: 'Broadcast start timestamp' })
  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  startedAt: Date;

  @ApiPropertyOptional({ description: 'Broadcast end timestamp' })
  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  endedAt: Date;

  @ApiProperty({ description: 'Language' })
  @Column({ type: 'varchar', default: 'en' })
  @IsString()
  language: string;

  @ApiProperty({ description: 'Category' })
  @Column({ type: 'varchar', default: 'General' })
  @IsString()
  category: string;

  @ApiProperty({ description: 'Listener count' })
  @Column({ type: 'int', default: 0 })
  @IsInt()
  listenerCount: number;

  @ApiProperty({ description: 'Speaker count' })
  @Column({ type: 'int', default: 0 })
  @IsInt()
  speakerCount: number;

  @ApiProperty({ description: 'Gift activity total' })
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  @IsNumber()
  giftActivity: number;

  @ApiProperty({ description: 'Popularity score' })
  @Column({ type: 'int', default: 0 })
  @IsInt()
  popularityScore: number;

  @ApiPropertyOptional({ description: 'Associated Scheduled Room ID' })
  @Index()
  @Column({ type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  scheduledRoomId: string;

  @ApiPropertyOptional({ description: 'Associated Club ID' })
  @Index()
  @Column({ type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  clubId: string;

  @ApiProperty({ description: 'Is room premium / paid' })
  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  isPremium: boolean;

  @ApiProperty({ description: 'Is ticket required to join' })
  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  isTicketRequired: boolean;

  @ApiProperty({ description: 'Is room subscriber only' })
  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  isSubscriberOnly: boolean;

  @ApiProperty({ description: 'Is room invite only' })
  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  isInviteOnly: boolean;

  @ApiProperty({ description: 'Is room verified users only' })
  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  isVerifiedOnly: boolean;

  @ApiProperty({ description: 'Ticket price in USD' })
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  @IsNumber()
  ticketPriceAmount: number;

  @ApiProperty({ description: 'Currency code' })
  @Column({ type: 'varchar', default: 'USD' })
  @IsString()
  currency: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => Club, (club) => club.rooms, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'clubId' })
  club: Club;

  @OneToOne(() => ScheduledRoom, (sr) => sr.liveRoom, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'scheduledRoomId' })
  scheduledRoom: ScheduledRoom;
}
