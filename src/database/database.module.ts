import { Logger, Module } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Client } from 'pg';
import { newDb, DataType } from 'pg-mem';
import { DataSource, DataSourceOptions } from 'typeorm';
import * as crypto from 'crypto';
import {
  InfrastructureMode,
  requiresRealInfrastructure,
  resolveInfrastructureConnectTimeoutMs,
  resolveInfrastructureMode,
} from '../config/infrastructure-mode';

let memDataSource: DataSource | null = null;
const databaseLogger = new Logger('DatabaseProvider');

type TaggedDataSource = DataSource & {
  __voiceCloudInfrastructure?: 'postgres' | 'pg-mem';
};

interface PgMemDataSourceOptions {
  __isPgMem?: boolean;
  __pgMemDb?: ReturnType<typeof newDb>;
  entities?: any[];
}

type VoiceCloudTypeOrmOptions = TypeOrmModuleOptions & PgMemDataSourceOptions;

async function canConnectToPostgres(options: {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  timeoutMs: number;
}): Promise<boolean> {
  const pgClient = Client as unknown as new (opts: Record<string, unknown>) => {
    connect: () => Promise<void>;
    end: () => Promise<void>;
  };
  const client = new pgClient({
    host: options.host,
    port: options.port,
    user: options.username,
    password: options.password,
    database: options.database,
    connectionTimeoutMillis: options.timeoutMs,
  });

  try {
    await client.connect();
    return true;
  } finally {
    await client.end().catch(() => undefined);
  }
}

function createPgMemOptions(database: string): VoiceCloudTypeOrmOptions {
  const db = newDb();
  db.public.registerFunction({
    name: 'version',
    implementation: () => 'PostgreSQL 15.0 (pg-mem)',
  });
  db.public.registerFunction({
    name: 'current_database',
    implementation: () => database,
  });
  db.public.registerFunction({
    name: 'quote_ident',
    args: [DataType.text],
    returns: DataType.text,
    implementation: (str: string) => str,
  });
  db.public.registerFunction({
    name: 'obj_description',
    args: [DataType.text, DataType.text],
    returns: DataType.text,
    implementation: () => null,
  });
  db.public.registerFunction({
    name: 'uuid_generate_v4',
    returns: DataType.uuid,
    implementation: () => crypto.randomUUID(),
    impure: true,
  });
  db.public.registerFunction({
    name: 'gen_random_uuid',
    returns: DataType.uuid,
    implementation: () => crypto.randomUUID(),
    impure: true,
  });

  return {
    type: 'postgres',
    autoLoadEntities: true,
    synchronize: true,
    logging: false,
    __isPgMem: true,
    __pgMemDb: db,
  };
}

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const host = configService.get<string>('DATABASE_HOST', 'localhost');
        const port = configService.get<number>('DATABASE_PORT', 5432);
        const username = configService.get<string>('DATABASE_USER', 'postgres');
        const password = configService.get<string>(
          'DATABASE_PASSWORD',
          'postgres',
        );
        const database = configService.get<string>(
          'DATABASE_NAME',
          'voicecloud',
        );
        const mode = resolveInfrastructureMode();
        const timeoutMs = resolveInfrastructureConnectTimeoutMs();
        const synchronize = configService.get<boolean>(
          'DATABASE_SYNCHRONIZE',
          false,
        );
        if (process.env.NODE_ENV === 'production' && synchronize) {
          throw new Error(
            'DATABASE_SYNCHRONIZE=true is forbidden when NODE_ENV=production',
          );
        }

        if (mode !== InfrastructureMode.MEMORY) {
          try {
            const available = await canConnectToPostgres({
              host,
              port,
              username,
              password,
              database,
              timeoutMs,
            });
            if (available) {
              databaseLogger.log(
                `Using PostgreSQL at ${host}:${port}/${database} (${mode} mode).`,
              );
              return {
                type: 'postgres',
                host,
                port,
                username,
                password,
                database,
                autoLoadEntities: true,
                synchronize,
                logging: false,
              };
            }
          } catch (error) {
            const message =
              error instanceof Error ? error.message : String(error);
            if (requiresRealInfrastructure(mode)) {
              throw new Error(
                `PostgreSQL is required in real infrastructure mode but could not be reached at ${host}:${port}/${database}: ${message}`,
              );
            }
            databaseLogger.warn(
              `PostgreSQL is unavailable at ${host}:${port}/${database}; using explicit development pg-mem fallback. ${message}`,
            );
          }
        }

        if (requiresRealInfrastructure(mode)) {
          throw new Error(
            `PostgreSQL is required in real infrastructure mode but is unavailable at ${host}:${port}/${database}`,
          );
        }

        databaseLogger.warn(
          `Using pg-mem database (${mode} mode). This is not valid for WP08 real-infrastructure acceptance.`,
        );
        return createPgMemOptions(database);
      },
      dataSourceFactory: async (
        options?: DataSourceOptions,
      ): Promise<DataSource> => {
        const pgMemOptions = options as unknown as PgMemDataSourceOptions;
        if (pgMemOptions?.__isPgMem && pgMemOptions?.__pgMemDb) {
          if (!memDataSource) {
            const ds = pgMemOptions.__pgMemDb.adapters.createTypeormDataSource({
              type: 'postgres',
              synchronize: true,
              entities: pgMemOptions.entities || [],
              logging: false,
            }) as TaggedDataSource;
            ds.__voiceCloudInfrastructure = 'pg-mem';
            memDataSource = ds;
          }
          const ds = memDataSource as TaggedDataSource;
          ds.__voiceCloudInfrastructure = 'pg-mem';
          if (!ds.isInitialized) {
            await ds.initialize();
          }
          return ds;
        }

        if (!options) {
          throw new Error('No DataSourceOptions provided');
        }
        const dataSource = new DataSource(options) as TaggedDataSource;
        dataSource.__voiceCloudInfrastructure = 'postgres';
        await dataSource.initialize();
        return dataSource;
      },
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
