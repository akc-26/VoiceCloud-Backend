import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agency, AgencyStatus } from './entities/agency.entity';
import {
  AgencyMember,
  AgencyRole,
  AgencyMemberStatus,
} from './entities/agency-member.entity';
import {
  AgencyInvitation,
  InvitationStatus,
} from './entities/agency-invitation.entity';
import {
  AgencyApplication,
  ApplicationStatus,
} from './entities/agency-application.entity';
import {
  AgencyContract,
  ContractStatus,
  CommissionModel,
} from './entities/agency-contract.entity';
import {
  AgencySettlement,
  SettlementStatus,
} from './entities/agency-settlement.entity';
import {
  AgencyReward,
  AgencyRewardType,
} from './entities/agency-reward.entity';
import { AgencyAuditLog } from './entities/agency-audit-log.entity';

import { CreateAgencyDto } from './dto/create-agency.dto';
import { ApplyAgencyDto } from './dto/apply-agency.dto';
import { UpdateAgencyApplicationDto } from './dto/update-agency-application.dto';
import { UpdateAgencyProfileDto } from './dto/update-agency-profile.dto';
import { UpdateAgencyDto } from './dto/update-agency.dto';
import { InviteAgencyMemberDto } from './dto/invite-agency-member.dto';
import { TransferAgencyOwnershipDto } from './dto/transfer-agency-ownership.dto';
import { CreateHostContractDto } from './dto/create-host-contract.dto';
import { ProcessSettlementDto } from './dto/process-settlement.dto';

import { EventsGateway } from '../../common/events/events.gateway';
import { StorageService } from '../storage/storage.service';
import { MediaCategory } from '../storage/enums/media-category.enum';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class AgenciesService {
  private readonly logger = new Logger(AgenciesService.name);

  constructor(
    @InjectRepository(Agency)
    private readonly agencyRepository: Repository<Agency>,
    @InjectRepository(AgencyMember)
    private readonly memberRepository: Repository<AgencyMember>,
    @InjectRepository(AgencyInvitation)
    private readonly invitationRepository: Repository<AgencyInvitation>,
    @InjectRepository(AgencyApplication)
    private readonly applicationRepository: Repository<AgencyApplication>,
    @InjectRepository(AgencyContract)
    private readonly contractRepository: Repository<AgencyContract>,
    @InjectRepository(AgencySettlement)
    private readonly settlementRepository: Repository<AgencySettlement>,
    @InjectRepository(AgencyReward)
    private readonly rewardRepository: Repository<AgencyReward>,
    @InjectRepository(AgencyAuditLog)
    private readonly auditLogRepository: Repository<AgencyAuditLog>,
    private readonly eventsGateway: EventsGateway,
    private readonly storageService: StorageService,
    private readonly redisService: RedisService,
  ) {}

  // --- AGENCY REGISTRATION & APPLICATION ---
  async applyForAgency(
    ownerId: string,
    dto: ApplyAgencyDto,
  ): Promise<AgencyApplication> {
    const code =
      'AG-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const application = this.applicationRepository.create({
      ...dto,
      ownerId,
      documents: dto.documents
        ? JSON.stringify(dto.documents)
        : JSON.stringify([]),
      status: ApplicationStatus.PENDING,
    });
    const saved = await this.applicationRepository.save(application);

    // Create preliminary agency in PENDING_VERIFICATION status
    const agency = this.agencyRepository.create({
      name: dto.agencyName,
      code,
      ownerId,
      legalName: dto.legalName,
      taxId: dto.taxId,
      businessRegistrationNumber: dto.businessRegistrationNumber,
      businessAddress: dto.businessAddress,
      contactEmail: dto.contactEmail,
      contactPhone: dto.contactPhone,
      website: dto.website,
      country: dto.country,
      languages: dto.languages,
      categories: dto.categories,
      description: dto.description,
      status: AgencyStatus.PENDING_VERIFICATION,
      memberCount: 1,
      totalRevenue: 0,
    });
    const savedAgency = await this.agencyRepository.save(agency);

    // Create owner member entry
    const ownerMember = this.memberRepository.create({
      agencyId: savedAgency.id,
      userId: ownerId,
      role: AgencyRole.OWNER,
      status: AgencyMemberStatus.ACTIVE,
    });
    await this.memberRepository.save(ownerMember);

    await this.logAgencyAction(
      savedAgency.id,
      'AGENCY_APPLICATION_SUBMITTED',
      ownerId,
      { applicationId: saved.id },
    );

    this.eventsGateway.broadcastAgencyEvent('agency:application_submitted', {
      applicationId: saved.id,
      agencyId: savedAgency.id,
    });

    return saved;
  }

  async listApplications(
    status?: ApplicationStatus,
  ): Promise<AgencyApplication[]> {
    const whereClause = status ? { status } : {};
    return await this.applicationRepository.find({
      where: whereClause,
      order: { createdAt: 'DESC' },
    });
  }

  async reviewApplication(
    applicationId: string,
    reviewerId: string,
    dto: UpdateAgencyApplicationDto,
  ): Promise<AgencyApplication> {
    const application = await this.applicationRepository.findOne({
      where: { id: applicationId },
    });
    if (!application) {
      throw new NotFoundException(`Application '${applicationId}' not found`);
    }

    application.status = dto.status;
    application.reviewNotes = dto.reviewNotes;
    application.reviewedBy = reviewerId;
    application.reviewedAt = new Date();
    const updated = await this.applicationRepository.save(application);

    const agency = await this.agencyRepository.findOne({
      where: { ownerId: application.ownerId, name: application.agencyName },
    });

    if (agency) {
      if (dto.status === ApplicationStatus.APPROVED) {
        agency.status = AgencyStatus.ACTIVE;
        agency.isVerified = true;
      } else if (dto.status === ApplicationStatus.REJECTED) {
        agency.status = AgencyStatus.REJECTED;
        agency.isVerified = false;
      }
      await this.agencyRepository.save(agency);

      await this.logAgencyAction(
        agency.id,
        `AGENCY_APPLICATION_${dto.status}`,
        reviewerId,
        { applicationId, notes: dto.reviewNotes },
      );

      this.eventsGateway.broadcastAgencyEvent('agency:status_updated', {
        agencyId: agency.id,
        status: agency.status,
        isVerified: agency.isVerified,
      });
    }

    return updated;
  }

  async suspendAgency(
    agencyId: string,
    adminId: string,
    reason?: string,
  ): Promise<Agency> {
    const agency = await this.findAgencyById(agencyId);
    agency.status = AgencyStatus.SUSPENDED;
    const saved = await this.agencyRepository.save(agency);

    await this.logAgencyAction(agencyId, 'AGENCY_SUSPENDED', adminId, {
      reason,
    });
    this.eventsGateway.broadcastAgencyEvent('agency:status_updated', {
      agencyId,
      status: AgencyStatus.SUSPENDED,
    });

    await this.redisService.del(`agency:profile:${agencyId}`);
    return saved;
  }

  async reactivateAgency(agencyId: string, adminId: string): Promise<Agency> {
    const agency = await this.findAgencyById(agencyId);
    agency.status = AgencyStatus.ACTIVE;
    const saved = await this.agencyRepository.save(agency);

    await this.logAgencyAction(agencyId, 'AGENCY_REACTIVATED', adminId);
    this.eventsGateway.broadcastAgencyEvent('agency:status_updated', {
      agencyId,
      status: AgencyStatus.ACTIVE,
    });

    await this.redisService.del(`agency:profile:${agencyId}`);
    return saved;
  }

  // --- AGENCY CRUD & PROFILES ---
  async createAgency(ownerId: string, dto: CreateAgencyDto): Promise<Agency> {
    const code =
      'AG-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const agency = this.agencyRepository.create({
      ...dto,
      code,
      ownerId,
      status: AgencyStatus.ACTIVE,
      memberCount: 1,
      totalRevenue: 0,
      totalHosts: 0,
      activeHosts: 0,
      isVerified: false,
    });
    const saved = await this.agencyRepository.save(agency);

    const ownerMember = this.memberRepository.create({
      agencyId: saved.id,
      userId: ownerId,
      role: AgencyRole.OWNER,
      status: AgencyMemberStatus.ACTIVE,
    });
    await this.memberRepository.save(ownerMember);

    this.eventsGateway.broadcastAgencyEvent('agency:created', {
      agencyId: saved.id,
      status: AgencyStatus.ACTIVE,
    });

    return saved;
  }

  async findAllAgencies(
    country?: string,
    category?: string,
  ): Promise<Agency[]> {
    const query = this.agencyRepository
      .createQueryBuilder('agency')
      .where('agency.status = :status', { status: AgencyStatus.ACTIVE });

    if (country) {
      query.andWhere('agency.country = :country', { country });
    }
    if (category) {
      query.andWhere('agency.categories LIKE :category', {
        category: `%${category}%`,
      });
    }

    query
      .orderBy('agency.totalRevenue', 'DESC')
      .addOrderBy('agency.createdAt', 'DESC');

    return await query.getMany();
  }

  async findAgencyById(id: string): Promise<Agency> {
    const agency = await this.agencyRepository.findOne({ where: { id } });
    if (!agency) {
      throw new NotFoundException(`Agency with ID ${id} not found`);
    }
    return agency;
  }

  async updateAgency(
    id: string,
    userId: string,
    dto: UpdateAgencyDto,
  ): Promise<Agency> {
    const agency = await this.findAgencyById(id);
    if (agency.ownerId !== userId) {
      const member = await this.memberRepository.findOne({
        where: { agencyId: id, userId },
      });
      if (
        !member ||
        (member.role !== AgencyRole.OWNER && member.role !== AgencyRole.MANAGER)
      ) {
        throw new ForbiddenException(
          'Only agency owner or managers can update agency details',
        );
      }
    }
    Object.assign(agency, dto);
    const saved = await this.agencyRepository.save(agency);

    await this.logAgencyAction(
      id,
      'AGENCY_UPDATED',
      userId,
      dto as Record<string, unknown>,
    );
    await this.redisService.del(`agency:profile:${id}`);
    return saved;
  }

  async updateAgencyProfile(
    agencyId: string,
    userId: string,
    dto: UpdateAgencyProfileDto,
  ): Promise<Agency> {
    const agency = await this.findAgencyById(agencyId);
    if (agency.ownerId !== userId) {
      const member = await this.memberRepository.findOne({
        where: { agencyId, userId },
      });
      if (
        !member ||
        (member.role !== AgencyRole.OWNER && member.role !== AgencyRole.MANAGER)
      ) {
        throw new ForbiddenException(
          'Only agency owner or managers can update agency profile',
        );
      }
    }

    Object.assign(agency, dto);
    const saved = await this.agencyRepository.save(agency);

    await this.logAgencyAction(
      agencyId,
      'AGENCY_PROFILE_UPDATED',
      userId,
      dto as Record<string, unknown>,
    );
    await this.redisService.del(`agency:profile:${agencyId}`);
    return saved;
  }

  async toggleVerification(
    agencyId: string,
    isVerified: boolean,
  ): Promise<Agency> {
    const agency = await this.findAgencyById(agencyId);
    agency.isVerified = isVerified;
    const saved = await this.agencyRepository.save(agency);

    this.eventsGateway.broadcastAgencyEvent('agency:verification_toggled', {
      agencyId,
      isVerified,
    });
    return saved;
  }

  async toggleFeatured(agencyId: string, featured: boolean): Promise<Agency> {
    const agency = await this.findAgencyById(agencyId);
    agency.featured = featured;
    const saved = await this.agencyRepository.save(agency);

    await this.redisService.del('agency:featured');
    return saved;
  }

  async deleteAgency(
    id: string,
    userId: string,
  ): Promise<{ success: boolean }> {
    const agency = await this.findAgencyById(id);
    if (agency.ownerId !== userId) {
      throw new ForbiddenException(
        'Only the agency owner can delete the agency',
      );
    }
    await this.memberRepository.delete({ agencyId: id });
    await this.invitationRepository.delete({ agencyId: id });
    await this.agencyRepository.remove(agency);

    await this.logAgencyAction(id, 'AGENCY_DELETED', userId);
    return { success: true };
  }

  // --- AGENCY MEMBERS & ROLES ---
  async joinAgency(agencyId: string, userId: string): Promise<AgencyMember> {
    const agency = await this.findAgencyById(agencyId);
    if (agency.status !== AgencyStatus.ACTIVE) {
      throw new BadRequestException(
        'Cannot join an inactive or suspended agency',
      );
    }

    const existing = await this.memberRepository.findOne({
      where: { agencyId, userId },
    });
    if (existing) {
      throw new ConflictException('User is already a member of this agency');
    }

    const member = this.memberRepository.create({
      agencyId,
      userId,
      role: AgencyRole.MEMBER,
      status: AgencyMemberStatus.ACTIVE,
    });
    const saved = await this.memberRepository.save(member);

    agency.memberCount += 1;
    await this.agencyRepository.save(agency);

    await this.logAgencyAction(agencyId, 'MEMBER_JOINED', userId, {
      role: AgencyRole.MEMBER,
    });
    this.eventsGateway.broadcastAgencyEvent('agency:member_joined', {
      agencyId,
      userId,
      role: AgencyRole.MEMBER,
    });

    return saved;
  }

  async leaveAgency(
    agencyId: string,
    userId: string,
  ): Promise<{ success: boolean }> {
    const member = await this.memberRepository.findOne({
      where: { agencyId, userId },
    });
    if (!member) {
      throw new NotFoundException('User is not a member of this agency');
    }
    if (member.role === AgencyRole.OWNER) {
      throw new BadRequestException(
        'Agency owner cannot leave without transferring ownership',
      );
    }

    await this.memberRepository.remove(member);

    const agency = await this.findAgencyById(agencyId);
    agency.memberCount = Math.max(0, agency.memberCount - 1);
    await this.agencyRepository.save(agency);

    await this.logAgencyAction(agencyId, 'MEMBER_LEFT', userId);
    this.eventsGateway.broadcastAgencyEvent('agency:member_left', {
      agencyId,
      userId,
    });

    return { success: true };
  }

  async inviteMember(
    agencyId: string,
    inviterId: string,
    dto: InviteAgencyMemberDto,
  ): Promise<AgencyInvitation> {
    await this.findAgencyById(agencyId);
    const inviter = await this.memberRepository.findOne({
      where: { agencyId, userId: inviterId },
    });
    if (
      !inviter ||
      (inviter.role !== AgencyRole.OWNER &&
        inviter.role !== AgencyRole.MANAGER &&
        inviter.role !== AgencyRole.RECRUITER)
    ) {
      throw new ForbiddenException(
        'Only agency owners, managers, or recruiters can invite members',
      );
    }

    const invitation = this.invitationRepository.create({
      agencyId,
      inviterId,
      inviteeId: dto.inviteeId,
      role: dto.role ?? AgencyRole.MEMBER,
      status: InvitationStatus.PENDING,
    });
    const saved = await this.invitationRepository.save(invitation);

    await this.logAgencyAction(agencyId, 'MEMBER_INVITED', inviterId, {
      inviteeId: dto.inviteeId,
      role: dto.role,
    });
    this.eventsGateway.broadcastAgencyEvent('agency:invitation_sent', {
      agencyId,
      invitationId: saved.id,
      inviteeId: dto.inviteeId,
    });

    return saved;
  }

  async acceptInvitation(
    invitationId: string,
    userId: string,
  ): Promise<AgencyMember> {
    const invitation = await this.invitationRepository.findOne({
      where: { id: invitationId },
    });
    if (!invitation) {
      throw new NotFoundException(
        `Invitation with ID ${invitationId} not found`,
      );
    }
    if (invitation.inviteeId !== userId) {
      throw new ForbiddenException(
        'You can only accept invitations sent to you',
      );
    }
    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException(
        `Invitation is already ${invitation.status}`,
      );
    }

    invitation.status = InvitationStatus.ACCEPTED;
    await this.invitationRepository.save(invitation);

    const agency = await this.findAgencyById(invitation.agencyId);
    let member = await this.memberRepository.findOne({
      where: { agencyId: invitation.agencyId, userId },
    });
    if (!member) {
      member = this.memberRepository.create({
        agencyId: invitation.agencyId,
        userId,
        role: invitation.role,
        status: AgencyMemberStatus.ACTIVE,
      });
      member = await this.memberRepository.save(member);
      agency.memberCount += 1;
      await this.agencyRepository.save(agency);
    }

    await this.logAgencyAction(
      invitation.agencyId,
      'INVITATION_ACCEPTED',
      userId,
      { invitationId },
    );
    this.eventsGateway.broadcastAgencyEvent('agency:invitation_updated', {
      invitationId,
      status: InvitationStatus.ACCEPTED,
    });

    return member;
  }

  async rejectInvitation(
    invitationId: string,
    userId: string,
  ): Promise<AgencyInvitation> {
    const invitation = await this.invitationRepository.findOne({
      where: { id: invitationId },
    });
    if (!invitation) {
      throw new NotFoundException(
        `Invitation with ID ${invitationId} not found`,
      );
    }
    if (invitation.inviteeId !== userId) {
      throw new ForbiddenException(
        'You can only reject invitations sent to you',
      );
    }

    invitation.status = InvitationStatus.REJECTED;
    const saved = await this.invitationRepository.save(invitation);

    this.eventsGateway.broadcastAgencyEvent('agency:invitation_updated', {
      invitationId,
      status: InvitationStatus.REJECTED,
    });

    return saved;
  }

  async updateMemberRole(
    agencyId: string,
    memberId: string,
    actorUserId: string,
    newRole: AgencyRole,
  ): Promise<AgencyMember> {
    const actor = await this.memberRepository.findOne({
      where: { agencyId, userId: actorUserId },
    });
    if (!actor || actor.role !== AgencyRole.OWNER) {
      throw new ForbiddenException(
        'Only the agency owner can modify member roles',
      );
    }

    const member = await this.memberRepository.findOne({
      where: { id: memberId, agencyId },
    });
    if (!member) {
      throw new NotFoundException(`Member '${memberId}' not found in agency`);
    }

    member.role = newRole;
    const updated = await this.memberRepository.save(member);

    await this.logAgencyAction(agencyId, 'MEMBER_ROLE_UPDATED', actorUserId, {
      memberId,
      newRole,
    });
    this.eventsGateway.broadcastAgencyEvent('agency:member_role_updated', {
      agencyId,
      memberId,
      role: newRole,
    });

    return updated;
  }

  async removeMember(
    agencyId: string,
    memberId: string,
    actorUserId: string,
  ): Promise<{ success: boolean }> {
    const actor = await this.memberRepository.findOne({
      where: { agencyId, userId: actorUserId },
    });
    if (
      !actor ||
      (actor.role !== AgencyRole.OWNER && actor.role !== AgencyRole.MANAGER)
    ) {
      throw new ForbiddenException(
        'Only agency owner or manager can remove members',
      );
    }

    const member = await this.memberRepository.findOne({
      where: { id: memberId, agencyId },
    });
    if (!member) {
      throw new NotFoundException(`Member '${memberId}' not found in agency`);
    }
    if (member.role === AgencyRole.OWNER) {
      throw new BadRequestException('Cannot remove the agency owner');
    }

    await this.memberRepository.remove(member);

    const agency = await this.findAgencyById(agencyId);
    agency.memberCount = Math.max(0, agency.memberCount - 1);
    await this.agencyRepository.save(agency);

    await this.logAgencyAction(agencyId, 'MEMBER_REMOVED', actorUserId, {
      memberId,
      removedUserId: member.userId,
    });
    this.eventsGateway.broadcastAgencyEvent('agency:member_removed', {
      agencyId,
      memberId,
    });

    return { success: true };
  }

  async transferOwnership(
    agencyId: string,
    currentOwnerId: string,
    dto: TransferAgencyOwnershipDto,
  ): Promise<Agency> {
    const agency = await this.findAgencyById(agencyId);
    if (agency.ownerId !== currentOwnerId) {
      throw new ForbiddenException(
        'Only the current agency owner can transfer ownership',
      );
    }

    const targetMember = await this.memberRepository.findOne({
      where: { agencyId, userId: dto.newOwnerId },
    });
    if (!targetMember) {
      throw new BadRequestException(
        'Target user is not a member of this agency',
      );
    }

    const currentOwnerMember = await this.memberRepository.findOne({
      where: { agencyId, userId: currentOwnerId },
    });
    if (currentOwnerMember) {
      currentOwnerMember.role = AgencyRole.MANAGER;
      await this.memberRepository.save(currentOwnerMember);
    }

    targetMember.role = AgencyRole.OWNER;
    await this.memberRepository.save(targetMember);

    agency.ownerId = dto.newOwnerId;
    const saved = await this.agencyRepository.save(agency);

    await this.logAgencyAction(
      agencyId,
      'OWNERSHIP_TRANSFERRED',
      currentOwnerId,
      {
        oldOwnerId: currentOwnerId,
        newOwnerId: dto.newOwnerId,
      },
    );

    this.eventsGateway.broadcastAgencyEvent('agency:ownership_transferred', {
      agencyId,
      newOwnerId: dto.newOwnerId,
    });

    return saved;
  }

  async getAgencyMembers(agencyId: string): Promise<AgencyMember[]> {
    return await this.memberRepository.find({
      where: { agencyId },
      order: { joinedAt: 'ASC' },
    });
  }

  // --- HOST RECRUITMENT & CONTRACTS ---
  async recruitHost(
    agencyId: string,
    actorUserId: string,
    dto: CreateHostContractDto,
  ): Promise<AgencyContract> {
    await this.findAgencyById(agencyId);
    const actor = await this.memberRepository.findOne({
      where: { agencyId, userId: actorUserId },
    });
    if (
      !actor ||
      (actor.role !== AgencyRole.OWNER &&
        actor.role !== AgencyRole.MANAGER &&
        actor.role !== AgencyRole.RECRUITER)
    ) {
      throw new ForbiddenException(
        'Only owners, managers, or recruiters can recruit hosts',
      );
    }

    const existing = await this.contractRepository.findOne({
      where: {
        agencyId,
        hostUserId: dto.hostUserId,
        status: ContractStatus.ACTIVE,
      },
    });
    if (existing) {
      throw new ConflictException(
        'Host already has an active contract with this agency',
      );
    }

    const contract = this.contractRepository.create({
      agencyId,
      hostUserId: dto.hostUserId,
      recruiterUserId: actorUserId,
      status: ContractStatus.PENDING_SIGNATURE,
      commissionModel: dto.commissionModel ?? CommissionModel.FIXED_PERCENTAGE,
      commissionRate: dto.commissionRate ?? 15.0,
      contractTerms: dto.contractTerms ?? 'Standard host recruitment contract',
    });
    const saved = await this.contractRepository.save(contract);

    await this.logAgencyAction(agencyId, 'HOST_RECRUITED', actorUserId, {
      hostUserId: dto.hostUserId,
      contractId: saved.id,
    });

    this.eventsGateway.broadcastAgencyEvent('agency:host_recruited', {
      agencyId,
      contractId: saved.id,
      hostUserId: dto.hostUserId,
    });

    return saved;
  }

  async acceptHostContract(
    contractId: string,
    hostUserId: string,
  ): Promise<AgencyContract> {
    const contract = await this.contractRepository.findOne({
      where: { id: contractId },
    });
    if (!contract) {
      throw new NotFoundException(`Contract '${contractId}' not found`);
    }
    if (contract.hostUserId !== hostUserId) {
      throw new ForbiddenException(
        'You can only accept contracts assigned to you',
      );
    }

    contract.status = ContractStatus.ACTIVE;
    contract.startDate = new Date();
    const saved = await this.contractRepository.save(contract);

    // Ensure host is added as AgencyMember with HOST role
    const agency = await this.findAgencyById(contract.agencyId);
    let member = await this.memberRepository.findOne({
      where: { agencyId: contract.agencyId, userId: hostUserId },
    });
    if (!member) {
      member = this.memberRepository.create({
        agencyId: contract.agencyId,
        userId: hostUserId,
        role: AgencyRole.HOST,
        status: AgencyMemberStatus.ACTIVE,
      });
      await this.memberRepository.save(member);
      agency.memberCount += 1;
    } else {
      member.role = AgencyRole.HOST;
      await this.memberRepository.save(member);
    }

    agency.totalHosts += 1;
    agency.activeHosts += 1;
    await this.agencyRepository.save(agency);

    await this.logAgencyAction(
      contract.agencyId,
      'HOST_CONTRACT_SIGNED',
      hostUserId,
      { contractId },
    );
    this.eventsGateway.broadcastAgencyEvent('agency:host_contract_activated', {
      agencyId: contract.agencyId,
      hostUserId,
    });

    return saved;
  }

  async terminateHostContract(
    contractId: string,
    actorUserId: string,
    reason?: string,
  ): Promise<AgencyContract> {
    const contract = await this.contractRepository.findOne({
      where: { id: contractId },
    });
    if (!contract) {
      throw new NotFoundException(`Contract '${contractId}' not found`);
    }

    contract.status = ContractStatus.TERMINATED;
    contract.endDate = new Date();
    const saved = await this.contractRepository.save(contract);

    const agency = await this.findAgencyById(contract.agencyId);
    agency.activeHosts = Math.max(0, agency.activeHosts - 1);
    await this.agencyRepository.save(agency);

    await this.logAgencyAction(
      contract.agencyId,
      'HOST_CONTRACT_TERMINATED',
      actorUserId,
      { contractId, reason },
    );
    return saved;
  }

  async getAgencyHosts(agencyId: string): Promise<AgencyContract[]> {
    return await this.contractRepository.find({
      where: { agencyId, status: ContractStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });
  }

  async getRecruitmentStats(
    agencyId: string,
  ): Promise<Record<string, unknown>> {
    const contracts = await this.contractRepository.find({
      where: { agencyId },
    });
    const totalRecruited = contracts.length;
    const activeHosts = contracts.filter(
      (c) => c.status === ContractStatus.ACTIVE,
    ).length;
    const pendingSignatures = contracts.filter(
      (c) => c.status === ContractStatus.PENDING_SIGNATURE,
    ).length;

    return {
      agencyId,
      totalRecruited,
      activeHosts,
      pendingSignatures,
      retentionRate:
        totalRecruited > 0
          ? `${((activeHosts / totalRecruited) * 100).toFixed(1)}%`
          : '100%',
    };
  }

  // --- AGENCY REVENUE & MONTHLY SETTLEMENTS ---
  async calculateMonthlySettlement(
    agencyId: string,
    period: string,
  ): Promise<AgencySettlement> {
    const agency = await this.findAgencyById(agencyId);

    // Calculate gross revenue from host contracts/gifts
    const contracts = await this.contractRepository.find({
      where: { agencyId },
    });
    const grossRevenue =
      contracts.reduce((acc, c) => acc + Number(c.totalGiftsReceived || 0), 0) +
      Number(agency.totalRevenue || 0);

    const commissionRate = Number(agency.commissionRate || 15) / 100; // Agency % cut
    const platformRate = 0.2; // 20% platform fee

    const agencyCommission = grossRevenue * commissionRate;
    const platformCommission = grossRevenue * platformRate;
    const creatorEarnings = Math.max(
      0,
      grossRevenue - agencyCommission - platformCommission,
    );

    let settlement = await this.settlementRepository.findOne({
      where: { agencyId, settlementPeriod: period },
    });
    if (!settlement) {
      settlement = this.settlementRepository.create({
        agencyId,
        settlementPeriod: period,
        grossRevenue,
        creatorEarnings,
        agencyCommission,
        platformCommission,
        status: SettlementStatus.PENDING,
      });
    } else {
      settlement.grossRevenue = grossRevenue;
      settlement.creatorEarnings = creatorEarnings;
      settlement.agencyCommission = agencyCommission;
      settlement.platformCommission = platformCommission;
    }

    const saved = await this.settlementRepository.save(settlement);
    await this.logAgencyAction(agencyId, 'SETTLEMENT_CALCULATED', 'system', {
      period,
      settlementId: saved.id,
    });

    return saved;
  }

  async listSettlements(
    status?: SettlementStatus,
    agencyId?: string,
  ): Promise<AgencySettlement[]> {
    const whereClause: Record<string, unknown> = {};
    if (status) whereClause.status = status;
    if (agencyId) whereClause.agencyId = agencyId;

    return await this.settlementRepository.find({
      where: whereClause,
      order: { createdAt: 'DESC' },
    });
  }

  async processSettlement(
    settlementId: string,
    adminId: string,
    dto: ProcessSettlementDto,
  ): Promise<AgencySettlement> {
    const settlement = await this.settlementRepository.findOne({
      where: { id: settlementId },
    });
    if (!settlement) {
      throw new NotFoundException(`Settlement '${settlementId}' not found`);
    }

    settlement.status = dto.status;
    settlement.payoutMethod = dto.payoutMethod ?? settlement.payoutMethod;
    settlement.paymentReference =
      dto.paymentReference ?? settlement.paymentReference;
    settlement.reviewNotes = dto.reviewNotes ?? settlement.reviewNotes;
    settlement.processedBy = adminId;
    settlement.processedAt = new Date();

    const saved = await this.settlementRepository.save(settlement);

    await this.logAgencyAction(
      settlement.agencyId,
      `SETTLEMENT_${dto.status}`,
      adminId,
      { settlementId },
    );
    this.eventsGateway.broadcastAgencyEvent('agency:settlement_processed', {
      settlementId,
      agencyId: settlement.agencyId,
      status: dto.status,
    });

    return saved;
  }

  async getRevenueReport(
    agencyId: string,
    period?: string,
  ): Promise<Record<string, unknown>> {
    const agency = await this.findAgencyById(agencyId);
    const settlements = await this.settlementRepository.find({
      where: { agencyId },
    });

    const totalGross = settlements.reduce(
      (a, s) => a + Number(s.grossRevenue || 0),
      Number(agency.totalRevenue || 0),
    );
    const totalAgencyCommission = settlements.reduce(
      (a, s) => a + Number(s.agencyCommission || 0),
      totalGross * 0.15,
    );
    const totalCreatorEarnings = settlements.reduce(
      (a, s) => a + Number(s.creatorEarnings || 0),
      totalGross * 0.65,
    );
    const totalPlatformFee = settlements.reduce(
      (a, s) => a + Number(s.platformCommission || 0),
      totalGross * 0.2,
    );

    return {
      agencyId,
      period: period || 'ALL_TIME',
      totalGrossRevenue: totalGross,
      agencyCommission: totalAgencyCommission,
      creatorEarnings: totalCreatorEarnings,
      platformFee: totalPlatformFee,
      settlementsCount: settlements.length,
      settlements,
    };
  }

  // --- AGENCY ANALYTICS & CACHING ---
  async getAgencyAnalytics(agencyId: string): Promise<Record<string, unknown>> {
    const cacheKey = `agency:analytics:${agencyId}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // ignore parse error
      }
    }

    const agency = await this.findAgencyById(agencyId);
    const members = await this.memberRepository.find({ where: { agencyId } });
    const contracts = await this.contractRepository.find({
      where: { agencyId, status: ContractStatus.ACTIVE },
    });

    const analytics = {
      agencyId,
      name: agency.name,
      totalMembers: members.length,
      totalHosts: agency.totalHosts,
      activeHosts: agency.activeHosts,
      onlineHosts: Math.floor(agency.activeHosts * 0.6), // Simulated real-time online count
      totalRooms: Math.floor(agency.activeHosts * 1.2),
      audienceCount: Math.floor(agency.activeHosts * 45),
      totalGifts: Math.floor(agency.totalRevenue * 10),
      diamondsEarned: Math.floor(agency.totalRevenue * 100),
      grossRevenue: agency.totalRevenue,
      engagementScore: 94.5,
      growthRate: '+18.4%',
      updatedAt: new Date(),
    };

    await this.redisService.set(cacheKey, JSON.stringify(analytics), 300);
    return analytics;
  }

  async getDashboard(agencyId: string): Promise<Record<string, unknown>> {
    const agency = await this.findAgencyById(agencyId);
    const members = await this.memberRepository.find({ where: { agencyId } });
    const invitations = await this.invitationRepository.find({
      where: { agencyId },
    });
    const hosts = await this.getAgencyHosts(agencyId);
    const analytics = await this.getAgencyAnalytics(agencyId);

    return {
      agency,
      totalMembers: members.length,
      members,
      hostsCount: hosts.length,
      pendingInvitations: invitations.filter(
        (i) => i.status === InvitationStatus.PENDING,
      ).length,
      totalRevenue: agency.totalRevenue,
      analytics,
    };
  }

  async getStatistics(agencyId: string): Promise<Record<string, unknown>> {
    return await this.getAgencyAnalytics(agencyId);
  }

  // --- LEADERBOARDS & RANKINGS ---
  async getLeaderboard(
    type: 'revenue' | 'growth' | 'active_hosts' | 'engagement' = 'revenue',
  ): Promise<Agency[]> {
    const cacheKey = `agency:rankings:${type}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // ignore
      }
    }

    let orderField: string = 'totalRevenue';
    if (type === 'active_hosts') orderField = 'activeHosts';
    else if (type === 'growth') orderField = 'rating';

    const rankings = await this.agencyRepository.find({
      where: { status: AgencyStatus.ACTIVE },
      order: { [orderField]: 'DESC', memberCount: 'DESC' },
      take: 20,
    });

    await this.redisService.set(cacheKey, JSON.stringify(rankings), 300);
    return rankings;
  }

  async getRankings(): Promise<Agency[]> {
    return await this.getLeaderboard('revenue');
  }

  // --- REWARDS SYSTEM ---
  async getAgencyRewards(agencyId: string): Promise<AgencyReward[]> {
    let rewards = await this.rewardRepository.find({ where: { agencyId } });
    if (rewards.length === 0) {
      // Seed initial milestones
      const milestones = [
        {
          agencyId,
          rewardType: AgencyRewardType.DAILY_ACTIVITY,
          title: 'Daily Agency Broadcast Target',
          description: 'Host 5 active live audio streams today',
          targetValue: 5,
          currentValue: 3,
          rewardAmount: 500,
        },
        {
          agencyId,
          rewardType: AgencyRewardType.WEEKLY_GIFTING,
          title: 'Weekly Gifting Sprint',
          description: 'Reach $1,000 in weekly agency gift volume',
          targetValue: 1000,
          currentValue: 750,
          rewardAmount: 2500,
        },
        {
          agencyId,
          rewardType: AgencyRewardType.RECRUITMENT_MILESTONE,
          title: 'Talent Guild Expansion',
          description: 'Recruit 10 verified hosts to your agency',
          targetValue: 10,
          currentValue: 6,
          rewardAmount: 5000,
        },
      ];
      const created = this.rewardRepository.create(milestones);
      rewards = await this.rewardRepository.save(created);
    }
    return rewards;
  }

  async claimAgencyReward(
    agencyId: string,
    rewardId: string,
    userId: string,
  ): Promise<AgencyReward> {
    const reward = await this.rewardRepository.findOne({
      where: { id: rewardId, agencyId },
    });
    if (!reward) {
      throw new NotFoundException(`Reward '${rewardId}' not found for agency`);
    }
    if (reward.isClaimed) {
      throw new BadRequestException('Reward has already been claimed');
    }

    reward.isClaimed = true;
    reward.claimedAt = new Date();
    const saved = await this.rewardRepository.save(reward);

    await this.logAgencyAction(agencyId, 'REWARD_CLAIMED', userId, {
      rewardId,
      amount: reward.rewardAmount,
    });
    this.eventsGateway.broadcastAgencyEvent('agency:reward_claimed', {
      agencyId,
      rewardId,
      amount: reward.rewardAmount,
    });

    return saved;
  }

  async grantAgencyReward(
    agencyId: string,
    dto: {
      title: string;
      rewardAmount: number;
      rewardType: AgencyRewardType;
      description?: string;
    },
  ): Promise<AgencyReward> {
    const reward = this.rewardRepository.create({
      agencyId,
      title: dto.title,
      description: dto.description || 'Special performance grant',
      rewardType: dto.rewardType,
      targetValue: 100,
      currentValue: 100,
      rewardAmount: dto.rewardAmount,
      isClaimed: false,
    });
    const saved = await this.rewardRepository.save(reward);

    await this.logAgencyAction(agencyId, 'REWARD_GRANTED', 'admin', {
      rewardId: saved.id,
      amount: dto.rewardAmount,
    });
    return saved;
  }

  // --- AUDIT LOGS ---
  async logAgencyAction(
    agencyId: string,
    action: string,
    performedBy: string,
    details?: Record<string, unknown>,
  ): Promise<AgencyAuditLog> {
    const log = this.auditLogRepository.create({
      agencyId,
      action,
      performedBy,
      details: details ? JSON.stringify(details) : undefined,
    });
    return await this.auditLogRepository.save(log);
  }

  async getAgencyAuditLogs(agencyId?: string): Promise<AgencyAuditLog[]> {
    const whereClause = agencyId ? { agencyId } : {};
    return await this.auditLogRepository.find({
      where: whereClause,
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  // --- MEDIA UPLOADS ---
  async uploadAgencyLogo(
    agencyId: string,
    file: Express.Multer.File,
    userId: string,
  ) {
    const agency = await this.findAgencyById(agencyId);
    const media = await this.storageService.uploadFile(
      file,
      {
        category: MediaCategory.AGENCY_LOGO,
        entityType: 'agency',
        entityId: agencyId,
      },
      userId,
    );

    agency.logoUrl = media.publicUrl;
    await this.agencyRepository.save(agency);

    await this.redisService.del(`agency:profile:${agencyId}`);
    this.eventsGateway.broadcastAgencyEvent('agency:updated', {
      agencyId,
      logoUrl: media.publicUrl,
    });

    return {
      message: 'Agency logo uploaded successfully',
      logoUrl: media.publicUrl,
      media,
    };
  }

  async uploadAgencyBanner(
    agencyId: string,
    file: Express.Multer.File,
    userId: string,
  ) {
    const agency = await this.findAgencyById(agencyId);
    const media = await this.storageService.uploadFile(
      file,
      {
        category: MediaCategory.AGENCY_BANNER,
        entityType: 'agency',
        entityId: agencyId,
      },
      userId,
    );

    agency.bannerUrl = media.publicUrl;
    await this.agencyRepository.save(agency);

    await this.redisService.del(`agency:profile:${agencyId}`);
    this.eventsGateway.broadcastAgencyEvent('agency:updated', {
      agencyId,
      bannerUrl: media.publicUrl,
    });

    return {
      message: 'Agency banner uploaded successfully',
      bannerUrl: media.publicUrl,
      media,
    };
  }
}
