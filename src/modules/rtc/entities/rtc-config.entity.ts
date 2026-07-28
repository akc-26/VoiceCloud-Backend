import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum RtcProviderType {
  AGORA = 'agora',
  LIVEKIT = 'livekit',
  ZEGOCLOUD = 'zegocloud',
  DEFAULT_MOCK = 'default_mock',
}

@Entity('rtc_configs')
export class RtcConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: RtcProviderType,
    default: RtcProviderType.DEFAULT_MOCK,
  })
  activeProvider: RtcProviderType;

  @Column({ type: 'varchar', nullable: true })
  appId: string;

  @Column({ type: 'text', nullable: true })
  appCertificate: string;

  @Column({ type: 'varchar', nullable: true })
  apiKey: string;

  @Column({ type: 'text', nullable: true })
  secret: string;

  @Column({ type: 'varchar', default: 'global' })
  region: string;

  @Column({ type: 'int', default: 3600 }) // Token expiration in seconds
  tokenExpiration: number;

  @Column({ type: 'boolean', default: false })
  encryptionEnabled: boolean;

  @Column({ type: 'varchar', default: 'aes-128-xts' })
  encryptionMode: string;

  @Column({ type: 'text', nullable: true })
  encryptionKey: string;

  @Column({ type: 'boolean', default: false })
  recordingEnabled: boolean;

  @Column({ type: 'boolean', default: false })
  cloudRecording: boolean;

  @Column({ type: 'boolean', default: true })
  audioEnabled: boolean;

  @Column({ type: 'boolean', default: false })
  videoEnabled: boolean;

  @Column({ type: 'jsonb', nullable: true })
  cdnSettings: Record<string, unknown>;

  @Column({ type: 'varchar', nullable: true })
  callbackUrl: string;

  @Column({ type: 'varchar', nullable: true })
  webhookSecret: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
