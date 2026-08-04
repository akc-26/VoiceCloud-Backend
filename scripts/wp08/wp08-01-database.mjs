import process from 'node:process';
import pg from 'pg';

const { Client } = pg;
const action = process.argv[2];
const databaseName =
  process.env.WP08_DATABASE_NAME ?? 'voicecloud_wp08_acceptance';
const maintenanceDatabase = process.env.WP08_MAINTENANCE_DATABASE ?? 'postgres';

if (!['create', 'drop'].includes(action)) {
  throw new Error('Usage: node wp08-01-database.mjs <create|drop>');
}
if (!/^[a-zA-Z][a-zA-Z0-9_]{0,62}$/.test(databaseName)) {
  throw new Error(
    'WP08_DATABASE_NAME must start with a letter and contain only letters, numbers, and underscores',
  );
}

const client = new Client({
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number(process.env.DATABASE_PORT ?? 5432),
  user: process.env.DATABASE_USER ?? 'postgres',
  password: process.env.DATABASE_PASSWORD ?? 'postgres',
  database: maintenanceDatabase,
  connectionTimeoutMillis: Number(
    process.env.INFRASTRUCTURE_CONNECT_TIMEOUT_MS ?? 5000,
  ),
});

const quotedName = `"${databaseName}"`;

try {
  await client.connect();
  if (action === 'create') {
    const existing = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [databaseName],
    );
    if (existing.rowCount === 0) {
      await client.query(`CREATE DATABASE ${quotedName}`);
      console.log(`Created isolated WP08 PostgreSQL database: ${databaseName}`);
    } else {
      throw new Error(
        `Acceptance database '${databaseName}' already exists. Drop it or choose another WP08_DATABASE_NAME to prevent testing against stale data.`,
      );
    }
  } else {
    await client.query(
      'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()',
      [databaseName],
    );
    await client.query(`DROP DATABASE IF EXISTS ${quotedName}`);
    console.log(`Dropped isolated WP08 PostgreSQL database: ${databaseName}`);
  }
} finally {
  await client.end().catch(() => undefined);
}
