import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room } from './entities/room.entity';
import { RedisService } from '../../redis/redis.service';
import { EventsGateway } from '../../common/events/events.gateway';
import { TriggerSoundEffectDto, UpdateRoomBgmDto, SoundEffectCategory, BgmState } from './dto/soundboard.dto';

export interface SoundEffectPreset {
  id: string;
  name: string;
  category: SoundEffectCategory;
  defaultUrl: string;
  durationSeconds: number;
}

@Injectable()
export class SoundboardService {
  private readonly PRESET_EFFECTS: SoundEffectPreset[] = [
    {
      id: 'fx-applause',
      name: 'Crowd Applause',
      category: SoundEffectCategory.APPLAUSE,
      defaultUrl: 'https://cdn.voicecloud.com/sfx/applause.mp3',
      durationSeconds: 4,
    },
    {
      id: 'fx-cheering',
      name: 'Arena Cheering',
      category: SoundEffectCategory.CHEERING,
      defaultUrl: 'https://cdn.voicecloud.com/sfx/cheering.mp3',
      durationSeconds: 5,
    },
    {
      id: 'fx-laughter',
      name: 'Sitcom Laughter',
      category: SoundEffectCategory.LAUGHTER,
      defaultUrl: 'https://cdn.voicecloud.com/sfx/laughter.mp3',
      durationSeconds: 3,
    },
    {
      id: 'fx-drumroll',
      name: 'Drum Roll',
      category: SoundEffectCategory.DRUMROLL,
      defaultUrl: 'https://cdn.voicecloud.com/sfx/drumroll.mp3',
      durationSeconds: 6,
    },
    {
      id: 'fx-airhorn',
      name: 'DJ Airhorn',
      category: SoundEffectCategory.AIRHORN,
      defaultUrl: 'https://cdn.voicecloud.com/sfx/airhorn.mp3',
      durationSeconds: 2,
    },
    {
      id: 'fx-buzzer',
      name: 'Game Buzzer',
      category: SoundEffectCategory.BUZZER,
      defaultUrl: 'https://cdn.voicecloud.com/sfx/buzzer.mp3',
      durationSeconds: 2,
    },
    {
      id: 'fx-celebration',
      name: 'Fanfare Celebration',
      category: SoundEffectCategory.CELEBRATION,
      defaultUrl: 'https://cdn.voicecloud.com/sfx/celebration.mp3',
      durationSeconds: 5,
    },
  ];

  constructor(
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    private readonly redisService: RedisService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  getPresetSoundEffects(): SoundEffectPreset[] {
    return this.PRESET_EFFECTS;
  }

  async triggerSoundEffect(roomId: string, userId: string, dto: TriggerSoundEffectDto) {
    const room = await this.roomRepository.findOne({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundException(`Room with ID ${roomId} not found`);
    }

    if (room.hostId !== userId) {
      // In real app, check if co-host in Redis
      const isCoHost = await this.checkIsCoHost(roomId, userId);
      if (!isCoHost) {
        throw new ForbiddenException('Only room host or co-host can trigger soundboard audio');
      }
    }

    let audioUrl = dto.customAudioUrl;
    if (dto.category !== SoundEffectCategory.CUSTOM || !audioUrl) {
      const preset = this.PRESET_EFFECTS.find((p) => p.category === dto.category);
      if (!preset) {
        throw new BadRequestException(`Unknown sound effect category: ${dto.category}`);
      }
      audioUrl = preset.defaultUrl;
    }

    const payload = {
      roomId,
      triggeredByUserId: userId,
      category: dto.category,
      audioUrl,
      volume: dto.volume ?? 100,
      timestamp: new Date().toISOString(),
    };

    // Store recent trigger event in Redis for late joiners (TTL 10 mins)
    await this.redisService.set(`room:${roomId}:last_sfx`, JSON.stringify(payload), 600);

    // Emit real-time event to room participants
    this.eventsGateway.server.to(`room:${roomId}`).emit('room_soundboard_triggered', payload);

    return {
      success: true,
      message: `Sound effect ${dto.category} triggered successfully`,
      data: payload,
    };
  }

  async updateRoomBgm(roomId: string, userId: string, dto: UpdateRoomBgmDto) {
    const room = await this.roomRepository.findOne({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundException(`Room with ID ${roomId} not found`);
    }

    if (room.hostId !== userId) {
      const isCoHost = await this.checkIsCoHost(roomId, userId);
      if (!isCoHost) {
        throw new ForbiddenException('Only room host or co-host can control room background music');
      }
    }

    const bgmPayload = {
      roomId,
      updatedByUserId: userId,
      audioUrl: dto.audioUrl,
      trackTitle: dto.trackTitle || 'Background Music',
      state: dto.state || BgmState.PLAYING,
      volume: dto.volume ?? 50,
      loop: dto.loop ?? true,
      updatedAt: new Date().toISOString(),
    };

    // Persist BGM state in Redis
    await this.redisService.set(`room:${roomId}:bgm_state`, JSON.stringify(bgmPayload), 86400);

    // Broadcast BGM update event
    this.eventsGateway.server.to(`room:${roomId}`).emit('room_bgm_updated', bgmPayload);

    return {
      success: true,
      message: 'Room BGM updated successfully',
      data: bgmPayload,
    };
  }

  async getRoomAudioState(roomId: string) {
    const room = await this.roomRepository.findOne({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundException(`Room with ID ${roomId} not found`);
    }

    const rawBgm = await this.redisService.get(`room:${roomId}:bgm_state`);
    const rawLastSfx = await this.redisService.get(`room:${roomId}:last_sfx`);

    const bgmState = rawBgm ? JSON.parse(rawBgm) : null;
    const lastSoundEffect = rawLastSfx ? JSON.parse(rawLastSfx) : null;

    return {
      roomId,
      isLive: room.isLive,
      presets: this.PRESET_EFFECTS,
      bgmState,
      lastSoundEffect,
    };
  }

  private async checkIsCoHost(roomId: string, userId: string): Promise<boolean> {
    const coHostsRaw = await this.redisService.get(`room:${roomId}:cohosts`);
    if (!coHostsRaw) return false;
    try {
      const coHosts: string[] = JSON.parse(coHostsRaw);
      return coHosts.includes(userId);
    } catch {
      return false;
    }
  }
}
