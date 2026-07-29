import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('otp_verifications')
export class OtpVerification {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: '+1234567890' })
  @Index()
  @Column({ type: 'varchar' })
  phoneNumber: string;

  @ApiProperty({ example: '123456' })
  @Column({ type: 'varchar' })
  otpCode: string;

  @ApiProperty({ example: 0 })
  @Column({ type: 'int', default: 0 })
  attempts: number;

  @ApiProperty({ example: false })
  @Column({ type: 'boolean', default: false })
  isVerified: boolean;

  @ApiProperty()
  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
}
