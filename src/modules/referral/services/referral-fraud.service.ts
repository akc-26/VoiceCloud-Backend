import {
  Injectable,
  NotFoundException,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ReferralRelationship,
  ReferralFraudLog,
  ReferralBlacklist,
} from '../entities';
import {
  FraudStatus,
  BlacklistType,
  FraudAction,
  QualificationStatus,
} from '../enums/referral.enums';
import { AddBlacklistDto, FraudActionDto, ReferralQueryDto } from '../dto';

@Injectable()
export class ReferralFraudService {
  private readonly logger = new Logger(ReferralFraudService.name);

  constructor(
    @InjectRepository(ReferralRelationship)
    private readonly relationshipRepository: Repository<ReferralRelationship>,
    @InjectRepository(ReferralFraudLog)
    private readonly fraudLogRepository: Repository<ReferralFraudLog>,
    @InjectRepository(ReferralBlacklist)
    private readonly blacklistRepository: Repository<ReferralBlacklist>,
  ) {}

  /**
   * 1. Check Blacklist
   */
  async checkBlacklist(
    userId?: string,
    ipAddress?: string,
    deviceId?: string,
  ): Promise<boolean> {
    if (userId) {
      const userMatch = await this.blacklistRepository.findOne({
        where: { type: BlacklistType.USER, value: userId },
      });
      if (userMatch) return true;
    }

    if (ipAddress) {
      const ipMatch = await this.blacklistRepository.findOne({
        where: { type: BlacklistType.IP, value: ipAddress },
      });
      if (ipMatch) return true;
    }

    if (deviceId) {
      const deviceMatch = await this.blacklistRepository.findOne({
        where: { type: BlacklistType.DEVICE, value: deviceId },
      });
      if (deviceMatch) return true;
    }

    return false;
  }

  /**
   * 2. Analyze Referral Fraud Heuristics
   */
  async analyzeReferralFraud(
    referrerId: string,
    referredUserId: string,
    ipAddress?: string,
    deviceId?: string,
  ): Promise<{ isFraud: boolean; riskScore: number; reasons: string[] }> {
    const reasons: string[] = [];
    let riskScore = 0;

    // Check duplicate device
    if (deviceId) {
      const deviceCount = await this.relationshipRepository.count({
        where: { deviceId },
      });
      if (deviceCount >= 3) {
        riskScore += 50;
        reasons.push(`Duplicate device ID detected (${deviceCount} existing referrals)`);
      }
    }

    // Check duplicate IP
    if (ipAddress) {
      const ipCount = await this.relationshipRepository.count({
        where: { ipAddress },
      });
      if (ipCount >= 5) {
        riskScore += 40;
        reasons.push(`High referral count from same IP (${ipCount} existing referrals)`);
      }
    }

    // Check referral rate velocity (more than 10 referrals in 1 hour)
    const oneHourAgo = new Date(Date.now() - 3600 * 1000);
    const recentReferrals = await this.relationshipRepository
      .createQueryBuilder('rel')
      .where('rel.referrerId = :referrerId', { referrerId })
      .andWhere('rel.registrationDate >= :oneHourAgo', { oneHourAgo })
      .getCount();

    if (recentReferrals >= 10) {
      riskScore += 45;
      reasons.push(`Excessive referral rate velocity (${recentReferrals} referrals in last hour)`);
    }

    const isFraud = riskScore >= 50;

    if (isFraud) {
      const log = this.fraudLogRepository.create({
        referrerId,
        referredUserId,
        triggerReason: reasons.join('; '),
        riskScore,
        status: FraudStatus.SUSPECTED,
        ipAddress: ipAddress || null,
        deviceId: deviceId || null,
      });
      await this.fraudLogRepository.save(log);
    }

    return { isFraud, riskScore, reasons };
  }

  /**
   * 3. Handle Fraud Action (Approve / Reject / Blacklist / Suspend / Restore)
   */
  async handleFraudAction(dto: FraudActionDto) {
    if (dto.relationshipId) {
      const rel = await this.relationshipRepository.findOne({
        where: { id: dto.relationshipId },
      });
      if (rel) {
        if (dto.action === FraudAction.APPROVE || dto.action === FraudAction.RESTORE) {
          rel.fraudStatus = FraudStatus.CLEAN;
          rel.qualificationStatus = QualificationStatus.QUALIFIED;
        } else if (dto.action === FraudAction.REJECT || dto.action === FraudAction.SUSPEND) {
          rel.fraudStatus = FraudStatus.CONFIRMED;
          rel.qualificationStatus = QualificationStatus.REJECTED;
        }
        await this.relationshipRepository.save(rel);
      }
    }

    if (dto.action === FraudAction.BLACKLIST) {
      if (dto.referrerId) {
        await this.addBlacklist({
          type: BlacklistType.USER,
          value: dto.referrerId,
          reason: dto.reason || 'Fraud Blacklist',
        });
      }
      if (dto.referredUserId) {
        await this.addBlacklist({
          type: BlacklistType.USER,
          value: dto.referredUserId,
          reason: dto.reason || 'Fraud Blacklist',
        });
      }
    }

    return { success: true, action: dto.action };
  }

  /**
   * 4. Blacklist Management CRUD
   */
  async addBlacklist(dto: AddBlacklistDto) {
    const existing = await this.blacklistRepository.findOne({
      where: { type: dto.type, value: dto.value },
    });
    if (existing) return existing;

    const item = this.blacklistRepository.create({
      type: dto.type,
      value: dto.value,
      reason: dto.reason || null,
      createdBy: 'ADMIN',
    });
    return this.blacklistRepository.save(item);
  }

  async removeBlacklist(id: string) {
    const res = await this.blacklistRepository.delete(id);
    if (res.affected === 0) {
      throw new NotFoundException(`Blacklist item '${id}' not found`);
    }
    return { success: true };
  }

  async getBlacklist(query: ReferralQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.blacklistRepository.createQueryBuilder('bl');

    if (query.search) {
      qb.andWhere('bl.value ILIKE :search OR bl.reason ILIKE :search', {
        search: `%${query.search}%`,
      });
    }

    qb.orderBy('bl.createdAt', 'DESC');
    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getFraudLogs(query: ReferralQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.fraudLogRepository.createQueryBuilder('log');

    if (query.search) {
      qb.andWhere('log.triggerReason ILIKE :search OR log.ipAddress ILIKE :search', {
        search: `%${query.search}%`,
      });
    }

    qb.orderBy('log.createdAt', 'DESC');
    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
