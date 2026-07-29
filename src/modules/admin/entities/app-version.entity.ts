import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

export enum AppPlatform {
  ANDROID = 'android',
  IOS = 'ios',
  WEB = 'web',
  DESKTOP = 'desktop',
}

@Entity('app_versions')
@Unique(['platform', 'latestVersion'])
export class AppVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({
    type: 'enum',
    enum: AppPlatform,
  })
  platform: AppPlatform;

  @Column()
  latestVersion: string;

  @Column()
  minSupportedVersion: string;

  @Column({ default: false })
  forceUpdate: boolean;

  @Column({ nullable: true, type: 'text' })
  releaseNotes?: string;

  @Column({ nullable: true })
  downloadUrl?: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  releaseDate: Date;

  @Column({ default: false })
  isDeprecated: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
