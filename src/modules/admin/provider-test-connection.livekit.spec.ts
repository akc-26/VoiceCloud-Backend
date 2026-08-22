import { ProviderTestConnectionService } from './provider-test-connection.service';
import {
  ProviderCategory,
  ProviderConfig,
} from './entities/provider-config.entity';
import { EncryptionService } from '../../common/services/encryption.service';

describe('ProviderTestConnectionService LiveKit authority', () => {
  const originalFetch = global.fetch;
  const encryptionService = {
    decryptConfig: jest.fn((value) => value),
  } as unknown as EncryptionService;

  const provider = (config: Record<string, unknown>): ProviderConfig =>
    ({
      id: 'provider-1',
      category: ProviderCategory.RTC,
      providerType: 'livekit',
      name: 'LiveKit',
      config,
    }) as ProviderConfig;

  afterEach(() => {
    jest.restoreAllMocks();
    global.fetch = originalFetch;
  });

  it('fails closed when any required LiveKit project credential is missing', async () => {
    const service = new ProviderTestConnectionService(encryptionService);
    const fetchMock = jest.fn();
    global.fetch = fetchMock as any;

    const result = await service.testProvider(
      provider({
        serverUrl: 'wss://voicecloud-test.livekit.cloud',
        apiKey: 'LK_TEST_KEY',
      }),
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain('Missing LiveKit Project URL, API Key, or API Secret');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('probes the exact configured LiveKit project and reports success only after provider authentication succeeds', async () => {
    const service = new ProviderTestConnectionService(encryptionService);
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ rooms: [] }),
    });
    global.fetch = fetchMock as any;

    const result = await service.testProvider(
      provider({
        serverUrl: 'wss://voicecloud-test.livekit.cloud',
        apiKey: 'LK_TEST_KEY',
        apiSecret: 'LK_TEST_SECRET',
      }),
    );

    expect(result.success).toBe(true);
    expect(result.details?.liveConnectivityVerified).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://voicecloud-test.livekit.cloud/twirp/livekit.RoomService/ListRooms',
    );
  });

  it('reports rejected LiveKit credentials as an unhealthy provider', async () => {
    const service = new ProviderTestConnectionService(encryptionService);
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'invalid API key',
    }) as any;

    const result = await service.testProvider(
      provider({
        serverUrl: 'wss://voicecloud-test.livekit.cloud',
        apiKey: 'LK_BAD_KEY',
        apiSecret: 'LK_BAD_SECRET',
      }),
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain('LiveKit rejected the configured project credentials (401)');
    expect(result.details?.liveConnectivityVerified).toBe(false);
  });
  it('does not report Agora or ZEGOCLOUD as operational when their runtime adapters are unavailable', async () => {
    const service = new ProviderTestConnectionService(encryptionService);
    const agoraResult = await service.testProvider({
      ...provider({ appId: 'AGORA_APP_ID_REAL', appCertificate: 'AGORA_CERT_REAL' }),
      providerType: 'agora',
    } as ProviderConfig);
    const zegoResult = await service.testProvider({
      ...provider({ appId: '123456789', serverSecret: 'ZEGO_SERVER_SECRET_REAL' }),
      providerType: 'zegocloud',
    } as ProviderConfig);

    expect(agoraResult.success).toBe(false);
    expect(agoraResult.details?.runtimeAdapterAvailable).toBe(false);
    expect(zegoResult.success).toBe(false);
    expect(zegoResult.details?.runtimeAdapterAvailable).toBe(false);
  });

});
