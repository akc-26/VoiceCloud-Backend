import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Entity('user_connection_history')
export class UserConnectionHistory {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: '11111111-1111-1111-1111-111111111111' })
  @Column({ type: 'varchar' })
  @Index()
  userId: string;

  @ApiPropertyOptional({ example: 'sess_99382173123981' })
  @Column({ type: 'varchar', nullable: true })
  sessionId: string;

  @ApiPropertyOptional({ example: 'dev_iphone_14_pro_001' })
  @Column({ type: 'varchar', nullable: true })
  deviceId: string;

  @ApiProperty({ example: 'LOGIN' })
  @Column({ type: 'varchar' })
  action: string;

  @ApiPropertyOptional({ example: 'PHONE_OTP' })
  @Column({ type: 'varchar', nullable: true })
  loginMethod: string;

  @ApiPropertyOptional({ example: '192.168.1.1' })
  @Column({ type: 'varchar', nullable: true })
  ipAddress: string;

  @ApiPropertyOptional({ example: 'United States' })
  @Column({ type: 'varchar', nullable: true })
  country: string;

  @ApiPropertyOptional({ example: 'Android' })
  @Column({ type: 'varchar', nullable: true })
  platform: string;

  @ApiPropertyOptional({ example: 'Mozilla/5.0...' })
  @Column({ type: 'text', nullable: true })
  userAgent: string;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;
}
