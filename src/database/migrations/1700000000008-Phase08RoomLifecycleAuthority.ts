import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WP08-02 room lifecycle authority indexes.
 *
 * A scheduled room must map to at most one live-room record. The partial
 * unique index preserves standalone rooms while preventing concurrent
 * duplicate live-room creation for the same scheduled room.
 */
export class Phase08RoomLifecycleAuthority1700000000008
  implements MigrationInterface
{
  name = 'Phase08RoomLifecycleAuthority1700000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "rooms" ALTER COLUMN "isLive" SET DEFAULT false',
    );

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM "rooms"
          WHERE "scheduledRoomId" IS NOT NULL
          GROUP BY "scheduledRoomId"
          HAVING COUNT(*) > 1
        ) THEN
          RAISE EXCEPTION 'Cannot enforce one live room per scheduled room: duplicate scheduledRoomId values exist';
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_rooms_scheduledRoomId"
      ON "rooms" ("scheduledRoomId")
      WHERE "scheduledRoomId" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_rooms_status_isLive"
      ON "rooms" ("status", "isLive")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_rooms_status_isLive"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "UQ_rooms_scheduledRoomId"',
    );
    await queryRunner.query(
      'ALTER TABLE "rooms" ALTER COLUMN "isLive" SET DEFAULT true',
    );
  }
}
