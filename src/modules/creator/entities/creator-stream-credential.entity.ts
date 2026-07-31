import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Entity('creator_stream_credentials')
export class CreatorStreamCredential {
  @ApiProperty({ description: 'Unique stream credential ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Associated Creator User ID' })
  @Index({ unique: true })
  @Column({ type: 'varchar', unique: true })
  creatorId: string;

  @ApiProperty({ description: 'Unique RTMP Stream Key' })
  @Index({ unique: true })
  @Column({ type: 'varchar', unique: true })
  streamKey: string;

  @ApiProperty({ description: 'RTMP Ingest Server URL' })
  @Column({ type: 'varchar' })
  rtmpUrl: string;

  @ApiPropertyOptional({ description: 'WebRTC Ingest Server URL' })
  @Column({ type: 'varchar', nullable: true })
  webrtcUrl: string;

  @ApiProperty({ description: 'Configured Audio Bitrate (kbps)' })
  @Column({ type: 'varchar', default: '324' })
  audioBitrate: string;

  @ApiProperty({ description: 'Stream Credential Active Status' })
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ApiProperty({ description: 'Last Stream Key Regeneration Date' })
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastRegeneratedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
