import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { StorageService } from '../storage/storage.service';
import { MediaCategory } from '../storage/enums/media-category.enum';
import { MediaFile } from '../storage/entities/media-file.entity';
import { EventsGateway } from '../../common/events/events.gateway';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly storageService: StorageService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async getProfile(userId: string) {
    let user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      // Create user fallback if missing
      user = this.userRepository.create({
        id: userId,
        username: `user_${userId.substring(0, 8)}`,
        displayName: `User ${userId.substring(0, 4)}`,
        email: `${userId.substring(0, 8)}@voicecloud.com`,
        isOnline: true,
        followersCount: 0,
        followingCount: 0,
        popularityScore: 100,
        profileCompletion: 50,
      });
      user = await this.userRepository.save(user);
    }

    user.profileCompletion = this.calculateProfileCompletion(user);
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    let user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      user = this.userRepository.create({
        id: userId,
        username: dto.username || `user_${userId.substring(0, 8)}`,
        displayName: dto.displayName || 'VoiceCloud User',
        email: `${userId.substring(0, 8)}@voicecloud.com`,
      });
    }

    if (dto.username && dto.username !== user.username) {
      const existing = await this.userRepository.findOne({
        where: { username: dto.username },
      });
      if (existing && existing.id !== userId) {
        throw new ConflictException(
          `Username '${dto.username}' is already taken`,
        );
      }
      user.username = dto.username;
    }

    if (dto.displayName) user.displayName = dto.displayName;
    if (dto.bio !== undefined) user.bio = dto.bio;
    if (dto.gender !== undefined) user.gender = dto.gender;
    if (dto.country !== undefined) user.country = dto.country;
    if (dto.preferredLanguage !== undefined)
      user.preferredLanguage = dto.preferredLanguage;
    if (dto.interests !== undefined) user.interests = dto.interests;
    if (dto.socialLinks !== undefined) user.socialLinks = dto.socialLinks;

    user.profileCompletion = this.calculateProfileCompletion(user);

    const saved = await this.userRepository.save(user);

    // Broadcast WebSocket event
    this.eventsGateway.broadcastProfileUpdated({
      userId,
      username: saved.username,
      displayName: saved.displayName,
      avatarUrl: saved.avatarUrl,
      bio: saved.bio,
      gender: saved.gender,
      country: saved.country,
      profileCompletion: saved.profileCompletion,
      updatedAt: saved.updatedAt,
    });

    return saved;
  }

  async getProfileStats(userId: string) {
    const user = await this.getProfile(userId);

    // Avatar metadata
    let avatarMetadata: MediaFile | null = null;
    try {
      avatarMetadata = await this.getAvatarMetadata(userId);
    } catch {
      avatarMetadata = null;
    }

    return {
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      followersCount: user.followersCount || 0,
      followingCount: user.followingCount || 0,
      popularityScore: user.popularityScore || 0,
      profileCompletion: user.profileCompletion || 0,
      badges: {
        isVip: user.isVip || false,
        vipBadge: user.vipBadge || (user.isVip ? 'VIP Gold' : null),
        isVerified: user.isVerified || false,
        hostBadge: user.hostBadge || null,
        agencyBadge: user.agencyBadge || null,
      },
      avatarMetadata,
      createdAt: user.createdAt,
    };
  }

  calculateProfileCompletion(user: User): number {
    let score = 0;
    if (user.username) score += 15;
    if (user.displayName) score += 15;
    if (user.email) score += 10;
    if (user.avatarUrl) score += 20;
    if (user.bio) score += 15;
    if (user.gender) score += 5;
    if (user.country) score += 5;
    if (user.interests && user.interests.length > 0) score += 10;
    if (user.socialLinks && Object.keys(user.socialLinks).length > 0)
      score += 5;
    return Math.min(score, 100);
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Avatar image file is required');
    }

    const media = await this.storageService.uploadFile(
      file,
      {
        category: MediaCategory.AVATAR,
        entityType: 'user',
        entityId: userId,
      },
      userId,
    );

    // Update avatarUrl in User entity
    const user = await this.getProfile(userId);
    user.avatarUrl = media.publicUrl;
    user.profileCompletion = this.calculateProfileCompletion(user);
    await this.userRepository.save(user);

    const payload = {
      userId,
      avatarUrl: media.publicUrl,
      mediaId: media.id,
      updatedAt: media.createdAt,
    };

    this.eventsGateway.broadcastAvatarUpdated(payload);
    this.logger.log(`Uploaded avatar for user ${userId}`);

    return {
      message: 'Avatar uploaded successfully',
      avatarUrl: media.publicUrl,
      media,
    };
  }

  async replaceAvatar(userId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Avatar image file is required');
    }

    const existingMediaList = await this.storageService.queryMedia({
      category: MediaCategory.AVATAR,
      entityType: 'user',
      entityId: userId,
    });

    let media: MediaFile;
    if (existingMediaList.length > 0) {
      media = await this.storageService.replaceFile(
        existingMediaList[0].id,
        file,
        {
          category: MediaCategory.AVATAR,
          entityType: 'user',
          entityId: userId,
        },
        userId,
      );
    } else {
      media = await this.storageService.uploadFile(
        file,
        {
          category: MediaCategory.AVATAR,
          entityType: 'user',
          entityId: userId,
        },
        userId,
      );
    }

    const user = await this.getProfile(userId);
    user.avatarUrl = media.publicUrl;
    user.profileCompletion = this.calculateProfileCompletion(user);
    await this.userRepository.save(user);

    const payload = {
      userId,
      avatarUrl: media.publicUrl,
      mediaId: media.id,
      updatedAt: media.updatedAt,
    };

    this.eventsGateway.broadcastAvatarUpdated(payload);
    this.logger.log(`Replaced avatar for user ${userId}`);

    return {
      message: 'Avatar replaced successfully',
      avatarUrl: media.publicUrl,
      media,
    };
  }

  async deleteAvatar(userId: string) {
    const existingMediaList = await this.storageService.queryMedia({
      category: MediaCategory.AVATAR,
      entityType: 'user',
      entityId: userId,
    });

    for (const media of existingMediaList) {
      await this.storageService.deleteFile(media.id);
    }

    const user = await this.getProfile(userId);
    user.avatarUrl = null as unknown as string;
    user.profileCompletion = this.calculateProfileCompletion(user);
    await this.userRepository.save(user);

    const payload = {
      userId,
      avatarUrl: null,
      mediaId: null,
      updatedAt: new Date(),
    };

    this.eventsGateway.broadcastAvatarUpdated(payload);
    this.logger.log(`Deleted avatar for user ${userId}`);

    return { message: 'Avatar deleted successfully' };
  }

  async getAvatarMetadata(userId: string) {
    const mediaList = await this.storageService.queryMedia({
      category: MediaCategory.AVATAR,
      entityType: 'user',
      entityId: userId,
    });

    if (mediaList.length === 0) {
      throw new NotFoundException(
        `No avatar metadata found for user ${userId}`,
      );
    }

    return mediaList[0];
  }
}
