import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Entity('stream_key_audit_logs')
export class StreamKeyAuditLog {
  @ApiProperty({ description: 'Audit log ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Associated Creator User ID' })
  @Index()
  @Column({ type: 'varchar' })
  creatorId: string;

  @ApiProperty({ description: 'Action performed (GENERATED, REGENERATED, REVOKED)' })
  @Column({ type: 'varchar' })
  action: string;

  @ApiPropertyOptional({ description: 'Masked previous stream key' })
  @Column({ type: 'varchar', nullable: true })
  oldStreamKeyMasked?: string;

  @ApiProperty({ description: 'Masked new stream key' })
  @Column({ type: 'varchar' })
  newStreamKeyMasked: string;

  @ApiPropertyOptional({ description: 'IP address of requestor' })
  @Column({ type: 'varchar', nullable: true })
  ipAddress?: string;

  @CreateDateColumn()
  createdAt: Date;
}
