import { QueryRunner } from 'typeorm';
import { AppDataSource } from '../data-source';
import { Phase08RoomLifecycleAuthority1700000000008 } from './1700000000008-Phase08RoomLifecycleAuthority';

class RecordingQueryRunner {
  readonly statements: string[] = [];

  async query(sql: string): Promise<void> {
    this.statements.push(sql.replace(/\s+/g, ' ').trim());
  }
}

describe('Phase08 room lifecycle authority migration', () => {
  it('is discoverable by the real TypeORM migration configuration', () => {
    const configured = AppDataSource.options.migrations;
    expect(configured).toBeDefined();
    expect(String(configured)).toContain('migrations');
  });

  it('creates a non-destructive partial unique index and status index', async () => {
    const runner = new RecordingQueryRunner();
    await new Phase08RoomLifecycleAuthority1700000000008().up(
      runner as unknown as QueryRunner,
    );

    expect(runner.statements.join(' ')).toContain(
      'ALTER TABLE "rooms" ALTER COLUMN "isLive" SET DEFAULT false',
    );
    expect(runner.statements.join(' ')).toContain(
      'CREATE UNIQUE INDEX IF NOT EXISTS "UQ_rooms_scheduledRoomId"',
    );
    expect(runner.statements.join(' ')).toContain(
      'WHERE "scheduledRoomId" IS NOT NULL',
    );
    expect(runner.statements.join(' ')).toContain(
      'CREATE INDEX IF NOT EXISTS "IDX_rooms_status_isLive"',
    );
    expect(runner.statements.join(' ')).not.toMatch(/DROP TABLE|TRUNCATE/i);
  });

  it('rolls back the indexes and restores the previous isLive default', async () => {
    const runner = new RecordingQueryRunner();
    await new Phase08RoomLifecycleAuthority1700000000008().down(
      runner as unknown as QueryRunner,
    );

    expect(runner.statements).toEqual([
      'DROP INDEX IF EXISTS "IDX_rooms_status_isLive"',
      'DROP INDEX IF EXISTS "UQ_rooms_scheduledRoomId"',
      'ALTER TABLE "rooms" ALTER COLUMN "isLive" SET DEFAULT true',
    ]);
  });
});
