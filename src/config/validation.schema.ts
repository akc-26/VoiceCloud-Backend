import * as Joi from 'joi';

export const validationSchema = Joi.object({
  PORT: Joi.number().default(3000),
  INFRASTRUCTURE_MODE: Joi.string()
    .lowercase()
    .valid('auto', 'real', 'memory')
    .default('auto'),
  INFRASTRUCTURE_CONNECT_TIMEOUT_MS: Joi.number()
    .integer()
    .min(250)
    .max(30000)
    .default(3000),
  DATABASE_HOST: Joi.string().default('localhost'),
  DATABASE_PORT: Joi.number().default(5432),
  DATABASE_NAME: Joi.string().default('voicecloud'),
  DATABASE_USER: Joi.string().default('postgres'),
  DATABASE_PASSWORD: Joi.string().default('postgres'),
  DATABASE_SYNCHRONIZE: Joi.boolean().default(false),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  PRIVATE_STORAGE_PATH: Joi.string().default('private_uploads'),
  HOST_GOVERNMENT_ID_MAX_SIZE: Joi.number()
    .integer()
    .positive()
    .default(10485760),
  HOST_SELFIE_MAX_SIZE: Joi.number().integer().positive().default(5242880),
  HOST_SUPPORTING_DOCUMENT_MAX_SIZE: Joi.number()
    .integer()
    .positive()
    .default(20971520),
  BACKUP_UPLOAD_MAX_SIZE: Joi.number()
    .integer()
    .positive()
    .max(1073741824)
    .default(268435456),
  RATE_LIMIT_WINDOW_SECONDS: Joi.number().integer().positive().default(60),
  RATE_LIMIT_MAX_REQUESTS: Joi.number().integer().positive().default(300),
  AUTH_RATE_LIMIT_MAX_REQUESTS: Joi.number().integer().positive().default(20),
});
