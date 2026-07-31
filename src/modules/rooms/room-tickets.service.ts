import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { RoomTicket } from './entities/room-ticket.entity';
import { ScheduledRoom } from './entities/scheduled-room.entity';
import { BuyTicketDto } from './dto/buy-ticket.dto';
import { ScheduledRoomStatus, TicketStatus } from '../../common/enums';

@Injectable()
export class RoomTicketsService {
  constructor(
    @InjectRepository(RoomTicket)
    private readonly ticketRepository: Repository<RoomTicket>,
    @InjectRepository(ScheduledRoom)
    private readonly scheduledRoomRepository: Repository<ScheduledRoom>,
    private readonly dataSource: DataSource,
  ) {}

  async buyTicket(
    scheduledRoomId: string,
    userId: string,
    buyTicketDto?: BuyTicketDto,
  ): Promise<RoomTicket> {
    return this.dataSource.transaction(async (transactionalEntityManager) => {
      const room = await transactionalEntityManager.findOne(ScheduledRoom, {
        where: { id: scheduledRoomId },
      });

      if (!room) {
        throw new NotFoundException(
          `Scheduled room with ID "${scheduledRoomId}" not found`,
        );
      }

      if (
        room.status === ScheduledRoomStatus.CANCELLED ||
        room.status === ScheduledRoomStatus.COMPLETED
      ) {
        throw new BadRequestException(
          'Cannot purchase ticket for a cancelled or completed room',
        );
      }

      const existingTicket = await transactionalEntityManager.findOne(
        RoomTicket,
        {
          where: {
            scheduledRoomId,
            userId,
            isValid: true,
            status: TicketStatus.ACTIVE,
          },
        },
      );

      if (existingTicket) {
        throw new ConflictException(
          'User already owns an active ticket for this room',
        );
      }

      const activeTicketsCount = await transactionalEntityManager.count(
        RoomTicket,
        {
          where: {
            scheduledRoomId,
            isValid: true,
            status: TicketStatus.ACTIVE,
          },
        },
      );

      if (activeTicketsCount >= room.maxParticipants) {
        throw new BadRequestException(
          'Room capacity reached. No tickets available.',
        );
      }

      const randomSuffix = Math.random()
        .toString(36)
        .substring(2, 6)
        .toUpperCase();
      const ticketCode = `TKT-${Date.now().toString(36).toUpperCase()}-${randomSuffix}`;

      const ticket = transactionalEntityManager.create(RoomTicket, {
        ticketCode,
        scheduledRoomId,
        userId,
        priceUsd: room.ticketPriceAmount || 0,
        status: TicketStatus.ACTIVE,
        isValid: true,
        purchasedAt: new Date(),
      });

      const savedTicket = await transactionalEntityManager.save(
        RoomTicket,
        ticket,
      );

      room.rsvpCount += 1;
      await transactionalEntityManager.save(ScheduledRoom, room);

      return savedTicket;
    });
  }

  async getMyTickets(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [data, total] = await this.ticketRepository.findAndCount({
      where: { userId },
      relations: {
        scheduledRoom: {
          host: true,
          club: true,
        },
        room: true,
      },
      order: { purchasedAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getTicketById(ticketId: string, userId: string): Promise<RoomTicket> {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
      relations: { scheduledRoom: true },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID "${ticketId}" not found`);
    }

    if (ticket.userId !== userId) {
      throw new ForbiddenException('You do not own this ticket');
    }

    return ticket;
  }
}
