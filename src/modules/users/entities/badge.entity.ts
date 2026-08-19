import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional } from 'class-validator';

@Entity('badges')
export class Badge {
  @ApiProperty({ description: 'Unique badge ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Unique badge code/slug' })
  @Index({ unique: true })
  @Column({ type: 'varchar', unique: true })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Display name of badge' })
  @Column({ type: 'varchar' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Detailed badge description' })
  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Badge icon URL' })
  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  iconUrl?: string;

  @ApiProperty({
    description: 'Badge category (wealth, charm, event, vip, creator, system)',
  })
  @Column({ type: 'varchar', default: 'system' })
  @IsString()
  category: string;

  @ApiProperty({ description: 'Whether the badge is active and assignable' })
  @Column({ type: 'boolean', default: true })
  @IsBoolean()
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
