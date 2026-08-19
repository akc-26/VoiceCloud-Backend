import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { SoundboardService } from './soundboard.service';
import { Room } from './entities/room.entity';
import { RedisService } from '../../redis/redis.service';
import { EventsGateway } from '../../common/events/events.gateway';
import { SoundEffectCategory, BgmState } from './dto/soundboard.dto';

describe('SoundboardService', () => {
  let service: SoundboardService;
  let roomRepository: any;
  let redisService: any;
  let eventsGateway: any;

  const mockRoom = {
    id: 'room-123',
    title: 'Test Audio Room',
    hostId: 'host-1',
    isLive: true,
  };

  beforeEach(async () => {
    roomRepository = {
      findOne: jest.fn(),
    };

    redisService = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue('OK'),
    };

    eventsGateway = {
      server: {
        to: jest.fn().mockReturnValue({
          emit: jest.fn(),
        }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SoundboardService,
        { provide: getRepositoryToken(Room), useValue: roomRepository },
        { provide: RedisService, useValue: redisService },
        { provide: EventsGateway, useValue: eventsGateway },
      ],
    }).compile();

    service = module.get<SoundboardService>(SoundboardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return preset sound effects', () => {
    const presets = service.getPresetSoundEffects();
    expect(presets.length).toBeGreaterThan(0);
    expect(presets[0]).toHaveProperty('category');
  });

  describe('triggerSoundEffect', () => {
    it('should throw NotFoundException if room does not exist', async () => {
      roomRepository.findOne.mockResolvedValue(null);
      await expect(
        service.triggerSoundEffect('room-999', 'user-1', {
          category: SoundEffectCategory.APPLAUSE,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not host or cohost', async () => {
      roomRepository.findOne.mockResolvedValue(mockRoom);
      redisService.get.mockResolvedValue(null); // No cohosts

      await expect(
        service.triggerSoundEffect('room-123', 'unauthorized-user', {
          category: SoundEffectCategory.APPLAUSE,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should trigger sound effect successfully for host', async () => {
      roomRepository.findOne.mockResolvedValue(mockRoom);

      const result = await service.triggerSoundEffect('room-123', 'host-1', {
        category: SoundEffectCategory.APPLAUSE,
        volume: 90,
      });

      expect(result.success).toBe(true);
      expect(result.data.category).toBe(SoundEffectCategory.APPLAUSE);
      expect(redisService.set).toHaveBeenCalled();
      expect(eventsGateway.server.to).toHaveBeenCalledWith('room:room-123');
    });
  });

  describe('updateRoomBgm', () => {
    it('should update BGM successfully for host', async () => {
      roomRepository.findOne.mockResolvedValue(mockRoom);

      const result = await service.updateRoomBgm('room-123', 'host-1', {
        audioUrl: 'https://cdn.example.com/bgm.mp3',
        trackTitle: 'Lofi Beat',
        state: BgmState.PLAYING,
        volume: 60,
      });

      expect(result.success).toBe(true);
      expect(result.data.trackTitle).toBe('Lofi Beat');
      expect(redisService.set).toHaveBeenCalled();
    });
  });

  describe('getRoomAudioState', () => {
    it('should return current room audio state', async () => {
      roomRepository.findOne.mockResolvedValue(mockRoom);
      redisService.get
        .mockResolvedValueOnce(JSON.stringify({ trackTitle: 'Active BGM' }))
        .mockResolvedValueOnce(JSON.stringify({ category: 'applause' }));

      const result = await service.getRoomAudioState('room-123');
      expect(result.roomId).toBe('room-123');
      expect(result.bgmState.trackTitle).toBe('Active BGM');
      expect(result.lastSoundEffect.category).toBe('applause');
    });
  });
});
