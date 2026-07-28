import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsInt, IsOptional } from 'class-validator';

@Entity('profile_visitors')
export class ProfileVisitor {
  @ApiProperty({ description: 'Unique visitor record ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Target user ID being visited' })
  @Index()
  @Column({ type: 'varchar' })
  @IsString()
  targetUserId: string;

  @ApiProperty({ description: 'Visitor user ID' })
  @Index()
  @Column({ type: 'varchar' })
  @IsString()
  visitorUserId: string;

  @ApiProperty({ description: 'Whether the visit was recorded anonymously' })
  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  isAnonymous: boolean;

  @ApiProperty({ description: 'Number of times visited' })
  @Column({ type: 'int', default: 1 })
  @IsInt()
  visitCount: number;

  @ApiPropertyOptional({
    description: 'Optional metadata for visit source/device',
  })
  @Column({ type: 'json', nullable: true })
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'Timestamp of last visit' })
  @CreateDateColumn()
  visitedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
