import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsArray } from 'class-validator';

@Entity('ranking_snapshots')
export class RankingSnapshot {
  @ApiProperty({ description: 'Unique snapshot ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description:
      'Category (users, hosts, agencies, clubs, rooms, vip, creators, trending)',
  })
  @Index()
  @Column({ type: 'varchar' })
  @IsString()
  category: string;

  @ApiPropertyOptional({
    description: 'Sub-metric (e.g. total_coins, revenue)',
  })
  @Index()
  @Column({ type: 'varchar', default: 'default' })
  @IsString()
  metric: string;

  @ApiProperty({ description: 'Timeframe (daily, weekly, monthly)' })
  @Index()
  @Column({ type: 'varchar' })
  @IsString()
  timeframe: string;

  @ApiProperty({
    description: 'Period identifier e.g. 2026-07-29, 2026-W30, 2026-07',
  })
  @Index()
  @Column({ type: 'varchar' })
  @IsString()
  periodIdentifier: string;

  @ApiPropertyOptional({
    description: 'Country filter code e.g. US, IN, GLOBAL',
  })
  @Index()
  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  country: string;

  @ApiPropertyOptional({ description: 'State or province filter code' })
  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  state: string;

  @ApiProperty({ description: 'Snapshot items JSON data' })
  @Column({ type: 'json' })
  @IsArray()
  rankingsData: Record<string, unknown>[];

  @ApiProperty({ description: 'Total items in snapshot' })
  @Column({ type: 'int', default: 0 })
  @IsInt()
  totalCount: number;

  @CreateDateColumn()
  createdAt: Date;
}
