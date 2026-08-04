import * as fs from 'fs';
import * as path from 'path';

describe('WP08-01 real workflow acceptance contract', () => {
  const scriptPath = path.join(
    process.cwd(),
    'scripts',
    'wp08',
    'wp08-01-acceptance.mjs',
  );
  const source = fs.readFileSync(scriptPath, 'utf8');
  const checkerPath = path.join(
    process.cwd(),
    'scripts',
    'wp08',
    'wp08-01-check.ps1',
  );
  const checkerSource = fs.readFileSync(checkerPath, 'utf8');

  it('uses the locked application and API routes', () => {
    for (const route of [
      "request('/health')",
      "request('/api')",
      "['/admin', '<html']",
      "['/creator', '<html']",
      "['/api/docs', 'swagger']",
      "'/api/v1/auth/register'",
      "'/api/v1/auth/refresh'",
      "'/api/v1/users/profile'",
      "'/api/v1/hosts/apply'",
    ]) {
      expect(source).toContain(route);
    }
  });

  it('runs route contracts early and executes the complete Jest suite serially', () => {
    expect(checkerSource).toContain("'src/app.controller.spec.ts'");
    expect(checkerSource).toContain("'src/hosting-routing.spec.ts'");
    expect(checkerSource).toContain('Invoke-Native npx.cmd jest --runInBand');
    expect(checkerSource).not.toContain(
      'Invoke-Native npm.cmd test -- --runInBand',
    );
  });

  it('requires visible real PostgreSQL and Redis infrastructure', () => {
    expect(source).toContain('realInfrastructure !== true');
    expect(source).toContain('WP08 requires real PostgreSQL and Redis');
  });

  it('covers authorization and private-document boundaries', () => {
    expect(source).toContain("'/api/v1/admin/settings'");
    expect(source).toContain("'/api/v1/hosts/admin/applications'");
    expect(source).toContain('expected: 403, binary: true');
    expect(source).toContain(
      "forbiddenFields = ['storageKey', 'storageProvider', 'ownerUserId']",
    );
  });

  it('covers rejection, private-asset reuse, approval and audit history', () => {
    expect(source).toContain('/api/v1/hosts/admin/reject/');
    expect(source).toContain(
      'Reapplied using securely retained private assets',
    );
    expect(source).toContain('/api/v1/hosts/admin/approve/');
    expect(source).toContain('/api/v1/hosts/admin/audit-history/');
  });

  it('restores authoritative Host business settings on success and failure', () => {
    expect(source).toContain('await restoreSettings();');
    expect(source).toContain('[RESTORED] Original Host business settings');
  });

  it('provides actionable and secret-safe HTTP failure diagnostics', () => {
    for (const marker of [
      "beginCheck('Health endpoint confirms connected infrastructure')",
      'WP08_REQUEST_TIMEOUT_MS',
      'WP08_REQUEST_TIMEOUT_MS must be a positive integer',
      'Last request:',
      'Response preview:',
      "'[REDACTED]'",
      'Require real infrastructure:',
    ]) {
      expect(source).toContain(marker);
    }
  });

  it('defines and self-checks the Host settings snapshot used by acceptance', () => {
    expect(source).toContain('function pickHostSettings(payload)');
    expect(source).toContain('originalHostSettings = pickHostSettings(');
    expect(source).toContain("process.argv.includes('--self-check')");
    expect(source).toContain('WP08-01 acceptance self-check passed.');
    expect(checkerSource).toContain(
      "Invoke-Native node 'scripts/wp08/wp08-01-acceptance.mjs' --self-check",
    );
  });

  it('keeps the checker non-mutating and validates application identity before acceptance', () => {
    expect(checkerSource).toContain(
      'Verifying formatting without modifying source files',
    );
    expect(checkerSource).toContain('Invoke-Native npm.cmd run format:check');
    expect(checkerSource).not.toContain('npx.cmd prettier --write');
    expect(checkerSource).toContain(
      "$apiInfo.name -eq 'VoiceCloud Monolith API'",
    );
    expect(checkerSource).toContain('Assert-BuildArtifacts');
    expect(checkerSource).toContain('acceptance output');
    expect(checkerSource).toContain('WP08_PORT must be an integer');
  });

  it('enforces bounded acceptance and complete process/data cleanup', () => {
    expect(checkerSource).toContain('WP08_ACCEPTANCE_TIMEOUT_SECONDS');
    expect(checkerSource).toContain('Real HTTP acceptance exceeded');
    expect(checkerSource).toContain('$acceptance.WaitForExit()');
    expect(checkerSource).toContain("'scripts/wp08/wp08-01-database.mjs' drop");
    expect(checkerSource).toContain(
      "Stop-TrackedProcess $acceptance 'acceptance' $cleanupErrors",
    );
    expect(checkerSource).toContain(
      "Stop-TrackedProcess $server 'VoiceCloud' $cleanupErrors",
    );
    expect(checkerSource).not.toContain('Wait-Process -Id $server.Id -Timeout');
    expect(checkerSource).toContain('Private acceptance storage still exists');
    expect(checkerSource).toContain('cleanup failed');
  });
});
