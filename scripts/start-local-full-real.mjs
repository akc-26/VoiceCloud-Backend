import 'dotenv/config';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import pg from 'pg';

const { Client } = pg;
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDirectory, '..');
const requiredFiles = [
  'dist/src/main.js',
  'dist/website/index.html',
  'dist/admin/index.html',
  'dist/creator/index.html',
];

const missingFiles = requiredFiles.filter(
  (relativePath) => !existsSync(join(root, relativePath)),
);

if (missingFiles.length > 0) {
  console.error('VoiceCloud full application build is incomplete.');
  console.error(`Missing: ${missingFiles.join(', ')}`);
  console.error('Run "npm run build" and start again.');
  process.exit(1);
}

process.chdir(root);
process.env.NODE_ENV = 'development';
process.env.INFRASTRUCTURE_MODE = 'real';
process.env.ENABLE_SWAGGER = 'true';
process.env.DEV_SEED_ACCOUNTS = process.env.DEV_SEED_ACCOUNTS ?? 'true';
process.env.DATABASE_SYNCHRONIZE = 'false';
process.env.PORT = process.env.VOICECLOUD_LOCAL_PORT || process.env.PORT || '3000';
process.env.FRONTEND_DIST_ROOT = join(root, 'dist');

async function verifyDatabaseSchema() {
  const client = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: Number(process.env.DATABASE_PORT || 5432),
    user: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'voicecloud',
    connectionTimeoutMillis: Number(process.env.INFRASTRUCTURE_CONNECT_TIMEOUT_MS || 3000),
  });

  try {
    await client.connect();
    const result = await client.query("SELECT to_regclass('public.users') AS users_table");
    if (!result.rows?.[0]?.users_table) {
      console.error('');
      console.error('VoiceCloud PostgreSQL is reachable, but the application schema is not initialized.');
      console.error('For a NEW/EMPTY local database run this once:');
      console.error('  npm run database:bootstrap');
      console.error('Then start again with:');
      console.error('  node scripts/start-local-full-real.mjs');
      console.error('');
      console.error('If this database should contain an existing deployment, restore that database and run pending migrations instead of bootstrapping a fresh schema.');
      process.exitCode = 2;
      return false;
    }
    return true;
  } catch (error) {
    console.error('');
    console.error(`Unable to validate VoiceCloud PostgreSQL before startup: ${error instanceof Error ? error.message : String(error)}`);
    console.error('Verify DATABASE_HOST / DATABASE_PORT / DATABASE_NAME / DATABASE_USER / DATABASE_PASSWORD and PostgreSQL service status.');
    process.exitCode = 2;
    return false;
  } finally {
    await client.end().catch(() => undefined);
  }
}

if (!(await verifyDatabaseSchema())) process.exit(process.exitCode || 2);

console.log(
  `Starting the complete VoiceCloud application with REAL PostgreSQL/Redis on port ${process.env.PORT}...`,
);
console.log(`Frontend build root: ${process.env.FRONTEND_DIST_ROOT}`);
console.log('INFRASTRUCTURE_MODE=real; pg-mem fallback is disabled.');

await import(pathToFileURL(join(root, 'dist/src/main.js')).href);
