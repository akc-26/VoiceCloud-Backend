import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class SocialIdentityService {
  private readonly logger = new Logger(SocialIdentityService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  private generateReferralCode(user: User): string {
    const prefix = user.username.slice(0, 4).toUpperCase();
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${randomNum}`;
  }

  async ensureReferralCode(user: User): Promise<string> {
    if (user.referralCode) {
      return user.referralCode;
    }
    const code = this.generateReferralCode(user);
    user.referralCode = code;
    await this.userRepository.save(user);
    return code;
  }

  async getPersonalQrCode(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const referralCode = await this.ensureReferralCode(user);
    const profileUrl = `https://app.example.com/u/${user.username}?ref=${referralCode}`;

    const qrPayload = {
      type: 'USER_PROFILE',
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      referralCode,
      profileUrl,
    };

    return {
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      referralCode,
      profileUrl,
      qrPayload,
      qrCodeDataUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
        profileUrl,
      )}`,
    };
  }

  async getPublicProfileByUsername(username: string) {
    const user = await this.userRepository.findOne({
      where: { username },
    });
    if (!user) {
      throw new NotFoundException(`Public profile for username '${username}' not found`);
    }

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      coverUrl: user.coverUrl,
      bio: user.bio,
      statusMessage: user.statusMessage,
      country: user.country,
      wealthLevel: user.wealthLevel || 1,
      charmLevel: user.charmLevel || 1,
      badges: user.badges || [],
      customTags: user.customTags || [],
      isVerified: user.isVerified,
      isVip: user.isVip,
      hostBadge: user.hostBadge,
      agencyBadge: user.agencyBadge,
      vipBadge: user.vipBadge,
      followersCount: user.followersCount || 0,
      followingCount: user.followingCount || 0,
      popularityScore: user.popularityScore || 0,
      createdAt: user.createdAt,
    };
  }

  async getShareProfile(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const referralCode = await this.ensureReferralCode(user);
    const shareUrl = `https://app.example.com/u/${user.username}?ref=${referralCode}`;

    return {
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      shareUrl,
      referralCode,
      metaTitle: `${user.displayName} (@${user.username}) on Platform`,
      metaDescription: user.bio || user.statusMessage || `Connect with ${user.displayName}!`,
      metaImage: user.avatarUrl || user.coverUrl || 'https://cdn.example.com/default-share.png',
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
        shareUrl,
      )}`,
    };
  }

  async getReferralStats(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const referralCode = await this.ensureReferralCode(user);

    const referredUsers = await this.userRepository.find({
      where: { referredByUserId: userId },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        createdAt: true,
        isVerified: true,
      },
      order: { createdAt: 'DESC' },
    });

    const activeReferred = referredUsers.filter((u) => u.isVerified).length;

    return {
      referralCode,
      shareLink: `https://app.example.com/register?ref=${referralCode}`,
      totalReferrals: referredUsers.length,
      activeReferrals: activeReferred,
      referralRewardsEarned: referredUsers.length * 100, // 100 coins/EXP per referral
      referredUsers,
    };
  }

  async claimReferral(userId: string, referralCode: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.referredByUserId) {
      throw new BadRequestException('Referral code has already been applied for this account');
    }

    const referrer = await this.userRepository.findOne({
      where: { referralCode },
    });

    if (!referrer) {
      throw new NotFoundException('Invalid referral code');
    }

    if (referrer.id === userId) {
      throw new BadRequestException('Cannot use your own referral code');
    }

    user.referredByUserId = referrer.id;
    await this.userRepository.save(user);

    return {
      success: true,
      referredBy: {
        id: referrer.id,
        username: referrer.username,
        displayName: referrer.displayName,
      },
    };
  }
}
