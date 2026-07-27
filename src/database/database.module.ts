import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Client } from 'pg';
import { newDb, DataType } from 'pg-mem';
import { DataSource, DataSourceOptions } from 'typeorm';
import * as crypto from 'crypto';

let memDataSource: DataSource | null = null;

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const host = configService.get<string>('DATABASE_HOST');
        const port = configService.get<number>('DATABASE_PORT');
        const username = configService.get<string>('DATABASE_USER');
        const password = configService.get<string>('DATABASE_PASSWORD');
        const database = configService.get<string>('DATABASE_NAME');

        let isPostgresAvailable = false;
        if (host && port && host !== 'localhost' && host !== '127.0.0.1') {
          try {
            const pgClient = Client as unknown as new (
              opts: Record<string, unknown>,
            ) => {
              connect: () => Promise<void>;
              end: () => Promise<void>;
            };
            const client = new pgClient({
              host,
              port,
              user: username,
              password,
              database,
              connectionTimeoutMillis: 1000,
            });
            await client.connect();
            await client.end();
            isPostgresAvailable = true;
          } catch {
            isPostgresAvailable = false;
          }
        }

        if (isPostgresAvailable) {
          return {
            type: 'postgres',
            host,
            port,
            username,
            password,
            database,
            autoLoadEntities: true,
            synchronize: false,
            logging: false,
          };
        }

        const db = newDb();
        db.public.registerFunction({
          name: 'version',
          implementation: () => 'PostgreSQL 15.0 (pg-mem)',
        });
        db.public.registerFunction({
          name: 'current_database',
          implementation: () => database || 'voicecloud',
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
        } as unknown as DataSourceOptions;
      },
      dataSourceFactory: async (
        options?: DataSourceOptions,
      ): Promise<DataSource> => {
        const opts = options as unknown as {
          __isPgMem?: boolean;
          __pgMemDb?: ReturnType<typeof newDb>;
          entities?: unknown[];
        };
        if (opts?.__isPgMem && opts?.__pgMemDb) {
          if (!memDataSource) {
            const pgMemDb = opts.__pgMemDb;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const ds = pgMemDb.adapters.createTypeormDataSource({
              type: 'postgres',
              synchronize: true,
              entities: opts.entities || [],
              logging: false,
            });

            memDataSource = ds as DataSource;
          }
          const ds = memDataSource;
          if (!ds.isInitialized) {
            await ds.initialize();
          }
          return ds;
        }

        if (!options) {
          throw new Error('No DataSourceOptions provided');
        }
        const dataSource = new DataSource(options);
        return dataSource.initialize();
      },
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
