import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Entity('user_devices')
export class UserDevice {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: '11111111-1111-1111-1111-111111111111' })
  @Column({ type: 'varchar' })
  @Index()
  userId: string;

  @ApiProperty({ example: 'dev_iphone_14_pro_001' })
  @Column({ type: 'varchar' })
  @Index()
  deviceId: string;

  @ApiProperty({ example: 'mobile' })
  @Column({ type: 'varchar', default: 'mobile' })
  deviceType: string;

  @ApiPropertyOptional({ example: 'iPhone 14 Pro' })
  @Column({ type: 'varchar', nullable: true })
  deviceName: string;

  @ApiPropertyOptional({ example: 'iOS 17.4' })
  @Column({ type: 'varchar', nullable: true })
  osVersion: string;

  @ApiPropertyOptional({ example: '1.2.0' })
  @Column({ type: 'varchar', nullable: true })
  appVersion: string;

  @ApiPropertyOptional({ example: 'fcm_push_token_xyz_123' })
  @Column({ type: 'varchar', nullable: true })
  pushToken: string;

  @ApiProperty({ example: '2026-07-24T13:00:00Z' })
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastUsedAt: Date;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
}
