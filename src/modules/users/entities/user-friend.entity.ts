import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

@Entity('user_friends')
@Unique(['userId', 'friendId'])
export class UserFriend {
  @ApiProperty({ description: 'Unique user friend record ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'User ID' })
  @Index()
  @Column({ type: 'varchar' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Friend User ID' })
  @Index()
  @Column({ type: 'varchar' })
  @IsString()
  friendId: string;

  @ApiPropertyOptional({ description: 'Custom friend category (e.g., close_friends, family, work)' })
  @Column({ type: 'varchar', nullable: true, default: 'friends' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Custom alias/nickname for friend' })
  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  alias?: string;

  @CreateDateColumn()
  createdAt: Date;
}
