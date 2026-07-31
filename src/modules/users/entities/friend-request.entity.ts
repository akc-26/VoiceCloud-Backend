import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export enum FriendRequestStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

@Entity('friend_requests')
export class FriendRequest {
  @ApiProperty({ description: 'Unique friend request ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Sender user ID' })
  @Index()
  @Column({ type: 'varchar' })
  @IsString()
  senderId: string;

  @ApiProperty({ description: 'Receiver user ID' })
  @Index()
  @Column({ type: 'varchar' })
  @IsString()
  receiverId: string;

  @ApiProperty({
    enum: FriendRequestStatus,
    default: FriendRequestStatus.PENDING,
  })
  @Column({ type: 'varchar', default: FriendRequestStatus.PENDING })
  @IsString()
  status: FriendRequestStatus;

  @ApiPropertyOptional({ description: 'Optional request message' })
  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({ description: 'Optional initial category tag' })
  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  category?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
