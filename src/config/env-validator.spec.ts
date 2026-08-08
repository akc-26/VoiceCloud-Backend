import { validateProductionEnvironment } from './env-validator';

const ORIGINAL_ENV = process.env;

function secureProductionEnvironment(): NodeJS.ProcessEnv {
  return {
    ...ORIGINAL_ENV,
    NODE_ENV: 'production',
    INFRASTRUCTURE_MODE: 'real',
    DATABASE_SYNCHRONIZE: 'false',
    JWT_SECRET: 'wp08-production-jwt-secret-with-sufficient-entropy',
    DATABASE_HOST: 'db.internal.voicecloud',
    DATABASE_NAME: 'voicecloud',
    DATABASE_USER: 'voicecloud_app',
    DATABASE_PASSWORD: 'secure-database-password',
    REDIS_HOST: 'redis.internal.voicecloud',
    REDIS_PORT: '6379',
    PRIVATE_STORAGE_PATH: '/srv/voicecloud/private',
  };
}

describe('Production environment validation', () => {
  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('allows development fallback configuration', () => {
    process.env = { ...ORIGINAL_ENV, NODE_ENV: 'development' };
    expect(() => validateProductionEnvironment()).not.toThrow();
  });

  it('rejects memory infrastructure in production', () => {
    process.env = {
      ...secureProductionEnvironment(),
      INFRASTRUCTURE_MODE: 'memory',
    };
    expect(() => validateProductionEnvironment()).toThrow(
      'INFRASTRUCTURE_MODE',
    );
  });

  it('rejects automatic schema synchronization in production', () => {
    process.env = {
      ...secureProductionEnvironment(),
      DATABASE_SYNCHRONIZE: 'true',
    };
    expect(() => validateProductionEnvironment()).toThrow(
      'DATABASE_SYNCHRONIZE',
    );
  });

  it('accepts explicit secure real-infrastructure production settings', () => {
    process.env = secureProductionEnvironment();
    expect(() => validateProductionEnvironment()).not.toThrow();
  });
});
