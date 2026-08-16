import { SpeakerRole } from './entities/rtc-speaker-history.entity';
import { RtcProviderType } from './entities/rtc-config.entity';
import { RtcService } from './rtc.service';

describe('R11 RTC authoritative role derivation', () => {
  const makeService = (overrides: Record<string, any> = {}) => {
    const captured: { role?: SpeakerRole } = {};
    const configRepository = {
      findOne: jest.fn().mockResolvedValue({
        activeProvider: RtcProviderType.LIVEKIT,
        tokenExpiration: 3600,
        isActive: true,
      }),
    };
    const sessionRepository = {
      findOne: jest.fn().mockResolvedValue(null),
    };
    const roomRepository = {
      findOne: jest.fn().mockResolvedValue({ id: 'room-1', hostId: 'host-1' }),
    };
    const provider = {
      generateToken: jest.fn(async (_config: any, options: any) => {
        captured.role = options.role;
        return {
          token: 'signed-provider-token',
          provider: 'livekit',
          roomId: options.roomId,
          userId: options.userId,
          role: options.role,
          expiresAt: new Date(Date.now() + 60_000),
        };
      }),
    };
    const redisClient = {
      sismember: jest.fn().mockResolvedValue(0),
      set: jest.fn().mockResolvedValue('OK'),
    };
    const redisService = {
      get: jest.fn().mockResolvedValue(null),
      getClient: () => redisClient,
    };
    const redisStateService = {
      isModerator: jest.fn().mockResolvedValue(false),
      isSpeaker: jest.fn().mockResolvedValue(false),
    };
    Object.assign(roomRepository, overrides.roomRepository || {});
    Object.assign(sessionRepository, overrides.sessionRepository || {});
    Object.assign(redisService, overrides.redisService || {});
    Object.assign(redisStateService, overrides.redisStateService || {});

    const service = new RtcService(
      configRepository as any,
      sessionRepository as any,
      {} as any,
      {} as any,
      {} as any,
      roomRepository as any,
      {} as any,
      { getProvider: () => provider } as any,
      redisService as any,
      redisStateService as any,
      { server: { emit: jest.fn() } } as any,
      {} as any,
      { assertRoomJoinable: jest.fn().mockResolvedValue({ id: 'room-1' }) } as any,
    );
    return { service, captured, redisStateService };
  };

  it('does not honor a listener request for HOST authority', async () => {
    const { service, captured } = makeService();
    const result = await service.generateToken('listener-1', {
      roomId: 'room-1',
      role: SpeakerRole.HOST,
    });
    expect(captured.role).toBe(SpeakerRole.LISTENER);
    expect(result.role).toBe(SpeakerRole.LISTENER);
  });

  it('derives HOST only for the room owner', async () => {
    const { service, captured } = makeService();
    await service.generateToken('host-1', {
      roomId: 'room-1',
      role: SpeakerRole.LISTENER,
    });
    expect(captured.role).toBe(SpeakerRole.HOST);
  });

  it('derives MODERATOR only from server moderator state', async () => {
    const { service, captured, redisStateService } = makeService();
    redisStateService.isModerator.mockResolvedValue(true);
    await service.generateToken('mod-1', {
      roomId: 'room-1',
      role: SpeakerRole.LISTENER,
    });
    expect(captured.role).toBe(SpeakerRole.MODERATOR);
  });
});
