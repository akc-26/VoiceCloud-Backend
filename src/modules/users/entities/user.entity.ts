import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', unique: true })
  username: string;

  @Column({ type: 'varchar' })
  displayName: string;

  @Column({ type: 'varchar', unique: true })
  email: string;

  @Column({ type: 'varchar', nullable: true })
  avatarUrl: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ type: 'varchar', nullable: true })
  gender: string;

  @Column({ type: 'varchar', nullable: true })
  country: string;

  @Column({ type: 'varchar', default: 'en' })
  preferredLanguage: string;

  @Column({ type: 'json', nullable: true })
  interests: string[];

  @Column({ type: 'json', nullable: true })
  socialLinks: Record<string, string>;

  @Column({ type: 'varchar', nullable: true })
  hostBadge: string;

  @Column({ type: 'varchar', nullable: true })
  agencyBadge: string;

  @Column({ type: 'varchar', nullable: true })
  vipBadge: string;

  @Column({ type: 'int', default: 0 })
  profileCompletion: number;

  @Column({ type: 'boolean', default: false })
  isOnline: boolean;

  @Column({ type: 'boolean', default: false })
  isVerified: boolean;

  @Column({ type: 'boolean', default: false })
  isVip: boolean;

  @Column({ type: 'int', default: 0 })
  followersCount: number;

  @Column({ type: 'int', default: 0 })
  followingCount: number;

  @Column({ type: 'int', default: 0 })
  popularityScore: number;

  @Column({ type: 'timestamp', nullable: true })
  lastActiveAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
