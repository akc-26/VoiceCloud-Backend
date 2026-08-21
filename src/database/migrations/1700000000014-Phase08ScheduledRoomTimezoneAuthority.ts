import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Scheduled-room start times are instants, not server-local wall-clock values.
 * Preserve legacy timestamp values as UTC while moving the column to
 * PostgreSQL timestamptz so creators and viewers can render the same instant
 * in their own browser timezone.
 */
export class Phase08ScheduledRoomTimezoneAuthority1700000000014
  implements MigrationInterface
{
  name = 'Phase08ScheduledRoomTimezoneAuthority1700000000014';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "scheduled_rooms"
      ALTER COLUMN "scheduledStartTime" TYPE timestamptz
      USING "scheduledStartTime" AT TIME ZONE 'UTC'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "scheduled_rooms"
      ALTER COLUMN "scheduledStartTime" TYPE timestamp without time zone
      USING "scheduledStartTime" AT TIME ZONE 'UTC'
    `);
  }
}
