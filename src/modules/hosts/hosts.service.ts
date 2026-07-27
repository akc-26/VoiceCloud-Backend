import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  HostProfile,
  HostVerificationStatus,
} from './entities/host-profile.entity';
import { ApplyHostDto } from './dto/apply-host.dto';
import { UpdateHostProfileDto } from './dto/update-host-profile.dto';
import { SearchHostsDto } from './dto/search-hosts.dto';
import { EventsGateway } from '../../common/events/events.gateway';
import { StorageService } from '../storage/storage.service';
import { MediaCategory } from '../storage/enums/media-category.enum';

@Injectable()
export class HostsService {
  constructor(
    @InjectRepository(HostProfile)
    private readonly hostRepository: Repository<HostProfile>,
    private readonly eventsGateway: EventsGateway,
    private readonly storageService: StorageService,
  ) {}

  async applyForVerification(
    userId: string,
    dto: ApplyHostDto,
  ): Promise<HostProfile> {
    const existing = await this.hostRepository.findOne({ where: { userId } });
    if (existing) {
      if (existing.status === HostVerificationStatus.APPROVED) {
        throw new ConflictException('Host is already verified and approved');
      }
      if (existing.status === HostVerificationStatus.PENDING) {
        throw new ConflictException(
          'Host verification application is currently pending review',
        );
      }
      // If rejected, re-apply
      Object.assign(existing, {
        ...dto,
        status: HostVerificationStatus.PENDING,
        rejectionReason: null,
      });
      const saved = await this.hostRepository.save(existing);
      this.eventsGateway.broadcastHostEvent('host:status_updated', {
        userId,
        status: HostVerificationStatus.PENDING,
      });
      return saved;
    }

    const host = this.hostRepository.create({
      userId,
      ...dto,
      status: HostVerificationStatus.PENDING,
    });
    const saved = await this.hostRepository.save(host);

    this.eventsGateway.broadcastHostEvent('host:status_updated', {
      userId,
      status: HostVerificationStatus.PENDING,
    });
    return saved;
  }

  async getHostProfile(userId: string): Promise<HostProfile> {
    const profile = await this.hostRepository.findOne({ where: { userId } });
    if (!profile) {
      throw new NotFoundException(`Host profile for user ${userId} not found`);
    }
    return profile;
  }

  async updateHostProfile(
    userId: string,
    dto: UpdateHostProfileDto,
  ): Promise<HostProfile> {
    const profile = await this.getHostProfile(userId);
    Object.assign(profile, dto);
    return await this.hostRepository.save(profile);
  }

  async searchHosts(dto: SearchHostsDto): Promise<HostProfile[]> {
    const queryBuilder = this.hostRepository.createQueryBuilder('host');

    if (dto.status) {
      queryBuilder.andWhere('host.status = :status', { status: dto.status });
    } else {
      queryBuilder.andWhere('host.status = :status', {
        status: HostVerificationStatus.APPROVED,
      });
    }

    if (dto.query) {
      queryBuilder.andWhere(
        '(host.realName ILIKE :query OR host.bio ILIKE :query)',
        { query: `%${dto.query}%` },
      );
    }

    if (dto.country) {
      queryBuilder.andWhere('host.country ILIKE :country', {
        country: `%${dto.country}%`,
      });
    }

    return await queryBuilder.getMany();
  }

  // Admin Methods
  async getApplications(
    status?: HostVerificationStatus,
  ): Promise<HostProfile[]> {
    if (status) {
      return await this.hostRepository.find({
        where: { status },
        order: { createdAt: 'DESC' },
      });
    }
    return await this.hostRepository.find({ order: { createdAt: 'DESC' } });
  }

  async approveHost(id: string): Promise<HostProfile> {
    const host = await this.hostRepository.findOne({ where: { id } });
    if (!host) {
      throw new NotFoundException(`Host application with ID ${id} not found`);
    }

    host.status = HostVerificationStatus.APPROVED;
    host.rejectionReason = null;
    const saved = await this.hostRepository.save(host);

    this.eventsGateway.broadcastHostEvent('host:verified', {
      userId: host.userId,
      hostId: host.id,
    });
    this.eventsGateway.broadcastHostEvent('host:status_updated', {
      userId: host.userId,
      status: HostVerificationStatus.APPROVED,
    });

    return saved;
  }

  async rejectHost(id: string, reason?: string): Promise<HostProfile> {
    const host = await this.hostRepository.findOne({ where: { id } });
    if (!host) {
      throw new NotFoundException(`Host application with ID ${id} not found`);
    }

    host.status = HostVerificationStatus.REJECTED;
    host.rejectionReason = reason ?? 'Verification request rejected by admin';
    const saved = await this.hostRepository.save(host);

    this.eventsGateway.broadcastHostEvent('host:status_updated', {
      userId: host.userId,
      status: HostVerificationStatus.REJECTED,
      reason: host.rejectionReason,
    });

    return saved;
  }

  async suspendHost(id: string): Promise<HostProfile> {
    const host = await this.hostRepository.findOne({ where: { id } });
    if (!host) {
      throw new NotFoundException(`Host application with ID ${id} not found`);
    }

    host.status = HostVerificationStatus.SUSPENDED;
    const saved = await this.hostRepository.save(host);

    this.eventsGateway.broadcastHostEvent('host:status_updated', {
      userId: host.userId,
      status: HostVerificationStatus.SUSPENDED,
    });

    return saved;
  }

  async reactivateHost(id: string): Promise<HostProfile> {
    const host = await this.hostRepository.findOne({ where: { id } });
    if (!host) {
      throw new NotFoundException(`Host application with ID ${id} not found`);
    }

    host.status = HostVerificationStatus.APPROVED;
    const saved = await this.hostRepository.save(host);

    this.eventsGateway.broadcastHostEvent('host:status_updated', {
      userId: host.userId,
      status: HostVerificationStatus.APPROVED,
    });

    return saved;
  }

  async uploadGovernmentId(userId: string, file: Express.Multer.File) {
    const media = await this.storageService.uploadFile(
      file,
      {
        category: MediaCategory.HOST_ID,
        entityType: 'host_verification',
        entityId: userId,
      },
      userId,
    );

    const profile = await this.hostRepository.findOne({ where: { userId } });
    if (profile) {
      profile.documentUrl = media.publicUrl;
      await this.hostRepository.save(profile);
    }

    return {
      message: 'Government ID uploaded successfully',
      documentUrl: media.publicUrl,
      media,
    };
  }

  async uploadProfilePhoto(userId: string, file: Express.Multer.File) {
    const media = await this.storageService.uploadFile(
      file,
      {
        category: MediaCategory.HOST_PHOTO,
        entityType: 'host_verification',
        entityId: userId,
      },
      userId,
    );

    const profile = await this.hostRepository.findOne({ where: { userId } });
    if (profile) {
      profile.selfieUrl = media.publicUrl;
      await this.hostRepository.save(profile);
    }

    return {
      message: 'Profile photo uploaded successfully',
      selfieUrl: media.publicUrl,
      media,
    };
  }

  async uploadVerificationDocument(userId: string, file: Express.Multer.File) {
    const media = await this.storageService.uploadFile(
      file,
      {
        category: MediaCategory.HOST_DOCUMENT,
        entityType: 'host_verification',
        entityId: userId,
      },
      userId,
    );

    return {
      message: 'Verification document uploaded successfully',
      documentUrl: media.publicUrl,
      media,
    };
  }
}
