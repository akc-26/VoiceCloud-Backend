import 'reflect-metadata';
import 'dotenv/config';
import * as path from 'path';
import { DataSource } from 'typeorm';

interface ExistingTableRow {
  table_name: string;
}

const host = process.env.DATABASE_HOST ?? 'localhost';
const port = Number.parseInt(process.env.DATABASE_PORT ?? '5432', 10);
const username = process.env.DATABASE_USER ?? 'postgres';
const password = process.env.DATABASE_PASSWORD ?? 'postgres';
const database = process.env.DATABASE_NAME ?? 'voicecloud';

const connectionOptions = {
  type: 'postgres' as const,
  host,
  port,
  username,
  password,
  database,
  logging: false,
  uuidExtension: 'pgcrypto' as const,
};

const entityPattern = path.join(__dirname, '../**/*.entity{.ts,.js}');
const migrationPattern = path.join(__dirname, 'migrations/*{.ts,.js}');

function migrationTimestamp(name: string): number {
  const match = name.match(/(\d{13,})$/);
  if (!match) {
    throw new Error(`Migration ${name} does not end with a numeric timestamp.`);
  }
  return Number.parseInt(match[1], 10);
}

async function listExistingApplicationTables(
  dataSource: DataSource,
): Promise<string[]> {
  const rows: ExistingTableRow[] = await dataSource.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name <> 'migrations'
    ORDER BY table_name
  `);

  return rows.map((row) => row.table_name);
}

async function markCurrentMigrationsAsApplied(
  dataSource: DataSource,
): Promise<void> {
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS "migrations" (
      "id" SERIAL NOT NULL,
      "timestamp" bigint NOT NULL,
      "name" character varying NOT NULL,
      CONSTRAINT "PK_migrations_id" PRIMARY KEY ("id")
    )
  `);

  const migrations = [...dataSource.migrations].sort(
    (left, right) =>
      migrationTimestamp(left.name) - migrationTimestamp(right.name),
  );

  for (const migration of migrations) {
    const timestamp = migrationTimestamp(migration.name);
    const existing: unknown[] = await dataSource.query(
      `SELECT 1 FROM "migrations" WHERE "timestamp" = $1 AND "name" = $2 LIMIT 1`,
      [timestamp, migration.name],
    );

    if (existing.length === 0) {
      await dataSource.query(
        `INSERT INTO "migrations" ("timestamp", "name") VALUES ($1, $2)`,
        [timestamp, migration.name],
      );
    }
  }
}

async function bootstrapSchema(): Promise<void> {
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid DATABASE_PORT value: ${process.env.DATABASE_PORT}`);
  }

  console.log(
    `[DatabaseBootstrap] Target PostgreSQL database: ${host}:${port}/${database} as ${username}`,
  );
  console.log(
    '[DatabaseBootstrap] This command is permitted only for a completely fresh VoiceCloud database.',
  );

  const probeDataSource = new DataSource({
    ...connectionOptions,
    entities: [],
    migrations: [],
    synchronize: false,
  });

  await probeDataSource.initialize();
  const existingTables = await listExistingApplicationTables(probeDataSource);
  await probeDataSource.destroy();

  if (existingTables.length > 0) {
    throw new Error(
      `Database bootstrap refused because the public schema is not empty. Existing tables: ${existingTables.join(
        ', ',
      )}. Use normal migrations for an existing deployment.`,
    );
  }

  const schemaDataSource = new DataSource({
    ...connectionOptions,
    entities: [entityPattern],
    migrations: [],
    synchronize: true,
  });

  console.log('[DatabaseBootstrap] Creating the current entity schema...');
  await schemaDataSource.initialize();
  await schemaDataSource.destroy();

  const migrationDataSource = new DataSource({
    ...connectionOptions,
    entities: [entityPattern],
    migrations: [migrationPattern],
    migrationsRun: false,
    synchronize: false,
  });

  await migrationDataSource.initialize();
  await markCurrentMigrationsAsApplied(migrationDataSource);
  const migrationCount = migrationDataSource.migrations.length;
  await migrationDataSource.destroy();

  console.log(
    `[DatabaseBootstrap] VoiceCloud schema created successfully; ${migrationCount} existing migrations recorded as applied.`,
  );
  console.log(
    '[DatabaseBootstrap] Keep DATABASE_SYNCHRONIZE=false and start the application normally.',
  );
}

bootstrapSchema().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[DatabaseBootstrap] FAILED: ${message}`);
  process.exitCode = 1;
});
