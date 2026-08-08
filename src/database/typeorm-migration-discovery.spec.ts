import * as path from 'path';
import { AppDataSource } from './data-source';

describe('TypeORM production migration discovery', () => {
  it('discovers only timestamp-prefixed migration artifacts', () => {
    const migrations = AppDataSource.options.migrations;

    expect(migrations).toHaveLength(1);
    expect(migrations?.[0]).toBe(
      path.join(__dirname, 'migrations/[0-9]*{.ts,.js}'),
    );
  });

  it('does not allow Jest spec artifacts into the migration glob', () => {
    const migrationPattern = String(AppDataSource.options.migrations?.[0]);

    expect(migrationPattern).toContain('migrations');
    expect(migrationPattern).toContain('[0-9]*');
    expect(migrationPattern).not.toContain('spec');
  });
});
