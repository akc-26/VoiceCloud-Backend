import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToOne,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsEnum,
} from 'class-validator';
import { VerificationStatus } from '../../../common/enums';
import { WalletBalance } from '../../wallet/entities/wallet-balance.entity';

@Entity('users')
export class User {
  @ApiProperty({ description: 'Unique user ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Unique username' })
  @Index()
  @Column({ type: 'varchar', unique: true })
  @IsString()
  username: string;

  @ApiProperty({ description: 'User display name' })
  @Column({ type: 'varchar' })
  @IsString()
  displayName: string;

  @ApiProperty({ description: 'Unique email address' })
  @Column({ type: 'varchar', unique: true, nullable: true })
  @IsOptional()
  @IsString()
  email: string;

  @ApiPropertyOptional({ description: 'Phone number in E.164 format' })
  @Index()
  @Column({ type: 'varchar', unique: true, nullable: true })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({ description: 'Whether phone number is verified' })
  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  phoneVerified: boolean;

  @ApiProperty({ description: 'Whether user is a guest account' })
  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  isGuest: boolean;

  @ApiProperty({
    description: 'User platform role (e.g. USER, GUEST, ADMIN, SUPER_ADMIN)',
  })
  @Column({ type: 'varchar', default: 'USER' })
  @IsString()
  role: string;

  @ApiPropertyOptional({ description: 'Unique user referral code' })
  @Index()
  @Column({ type: 'varchar', unique: true, nullable: true })
  @IsOptional()
  @IsString()
  referralCode?: string;

  @ApiPropertyOptional({ description: 'Referrer user ID' })
  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  referredByUserId?: string;

  @ApiPropertyOptional({
    description: 'Hashed password for email/password auth',
  })
  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  passwordHash?: string;

  @ApiProperty({ description: 'Failed login attempts count' })
  @Column({ type: 'int', default: 0 })
  @IsInt()
  failedLoginAttempts: number;

  @ApiPropertyOptional({ description: 'Account lockout timestamp' })
  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  lockoutUntil?: Date;

  @ApiPropertyOptional({ description: 'Profile avatar URL' })
  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  avatarUrl: string;

  @ApiPropertyOptional({ description: 'Profile cover image URL' })
  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  coverUrl: string;

  @ApiPropertyOptional({ description: 'User biography' })
  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  bio: string;

  @ApiPropertyOptional({ description: 'Gender' })
  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  gender: string;

  @ApiPropertyOptional({ description: 'Country code' })
  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  country: string;

  @ApiProperty({ description: 'Preferred language' })
  @Column({ type: 'varchar', default: 'en' })
  @IsString()
  preferredLanguage: string;

  @ApiPropertyOptional({ description: 'User interest categories' })
  @Column({ type: 'json', nullable: true })
  @IsOptional()
  interests: string[];

  @ApiPropertyOptional({ description: 'Custom status message' })
  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  statusMessage: string;

  @ApiPropertyOptional({ description: 'Social media profile links' })
  @Column({ type: 'json', nullable: true })
  @IsOptional()
  socialLinks: Record<string, string>;

  @ApiProperty({ description: 'Wealth level' })
  @Column({ type: 'int', default: 1 })
  @IsInt()
  wealthLevel: number;

  @ApiProperty({ description: 'Wealth experience points' })
  @Column({ type: 'int', default: 0 })
  @IsInt()
  wealthExp: number;

  @ApiProperty({ description: 'Charm level' })
  @Column({ type: 'int', default: 1 })
  @IsInt()
  charmLevel: number;

  @ApiProperty({ description: 'Charm experience points' })
  @Column({ type: 'int', default: 0 })
  @IsInt()
  charmExp: number;

  @ApiPropertyOptional({ description: 'User achievements/badges list' })
  @Column({ type: 'json', nullable: true })
  @IsOptional()
  badges: string[];

  @ApiPropertyOptional({ description: 'User custom tags' })
  @Column({ type: 'json', nullable: true })
  @IsOptional()
  customTags: string[];

  @ApiPropertyOptional({ description: 'User privacy settings' })
  @Column({ type: 'json', nullable: true })
  @IsOptional()
  privacySettings: Record<string, boolean>;

  @ApiPropertyOptional({ description: 'Host badge label' })
  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  hostBadge: string;

  @ApiPropertyOptional({ description: 'Agency badge label' })
  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  agencyBadge: string;

  @ApiPropertyOptional({ description: 'VIP badge label' })
  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  vipBadge: string;

  @ApiPropertyOptional({ description: 'Creator badge type' })
  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  creatorBadge: string;

  @ApiPropertyOptional({ description: 'Creator main category' })
  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  creatorCategory: string;

  @ApiPropertyOptional({ description: 'Creator membership tier' })
  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString()
  creatorTier: string;

  @ApiProperty({ description: 'Creator features enabled flag' })
  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  isCreatorEnabled: boolean;

  @ApiProperty({
    enum: VerificationStatus,
    default: VerificationStatus.UNVERIFIED,
  })
  @Column({ type: 'varchar', default: VerificationStatus.UNVERIFIED })
  @IsEnum(VerificationStatus)
  verificationStatus: VerificationStatus;

  @ApiProperty({ description: 'Profile completion percentage (0-100)' })
  @Column({ type: 'int', default: 0 })
  @IsInt()
  profileCompletion: number;

  @ApiProperty({ description: 'Online status indicator' })
  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  isOnline: boolean;

  @ApiProperty({ description: 'Is verified profile' })
  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  isVerified: boolean;

  @ApiProperty({ description: 'Is active VIP user' })
  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  isVip: boolean;

  @ApiProperty({ description: 'Total followers count' })
  @Column({ type: 'int', default: 0 })
  @IsInt()
  followersCount: number;

  @ApiProperty({ description: 'Total following count' })
  @Column({ type: 'int', default: 0 })
  @IsInt()
  followingCount: number;

  @ApiProperty({ description: 'Popularity score' })
  @Column({ type: 'int', default: 0 })
  @IsInt()
  popularityScore: number;

  @ApiPropertyOptional({ description: 'Last active timestamp' })
  @Column({ type: 'timestamp', nullable: true })
  @IsOptional()
  lastActiveAt: Date;

  @OneToOne(() => WalletBalance, (walletBalance) => walletBalance.user)
  walletBalance: WalletBalance;

  @CreateDateColumn()
  @Index('IDX_users_createdAt')
  createdAt: Date;

  @UpdateDateColumn()
  @Index('IDX_users_updatedAt')
  updatedAt: Date;
}
