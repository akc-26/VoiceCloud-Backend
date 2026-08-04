import { HealthService } from './health.service';

describe('HealthService infrastructure reporting', () => {
  const logger = {
    setContext: jest.fn(),
    error: jest.fn(),
  };

  afterEach(() => {
    delete process.env.INFRASTRUCTURE_MODE;
    jest.clearAllMocks();
  });

  it('reports real PostgreSQL and Redis infrastructure', async () => {
    process.env.INFRASTRUCTURE_MODE = 'real';
    const dataSource = {
      isInitialized: true,
      options: { type: 'postgres' },
      __voiceCloudInfrastructure: 'postgres',
      query: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    };
    const redisClient = { __voiceCloudInfrastructure: 'redis' };
    const redisService = {
      ping: jest.fn().mockResolvedValue(true),
      getClient: jest.fn().mockReturnValue(redisClient),
    };

    const service = new HealthService(
      dataSource as never,
      redisService as never,
      logger as never,
    );

    await expect(service.checkHealth()).resolves.toMatchObject({
      status: 'ok',
      database: 'connected',
      redis: 'connected',
      infrastructure: {
        mode: 'real',
        databaseEngine: 'postgres',
        redisEngine: 'redis',
        realInfrastructure: true,
      },
    });
  });

  it('makes memory fallback visible instead of reporting it as real', async () => {
    process.env.INFRASTRUCTURE_MODE = 'auto';
    const dataSource = {
      isInitialized: true,
      options: { type: 'postgres' },
      __voiceCloudInfrastructure: 'pg-mem',
      query: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    };
    const redisClient = { __voiceCloudInfrastructure: 'ioredis-mock' };
    const redisService = {
      ping: jest.fn().mockResolvedValue(true),
      getClient: jest.fn().mockReturnValue(redisClient),
    };

    const service = new HealthService(
      dataSource as never,
      redisService as never,
      logger as never,
    );

    await expect(service.checkHealth()).resolves.toMatchObject({
      status: 'ok',
      infrastructure: {
        databaseEngine: 'pg-mem',
        redisEngine: 'ioredis-mock',
        realInfrastructure: false,
      },
    });
  });
});
