import { QueryRunner } from 'typeorm';
import { Phase08ScheduledRoomTimezoneAuthority1700000000014 } from './1700000000014-Phase08ScheduledRoomTimezoneAuthority';

class RecordingQueryRunner {
  readonly statements: string[] = [];
  async query(sql: string): Promise<void> {
    this.statements.push(sql.replace(/\s+/g, ' ').trim());
  }
}

describe('Scheduled-room timezone authority migration', () => {
  it('converts scheduledStartTime to timestamptz while preserving legacy UTC instants', async () => {
    const runner = new RecordingQueryRunner();
    await new Phase08ScheduledRoomTimezoneAuthority1700000000014().up(
      runner as unknown as QueryRunner,
    );
    expect(runner.statements.join(' ')).toContain(
      'ALTER COLUMN "scheduledStartTime" TYPE timestamptz USING "scheduledStartTime" AT TIME ZONE \'UTC\'',
    );
  });

  it('has an explicit reversible UTC-preserving down migration', async () => {
    const runner = new RecordingQueryRunner();
    await new Phase08ScheduledRoomTimezoneAuthority1700000000014().down(
      runner as unknown as QueryRunner,
    );
    expect(runner.statements.join(' ')).toContain(
      'TYPE timestamp without time zone USING "scheduledStartTime" AT TIME ZONE \'UTC\'',
    );
  });
});
