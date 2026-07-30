import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Entity('user_sessions')
export class UserSession {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: '11111111-1111-1111-1111-111111111111' })
  @Column({ type: 'varchar' })
  @Index()
  userId: string;

  @ApiPropertyOptional({ example: 'dev_iphone_14_pro_001' })
  @Column({ type: 'varchar', nullable: true })
  @Index()
  deviceId: string;

  @ApiProperty({ example: 'sess_99382173123981' })
  @Column({ type: 'varchar', unique: true })
  @Index()
  sessionToken: string;

  @ApiPropertyOptional({ example: 'refresh_hash_abc123' })
  @Column({ type: 'varchar', nullable: true })
  refreshTokenHash: string;

  @ApiProperty({ example: 'mobile' })
  @Column({ type: 'varchar', default: 'web' })
  deviceType: string;

  @ApiPropertyOptional({ example: 'iPhone 14 Pro' })
  @Column({ type: 'varchar', nullable: true })
  deviceName: string;

  @ApiPropertyOptional({ example: '192.168.1.1' })
  @Column({ type: 'varchar', nullable: true })
  ipAddress: string;

  @ApiPropertyOptional({ example: 'Mozilla/5.0...' })
  @Column({ type: 'text', nullable: true })
  userAgent: string;

  @ApiProperty({ example: true })
  @Column({ type: 'boolean', default: true })
  isOnline: boolean;

  @ApiProperty({ example: 'ACTIVE' })
  @Column({ type: 'varchar', default: 'ACTIVE' })
  status: string;

  @ApiProperty({ example: '2026-07-24T13:00:00Z' })
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastActiveAt: Date;

  @ApiProperty({ example: '2026-08-24T13:00:00Z' })
  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
}
