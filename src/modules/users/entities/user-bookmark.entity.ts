import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject } from 'class-validator';
import { User } from './user.entity';

@Entity('user_bookmarks')
@Unique('UQ_user_bookmarks_user_target', ['userId', 'targetType', 'targetId'])
@Index('IDX_user_bookmarks_userId', ['userId'])
@Index('IDX_user_bookmarks_target', ['targetType', 'targetId'])
export class UserBookmark {
  @ApiProperty({ description: 'Unique bookmark ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'ID of the user who created the bookmark' })
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (user) => user.bookmarks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ApiProperty({ description: 'Type of item bookmarked (e.g. room, scheduled_room, club, user)' })
  @Column({ type: 'varchar' })
  @IsString()
  targetType: string;

  @ApiProperty({ description: 'ID of the bookmarked target item' })
  @Column({ type: 'varchar' })
  @IsString()
  targetId: string;

  @ApiPropertyOptional({ description: 'Cached or custom title for the bookmark' })
  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Cached or custom description' })
  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Image or thumbnail URL for the bookmarked item' })
  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Additional metadata payload for the bookmark' })
  @Column({ type: 'json', nullable: true })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
