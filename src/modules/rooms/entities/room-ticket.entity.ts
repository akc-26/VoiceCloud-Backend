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
import { IsString, IsOptional, IsBoolean, IsEnum, IsUUID, IsNumber } from 'class-validator';
import { ScheduledRoom } from './scheduled-room.entity';
import { Room } from './room.entity';
import { User } from '../../users/entities/user.entity';
import { TicketStatus } from '../../../common/enums';

@Entity('room_tickets')
export class RoomTicket {
  @ApiProperty({ description: 'Unique ticket ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Unique human-readable ticket code' })
  @Index({ unique: true })
  @Column({ type: 'varchar', unique: true })
  @IsString()
  ticketCode: string;

  @ApiPropertyOptional({ description: 'Associated scheduled room ID' })
  @Index()
  @Column({ type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  scheduledRoomId: string;

  @ApiPropertyOptional({ description: 'Associated live room ID' })
  @Index()
  @Column({ type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  roomId: string;

  @ApiProperty({ description: 'Purchaser / holder user ID' })
  @Index()
  @Column({ type: 'uuid' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Purchase price in USD' })
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  @IsNumber()
  priceUsd: number;

  @ApiProperty({ enum: TicketStatus, default: TicketStatus.ACTIVE })
  @Index()
  @Column({ type: 'varchar', default: TicketStatus.ACTIVE })
  @IsEnum(TicketStatus)
  status: TicketStatus;

  @ApiProperty({ description: 'Is ticket active and valid' })
  @Column({ type: 'boolean', default: true })
  @IsBoolean()
  isValid: boolean;

  @ApiPropertyOptional({ description: 'Timestamp when ticket was purchased' })
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  purchasedAt: Date;

  @ApiPropertyOptional({ description: 'Timestamp when ticket was redeemed/used' })
  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  usedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => ScheduledRoom, (sr) => sr.tickets, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'scheduledRoomId' })
  scheduledRoom: ScheduledRoom;

  @ManyToOne(() => Room, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'roomId' })
  room: Room;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
