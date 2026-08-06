import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScheduledRoom } from './entities/scheduled-room.entity';
import { RoomTicket } from './entities/room-ticket.entity';
import { Club } from '../clubs/entities/club.entity';
import { CreateScheduledRoomDto } from './dto/create-scheduled-room.dto';
import { UpdateScheduledRoomDto } from './dto/update-scheduled-room.dto';
import { QueryScheduledRoomDto } from './dto/query-scheduled-room.dto';
import { RegisterReminderDto } from './dto/register-reminder.dto';
import { ScheduledRoomStatus, TicketStatus } from '../../common/enums';
import { AdminSettingsService } from '../admin/admin-settings.service';
import { HostsService } from '../hosts/hosts.service';
import { HostVerificationStatus } from '../hosts/entities/host-profile.entity';

@Injectable()
export class ScheduledRoomsService {
  constructor(
    @InjectRepository(ScheduledRoom)
    private readonly scheduledRoomRepository: Repository<ScheduledRoom>,
    @InjectRepository(RoomTicket)
    private readonly ticketRepository: Repository<RoomTicket>,
    @InjectRepository(Club)
    private readonly clubRepository: Repository<Club>,
    private readonly adminSettingsService: AdminSettingsService,
    private readonly hostsService: HostsService,
  ) {}

  async createScheduledRoom(
    userId: string,
    createDto: CreateScheduledRoomDto,
  ): Promise<ScheduledRoom> {
    await this.assertApprovedHost(userId);

    if (createDto.clubId) {
      const club = await this.clubRepository.findOne({
        where: { id: createDto.clubId },
      });
      if (!club) {
        throw new NotFoundException(
          `Club with ID "${createDto.clubId}" not found`,
        );
      }
    }

    const startTime = new Date(createDto.scheduledStartTime);
    if (isNaN(startTime.getTime()) || startTime.getTime() <= Date.now()) {
      throw new BadRequestException(
        'Scheduled start time must be a valid future date',
      );
    }

    const operationalSettings =
      await this.adminSettingsService.getOperationalSettings();
    const maxParticipants =
      createDto.maxParticipants ?? operationalSettings.maxRoomCapacity;
    if (maxParticipants > operationalSettings.maxRoomCapacity) {
      throw new BadRequestException(
        `Room capacity cannot exceed the configured maximum of ${operationalSettings.maxRoomCapacity}`,
      );
    }

    const scheduledRoom = this.scheduledRoomRepository.create({
      ...createDto,
      maxParticipants,
      scheduledStartTime: startTime,
      hostId: userId,
      status: ScheduledRoomStatus.SCHEDULED,
      rsvpCount: 0,
    });

    return this.scheduledRoomRepository.save(scheduledRoom);
  }

  private async assertApprovedHost(userId: string): Promise<void> {
    let host;
    try {
      host = await this.hostsService.getHostProfile(userId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new ForbiddenException(
          'Only an approved Host can schedule live rooms',
        );
      }
      throw error;
    }
    if (host.status !== HostVerificationStatus.APPROVED) {
      throw new ForbiddenException(
        'Only an approved Host can schedule live rooms',
      );
    }
  }

  async findAll(queryDto: QueryScheduledRoomDto) {
    const page = queryDto.page || 1;
    const limit = queryDto.limit || 10;
    const skip = (page - 1) * limit;

    const qb = this.scheduledRoomRepository
      .createQueryBuilder('sr')
      .leftJoinAndSelect('sr.host', 'host')
      .leftJoinAndSelect('sr.club', 'club');

    if (queryDto.search) {
      qb.andWhere(
        '(LOWER(sr.title) LIKE LOWER(:search) OR LOWER(sr.description) LIKE LOWER(:search))',
        { search: `%${queryDto.search}%` },
      );
    }

    if (queryDto.category) {
      qb.andWhere('LOWER(sr.category) = LOWER(:category)', {
        category: queryDto.category,
      });
    }

    if (queryDto.hostId) {
      qb.andWhere('sr.hostId = :hostId', { hostId: queryDto.hostId });
    }

    if (queryDto.clubId) {
      qb.andWhere('sr.clubId = :clubId', { clubId: queryDto.clubId });
    }

    if (queryDto.status) {
      qb.andWhere('sr.status = :status', { status: queryDto.status });
    }

    if (queryDto.visibility) {
      qb.andWhere('sr.visibility = :visibility', {
        visibility: queryDto.visibility,
      });
    }

    if (queryDto.isPremium !== undefined) {
      qb.andWhere('sr.isPremium = :isPremium', {
        isPremium: queryDto.isPremium,
      });
    }

    qb.orderBy('sr.scheduledStartTime', 'ASC').skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<ScheduledRoom> {
    const room = await this.scheduledRoomRepository.findOne({
      where: { id },
      relations: { host: true, club: true },
    });

    if (!room) {
      throw new NotFoundException(`Scheduled room with ID "${id}" not found`);
    }

    return room;
  }

  async updateScheduledRoom(
    id: string,
    userId: string,
    updateDto: UpdateScheduledRoomDto,
  ): Promise<ScheduledRoom> {
    const room = await this.findOne(id);

    if (room.hostId !== userId) {
      throw new ForbiddenException(
        'Only the host can update this scheduled room',
      );
    }

    if (
      room.status !== ScheduledRoomStatus.SCHEDULED &&
      room.status !== ScheduledRoomStatus.POSTPONED
    ) {
      throw new BadRequestException(
        `Cannot update a scheduled room while it is ${room.status}`,
      );
    }

    if (updateDto.clubId) {
      const club = await this.clubRepository.findOne({
        where: { id: updateDto.clubId },
      });
      if (!club) {
        throw new NotFoundException(
          `Club with ID "${updateDto.clubId}" not found`,
        );
      }
    }

    if (updateDto.maxParticipants !== undefined) {
      const operationalSettings =
        await this.adminSettingsService.getOperationalSettings();
      if (updateDto.maxParticipants > operationalSettings.maxRoomCapacity) {
        throw new BadRequestException(
          `Room capacity cannot exceed the configured maximum of ${operationalSettings.maxRoomCapacity}`,
        );
      }
    }

    if (updateDto.scheduledStartTime) {
      const startTime = new Date(updateDto.scheduledStartTime);
      if (isNaN(startTime.getTime()) || startTime.getTime() <= Date.now()) {
        throw new BadRequestException(
          'Scheduled start time must be a valid future date',
        );
      }
      room.scheduledStartTime = startTime;
    }

    const { scheduledStartTime, ...rest } = updateDto;
    Object.assign(room, rest);

    return this.scheduledRoomRepository.save(room);
  }

  async deleteScheduledRoom(
    id: string,
    userId: string,
  ): Promise<{ message: string }> {
    const room = await this.findOne(id);

    if (room.hostId !== userId) {
      throw new ForbiddenException(
        'Only the host can cancel this scheduled room',
      );
    }

    if (
      room.status !== ScheduledRoomStatus.SCHEDULED &&
      room.status !== ScheduledRoomStatus.POSTPONED
    ) {
      throw new BadRequestException(
        `Cannot cancel a scheduled room while it is ${room.status}`,
      );
    }

    room.status = ScheduledRoomStatus.CANCELLED;
    await this.scheduledRoomRepository.save(room);

    return { message: 'Scheduled room cancelled successfully' };
  }

  async getLobbyInfo(id: string, userId?: string) {
    const room = await this.findOne(id);

    const ticketsSold = await this.ticketRepository.count({
      where: {
        scheduledRoomId: id,
        isValid: true,
        status: TicketStatus.ACTIVE,
      },
    });

    let userTicket: RoomTicket | null = null;
    if (userId) {
      userTicket = await this.ticketRepository.findOne({
        where: {
          scheduledRoomId: id,
          userId,
          isValid: true,
          status: TicketStatus.ACTIVE,
        },
      });
    }

    const startTimeMs = new Date(room.scheduledStartTime).getTime();
    const countdownSeconds = Math.max(
      0,
      Math.floor((startTimeMs - Date.now()) / 1000),
    );

    return {
      scheduledRoom: room,
      host: room.host,
      club: room.club,
      countdownSeconds,
      hasTicket: !!userTicket,
      userTicket: userTicket || null,
      rsvpCount: room.rsvpCount,
      ticketsSold,
      isCapacityFull: ticketsSold >= room.maxParticipants,
      isLive: room.status === ScheduledRoomStatus.LIVE,
    };
  }

  async registerReminder(
    id: string,
    userId: string,
    reminderDto?: RegisterReminderDto,
  ) {
    const room = await this.findOne(id);

    if (
      room.status === ScheduledRoomStatus.CANCELLED ||
      room.status === ScheduledRoomStatus.COMPLETED
    ) {
      throw new BadRequestException(
        'Cannot set reminder for cancelled or completed room',
      );
    }

    room.rsvpCount += 1;
    await this.scheduledRoomRepository.save(room);

    return {
      message: 'Reminder registered successfully',
      scheduledRoomId: id,
      userId,
      rsvpCount: room.rsvpCount,
      settings: reminderDto || { enablePush: true, enableEmail: false },
    };
  }
}
