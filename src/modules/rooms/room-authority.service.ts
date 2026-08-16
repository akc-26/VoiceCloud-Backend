import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room } from './entities/room.entity';
import { RedisService } from '../../redis/redis.service';
import { RedisStateService } from '../../redis/redis-state.service';

@Injectable()
export class RoomAuthorityService {
  constructor(
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    private readonly redisService: RedisService,
    private readonly redisStateService: RedisStateService,
  ) {}

  async getRoomOrThrow(roomId: string): Promise<Room> {
    const room = await this.roomRepository.findOne({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundException(`Room ${roomId} not found`);
    }
    return room;
  }

  async isCoHost(roomId: string, userId: string): Promise<boolean> {
    const raw = await this.redisService.get(`room:${roomId}:cohosts`);
    if (!raw) return false;
    try {
      const coHosts = JSON.parse(raw) as unknown;
      return Array.isArray(coHosts) && coHosts.includes(userId);
    } catch {
      return false;
    }
  }

  async isModerator(roomId: string, userId: string): Promise<boolean> {
    return this.redisStateService.isModerator(roomId, userId);
  }

  async isSpeaker(roomId: string, userId: string): Promise<boolean> {
    return this.redisStateService.isSpeaker(roomId, userId);
  }

  async assertOwnerOrCoHost(userId: string, roomId: string): Promise<Room> {
    const room = await this.getRoomOrThrow(roomId);
    if (room.hostId === userId || (await this.isCoHost(roomId, userId))) {
      return room;
    }
    throw new ForbiddenException(
      'Only the room host or an authorized co-host can perform this action',
    );
  }

  async assertManager(
    userId: string,
    roomId: string,
    options: { allowModerator?: boolean } = { allowModerator: true },
  ): Promise<Room> {
    const room = await this.getRoomOrThrow(roomId);
    if (room.hostId === userId || (await this.isCoHost(roomId, userId))) {
      return room;
    }
    if (
      options.allowModerator !== false &&
      (await this.isModerator(roomId, userId))
    ) {
      return room;
    }
    throw new ForbiddenException(
      'Only the room host, authorized co-host, or moderator can perform this action',
    );
  }
}
