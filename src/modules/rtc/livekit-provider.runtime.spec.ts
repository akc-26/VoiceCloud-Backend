import * as crypto from 'crypto';
import { ServiceUnavailableException } from '@nestjs/common';
import { LiveKitProvider } from './providers/livekit.provider';
import { SpeakerRole } from './entities/rtc-speaker-history.entity';
import { RtcConfig } from './entities/rtc-config.entity';

const runtimeConfig = {
  tokenExpiration: 3600,
  apiKey: 'legacy-key',
  secret: 'legacy-secret',
} as RtcConfig;

describe('LiveKitProvider runtime authority', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    jest.restoreAllMocks();
    global.fetch = originalFetch;
  });

  it('uses the same healthy active provider URL/key/secret and probes LiveKit before issuing a host token', async () => {
    const dynamicConfigService = {
      getActiveProviderConfig: jest.fn().mockResolvedValue({
        providerType: 'livekit',
        healthStatus: 'healthy',
        config: {
          serverUrl: 'wss://voicecloud-test.livekit.cloud',
          apiKey: 'LK_TEST_KEY',
          apiSecret: 'LK_TEST_SECRET',
          tokenExpiration: 3600,
        },
      }),
      getProviderConfig: jest.fn(),
    } as any;
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ rooms: [] }),
    });
    global.fetch = fetchMock as any;

    const provider = new LiveKitProvider(dynamicConfigService);
    const result = await provider.generateToken(runtimeConfig, {
      roomId: 'room-1',
      userId: 'host-1',
      role: SpeakerRole.HOST,
      expirationSeconds: 600,
    });

    expect(result.provider).toBe('livekit');
    expect(result.serverUrl).toBe('wss://voicecloud-test.livekit.cloud');
    expect(result.appId).toBe('LK_TEST_KEY');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://voicecloud-test.livekit.cloud/twirp/livekit.RoomService/ListRooms',
    );
  });

  it('rejects an active LiveKit provider that has not passed the Admin connection test', async () => {
    const dynamicConfigService = {
      getActiveProviderConfig: jest.fn().mockResolvedValue({
        providerType: 'livekit',
        healthStatus: 'not_tested',
        config: {
          serverUrl: 'wss://voicecloud-test.livekit.cloud',
          apiKey: 'LK_TEST_KEY',
          apiSecret: 'LK_TEST_SECRET',
        },
      }),
      getProviderConfig: jest.fn(),
    } as any;
    const provider = new LiveKitProvider(dynamicConfigService);

    await expect(
      provider.generateToken(runtimeConfig, {
        roomId: 'room-1',
        userId: 'host-1',
        role: SpeakerRole.HOST,
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('does not perform the expensive connectivity probe for an ordinary listener token', async () => {
    const dynamicConfigService = {
      getActiveProviderConfig: jest.fn().mockResolvedValue({
        providerType: 'livekit',
        healthStatus: 'healthy',
        config: {
          serverUrl: 'wss://voicecloud-test.livekit.cloud',
          apiKey: 'LK_TEST_KEY',
          apiSecret: 'LK_TEST_SECRET',
        },
      }),
      getProviderConfig: jest.fn(),
    } as any;
    const fetchMock = jest.fn();
    global.fetch = fetchMock as any;
    const provider = new LiveKitProvider(dynamicConfigService);

    const result = await provider.generateToken(runtimeConfig, {
      roomId: 'room-1',
      userId: 'listener-1',
      role: SpeakerRole.LISTENER,
    });

    expect(result.role).toBe(SpeakerRole.LISTENER);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('verifies LiveKit webhook JWT signature, issuer, expiry and raw-body SHA-256', () => {
    const dynamicConfigService = {
      getActiveProviderConfig: jest.fn(),
      getProviderConfig: jest.fn(),
    } as any;
    const provider = new LiveKitProvider(dynamicConfigService);
    const rawBody = Buffer.from(JSON.stringify({ event: 'participant_joined', room: { name: 'room-1' } }));
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      iss: 'legacy-key',
      nbf: now - 5,
      exp: now + 60,
      sha256: crypto.createHash('sha256').update(rawBody).digest('base64'),
    })).toString('base64url');
    const signature = crypto
      .createHmac('sha256', 'legacy-secret')
      .update(`${header}.${payload}`)
      .digest('base64url');
    const auth = `Bearer ${header}.${payload}.${signature}`;

    expect(
      provider.verifyWebhookSignature(runtimeConfig, { authorization: auth }, JSON.parse(rawBody.toString()), rawBody),
    ).toBe(true);
    expect(
      provider.verifyWebhookSignature(runtimeConfig, { authorization: auth }, {}, Buffer.from('{"tampered":true}')),
    ).toBe(false);
  });

});
