import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agency, AgencyStatus } from './entities/agency.entity';
import { AgencyMember, AgencyRole } from './entities/agency-member.entity';
import {
  AgencyInvitation,
  InvitationStatus,
} from './entities/agency-invitation.entity';
import { CreateAgencyDto } from './dto/create-agency.dto';
import { UpdateAgencyDto } from './dto/update-agency.dto';
import { InviteAgencyMemberDto } from './dto/invite-agency-member.dto';
import { EventsGateway } from '../../common/events/events.gateway';
import { StorageService } from '../storage/storage.service';
import { MediaCategory } from '../storage/enums/media-category.enum';

@Injectable()
export class AgenciesService {
  constructor(
    @InjectRepository(Agency)
    private readonly agencyRepository: Repository<Agency>,
    @InjectRepository(AgencyMember)
    private readonly memberRepository: Repository<AgencyMember>,
    @InjectRepository(AgencyInvitation)
    private readonly invitationRepository: Repository<AgencyInvitation>,
    private readonly eventsGateway: EventsGateway,
    private readonly storageService: StorageService,
  ) {}

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
    });
    const saved = await this.agencyRepository.save(agency);

    // Add owner as OWNER member
    const ownerMember = this.memberRepository.create({
      agencyId: saved.id,
      userId: ownerId,
      role: AgencyRole.OWNER,
    });
    await this.memberRepository.save(ownerMember);

    this.eventsGateway.broadcastAgencyEvent('agency:status_updated', {
      agencyId: saved.id,
      status: AgencyStatus.ACTIVE,
    });
    return saved;
  }

  async findAllAgencies(): Promise<Agency[]> {
    return await this.agencyRepository.find({
      where: { status: AgencyStatus.ACTIVE },
      order: { totalRevenue: 'DESC', createdAt: 'DESC' },
    });
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
    return await this.agencyRepository.save(agency);
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
    return { success: true };
  }

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
    });
    const saved = await this.memberRepository.save(member);

    agency.memberCount += 1;
    await this.agencyRepository.save(agency);

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
      (inviter.role !== AgencyRole.OWNER && inviter.role !== AgencyRole.MANAGER)
    ) {
      throw new ForbiddenException(
        'Only agency owners or managers can invite members',
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
      });
      member = await this.memberRepository.save(member);
      agency.memberCount += 1;
      await this.agencyRepository.save(agency);
    }

    this.eventsGateway.broadcastAgencyEvent('agency:invitation_updated', {
      invitationId,
      status: InvitationStatus.ACCEPTED,
    });
    this.eventsGateway.broadcastAgencyEvent('agency:member_joined', {
      agencyId: invitation.agencyId,
      userId,
      role: invitation.role,
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

  async getDashboard(agencyId: string): Promise<Record<string, unknown>> {
    const agency = await this.findAgencyById(agencyId);
    const members = await this.memberRepository.find({ where: { agencyId } });
    const invitations = await this.invitationRepository.find({
      where: { agencyId },
    });

    return {
      agency,
      totalMembers: members.length,
      members,
      pendingInvitations: invitations.filter(
        (i) => i.status === InvitationStatus.PENDING,
      ).length,
      totalRevenue: agency.totalRevenue,
    };
  }

  async getStatistics(agencyId: string): Promise<Record<string, unknown>> {
    const agency = await this.findAgencyById(agencyId);
    const members = await this.memberRepository.find({ where: { agencyId } });
    const hostsCount = members.filter((m) => m.role === AgencyRole.HOST).length;
    const managersCount = members.filter(
      (m) => m.role === AgencyRole.MANAGER,
    ).length;

    return {
      agencyId,
      agencyName: agency.name,
      totalMembers: members.length,
      hostsCount,
      managersCount,
      totalRevenue: agency.totalRevenue,
      monthlyGrowthRate: '12.5%',
    };
  }

  async getRankings(): Promise<Agency[]> {
    return await this.agencyRepository.find({
      order: { totalRevenue: 'DESC', memberCount: 'DESC' },
      take: 20,
    });
  }

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
