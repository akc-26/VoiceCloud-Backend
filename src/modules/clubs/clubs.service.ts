import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Club } from './entities/club.entity';
import { ClubMember } from './entities/club-member.entity';
import { CreateClubDto } from './dto/create-club.dto';
import { UpdateClubDto } from './dto/update-club.dto';
import { JoinClubDto } from './dto/join-club.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { QueryClubDto } from './dto/query-club.dto';
import { ClubRole, VisibilityType } from '../../common/enums';

@Injectable()
export class ClubsService {
  constructor(
    @InjectRepository(Club)
    private readonly clubRepository: Repository<Club>,
    @InjectRepository(ClubMember)
    private readonly memberRepository: Repository<ClubMember>,
  ) {}

  async createClub(
    userId: string,
    createClubDto: CreateClubDto,
  ): Promise<Club> {
    const existing = await this.clubRepository.findOne({
      where: { handle: createClubDto.handle },
    });
    if (existing) {
      throw new ConflictException(
        `Club handle "${createClubDto.handle}" is already taken`,
      );
    }

    const club = this.clubRepository.create({
      ...createClubDto,
      ownerId: userId,
      memberCount: 1,
      hostCount: 1,
    });

    const savedClub = await this.clubRepository.save(club);

    const ownerMember = this.memberRepository.create({
      clubId: savedClub.id,
      userId,
      role: ClubRole.OWNER,
    });
    await this.memberRepository.save(ownerMember);

    return savedClub;
  }

  async findAll(queryDto: QueryClubDto) {
    const page = queryDto.page || 1;
    const limit = queryDto.limit || 10;
    const skip = (page - 1) * limit;

    const qb = this.clubRepository
      .createQueryBuilder('club')
      .leftJoinAndSelect('club.owner', 'owner');

    if (queryDto.search) {
      qb.andWhere(
        '(LOWER(club.name) LIKE LOWER(:search) OR LOWER(club.handle) LIKE LOWER(:search) OR LOWER(club.description) LIKE LOWER(:search))',
        { search: `%${queryDto.search}%` },
      );
    }

    if (queryDto.category) {
      qb.andWhere('LOWER(club.category) = LOWER(:category)', {
        category: queryDto.category,
      });
    }

    if (queryDto.visibility) {
      qb.andWhere('club.visibility = :visibility', {
        visibility: queryDto.visibility,
      });
    }

    qb.orderBy('club.createdAt', 'DESC').skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Club> {
    const club = await this.clubRepository.findOne({
      where: [{ id }, { handle: id }],
      relations: { owner: true },
    });

    if (!club) {
      throw new NotFoundException(`Club with ID or handle "${id}" not found`);
    }

    return club;
  }

  async updateClub(
    id: string,
    userId: string,
    updateClubDto: UpdateClubDto,
  ): Promise<Club> {
    const club = await this.findOne(id);

    const callerMember = await this.memberRepository.findOne({
      where: { clubId: club.id, userId },
    });

    if (
      !callerMember ||
      (callerMember.role !== ClubRole.OWNER &&
        callerMember.role !== ClubRole.ADMIN)
    ) {
      throw new ForbiddenException(
        'Only club owner or admin can update club details',
      );
    }

    if (updateClubDto.handle && updateClubDto.handle !== club.handle) {
      const existing = await this.clubRepository.findOne({
        where: { handle: updateClubDto.handle },
      });
      if (existing) {
        throw new ConflictException(
          `Club handle "${updateClubDto.handle}" is already taken`,
        );
      }
    }

    Object.assign(club, updateClubDto);
    return this.clubRepository.save(club);
  }

  async deleteClub(id: string, userId: string): Promise<{ message: string }> {
    const club = await this.findOne(id);

    if (club.ownerId !== userId) {
      const callerMember = await this.memberRepository.findOne({
        where: { clubId: club.id, userId },
      });
      if (!callerMember || callerMember.role !== ClubRole.OWNER) {
        throw new ForbiddenException('Only the club owner can delete the club');
      }
    }

    await this.clubRepository.remove(club);
    return { message: 'Club deleted successfully' };
  }

  async joinClub(
    id: string,
    userId: string,
    joinDto?: JoinClubDto,
  ): Promise<ClubMember> {
    const club = await this.findOne(id);

    const existing = await this.memberRepository.findOne({
      where: { clubId: club.id, userId },
    });
    if (existing) {
      throw new ConflictException('User is already a member of this club');
    }

    if (club.visibility === VisibilityType.PRIVATE) {
      if (!joinDto?.inviteCode) {
        throw new ForbiddenException(
          'Cannot join private club without a valid invitation code',
        );
      }
    }

    const newMember = this.memberRepository.create({
      clubId: club.id,
      userId,
      role: ClubRole.MEMBER,
    });

    const savedMember = await this.memberRepository.save(newMember);

    club.memberCount += 1;
    await this.clubRepository.save(club);

    return savedMember;
  }

  async leaveClub(id: string, userId: string): Promise<{ message: string }> {
    const club = await this.findOne(id);

    const member = await this.memberRepository.findOne({
      where: { clubId: club.id, userId },
    });

    if (!member) {
      throw new NotFoundException('User is not a member of this club');
    }

    if (member.role === ClubRole.OWNER || club.ownerId === userId) {
      throw new BadRequestException(
        'Club owner cannot leave the club. Transfer ownership or delete the club.',
      );
    }

    await this.memberRepository.remove(member);

    club.memberCount = Math.max(0, club.memberCount - 1);
    if (member.role === ClubRole.ADMIN || member.role === ClubRole.MODERATOR) {
      club.hostCount = Math.max(1, club.hostCount - 1);
    }
    await this.clubRepository.save(club);

    return { message: 'Successfully left the club' };
  }

  async getMembers(id: string, page = 1, limit = 10, search?: string) {
    const club = await this.findOne(id);
    const skip = (page - 1) * limit;

    const qb = this.memberRepository
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.user', 'user')
      .where('member.clubId = :clubId', { clubId: club.id });

    if (search) {
      qb.andWhere(
        '(LOWER(user.username) LIKE LOWER(:search) OR LOWER(user.displayName) LIKE LOWER(:search))',
        { search: `%${search}%` },
      );
    }

    qb.orderBy('member.joinedAt', 'ASC').skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateMemberRole(
    id: string,
    targetUserId: string,
    callerUserId: string,
    updateRoleDto: UpdateMemberRoleDto,
  ): Promise<ClubMember> {
    const club = await this.findOne(id);

    const callerMember = await this.memberRepository.findOne({
      where: { clubId: club.id, userId: callerUserId },
    });

    if (
      !callerMember ||
      (callerMember.role !== ClubRole.OWNER &&
        callerMember.role !== ClubRole.ADMIN)
    ) {
      throw new ForbiddenException(
        'Only club owner or admin can update member roles',
      );
    }

    const targetMember = await this.memberRepository.findOne({
      where: { clubId: club.id, userId: targetUserId },
    });

    if (!targetMember) {
      throw new NotFoundException('Target member not found in this club');
    }

    if (targetMember.role === ClubRole.OWNER && callerUserId !== club.ownerId) {
      throw new ForbiddenException(
        'Cannot modify owner role unless you are the owner',
      );
    }

    if (updateRoleDto.role === ClubRole.OWNER) {
      if (callerMember.role !== ClubRole.OWNER) {
        throw new ForbiddenException(
          'Only the current owner can transfer ownership',
        );
      }
      callerMember.role = ClubRole.ADMIN;
      await this.memberRepository.save(callerMember);
      club.ownerId = targetUserId;
      await this.clubRepository.save(club);
    }

    targetMember.role = updateRoleDto.role;
    return this.memberRepository.save(targetMember);
  }
}
