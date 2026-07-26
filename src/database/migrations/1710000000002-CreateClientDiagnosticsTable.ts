import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateClientDiagnosticsTable1710000000002
  implements MigrationInterface
{
  name = 'CreateClientDiagnosticsTable1710000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "client_diagnostics" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "roomId" character varying NOT NULL,
        "userId" character varying,
        "latency" double precision,
        "jitter" double precision,
        "packetLoss" double precision,
        "audioBitrate" integer,
        "audioCodec" character varying,
        "deviceModel" character varying,
        "osVersion" character varying,
        "appVersion" character varying,
        "timestamp" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_client_diagnostics_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_client_diagnostics_roomId" ON "client_diagnostics" ("roomId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_client_diagnostics_userId" ON "client_diagnostics" ("userId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_client_diagnostics_userId"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_client_diagnostics_roomId"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "client_diagnostics"`);
  }
}
