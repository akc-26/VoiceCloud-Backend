import { Logger } from '@nestjs/common';

/**
 * Validates critical environment variables required for production execution.
 * Fails application startup immediately if any production secret is missing.
 */
export function validateProductionEnvironment(): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const logger = new Logger('EnvironmentValidator');

  if (!isProduction) {
    logger.log(
      'Development environment detected - local fallback defaults enabled.',
    );
    return;
  }

  logger.log(
    'Production environment detected - executing strict environment validation...',
  );

  const requiredProductionVars: Array<{ name: string; description: string }> = [
    { name: 'JWT_SECRET', description: 'JWT signature secret key' },
    { name: 'DATABASE_HOST', description: 'PostgreSQL database host address' },
    { name: 'DATABASE_NAME', description: 'PostgreSQL database name' },
    { name: 'DATABASE_USER', description: 'PostgreSQL database username' },
    { name: 'DATABASE_PASSWORD', description: 'PostgreSQL database password' },
    { name: 'REDIS_HOST', description: 'Redis host address' },
    { name: 'REDIS_PORT', description: 'Redis port number' },
  ];

  const missingVars: string[] = [];

  for (const item of requiredProductionVars) {
    const val = process.env[item.name];
    if (
      !val ||
      val.trim() === '' ||
      val.includes('voicecloud_secure_jwt_secret') ||
      val === 'localhost'
    ) {
      missingVars.push(`${item.name} (${item.description})`);
    }
  }

  // Storage checks if cloud storage driver is enabled
  if (process.env.STORAGE_DRIVER === 's3') {
    if (
      !process.env.AWS_S3_BUCKET ||
      !process.env.AWS_ACCESS_KEY_ID ||
      !process.env.AWS_SECRET_ACCESS_KEY
    ) {
      missingVars.push(
        'AWS_S3_BUCKET / AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY (S3 Storage credentials)',
      );
    }
  }

  if (missingVars.length > 0) {
    logger.error(
      'CRITICAL PRODUCTION SECURITY ERROR: Missing or insecure production environment configuration!',
    );
    missingVars.forEach((v) => logger.error(`  - Missing or default: ${v}`));
    throw new Error(
      `FATAL: Production startup halted due to missing environment configuration: ${missingVars.join(', ')}`,
    );
  }

  logger.log('Production environment validation passed successfully.');
}
