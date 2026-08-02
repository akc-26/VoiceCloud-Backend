export default () => ({
  port: 3000,
  database: {
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
  },
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  },
  storage: {
    privatePath: process.env.PRIVATE_STORAGE_PATH ?? 'private_uploads',
    hostGovernmentIdMaxSize: parseInt(
      process.env.HOST_GOVERNMENT_ID_MAX_SIZE ?? '10485760',
      10,
    ),
    hostSelfieMaxSize: parseInt(
      process.env.HOST_SELFIE_MAX_SIZE ?? '5242880',
      10,
    ),
    hostSupportingDocumentMaxSize: parseInt(
      process.env.HOST_SUPPORTING_DOCUMENT_MAX_SIZE ?? '20971520',
      10,
    ),
  },
});
