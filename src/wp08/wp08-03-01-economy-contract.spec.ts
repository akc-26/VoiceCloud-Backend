import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';

interface SourceSnapshotEntry {
  path: string;
  sha256: string;
}

interface Finding {
  id: string;
  lockedDecision: string;
}

interface EconomyContractManifest {
  schemaVersion: number;
  workPackage: string;
  baseline: {
    branch: string;
    commit: string;
    uploadedArchiveSha256: string;
    packageLockSha256: string;
    baselineFileCount: number;
  };
  scopeDomains: string[];
  lockedPrinciples: string[];
  findings: Finding[];
  sourceSnapshot: SourceSnapshotEntry[];
  baselineFormattingDebt: string[];
  allowedChangesForThisPackage: string[];
}

const BASELINE_BRANCH = 'VoiceCloud-Backend-VC-PH08-WP08-02-R05';
const BASELINE_COMMIT = '5d73fac20e87630b70ca8bfe6711be93d94138f0';
const ARCHIVE_SHA =
  'd71a135342674f9dffb3e59dc382d09bb8156d25fece117861dccb6b4d19b91e';
const MANIFEST_PATH = 'docs/wp08/wp08-03-01-economy-contract-lock.json';
const REPORT_PATH =
  'docs/wp08/WP08-03-01-ECONOMY-AUDIT-AND-CONTRACT-LOCK.md';
const CHECKER_PATH = 'scripts/wp08/wp08-03-01-check.ps1';

const root = process.cwd();

const readText = (relativePath: string): string => {
  return readFileSync(join(root, relativePath), 'utf8');
};

const manifest = JSON.parse(readText(MANIFEST_PATH)) as EconomyContractManifest;
const reportSource = readText(REPORT_PATH);
const checkerSource = readText(CHECKER_PATH);
const packageJson = JSON.parse(readText('package.json')) as {
  scripts: Record<string, string>;
};

const sha256 = (contents: Buffer | string): string => {
  return createHash('sha256').update(contents).digest('hex');
};

describe('WP08-03-01 economy audit and contract lock', () => {
  it('locks the exact approved WP08-02 Git baseline', () => {
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.workPackage).toBe('VC-PH08-WP08-03-01');
    expect(manifest.baseline.branch).toBe(BASELINE_BRANCH);
    expect(manifest.baseline.commit).toBe(BASELINE_COMMIT);
    expect(manifest.baseline.uploadedArchiveSha256).toBe(ARCHIVE_SHA);
    expect(manifest.baseline.baselineFileCount).toBe(793);

    const lockfile = readFileSync(join(root, 'package-lock.json'));
    expect(sha256(lockfile)).toBe(manifest.baseline.packageLockSha256);
  });

  it('retains the original audited business-source hash evidence', () => {
    expect(manifest.sourceSnapshot.length).toBeGreaterThanOrEqual(50);

    for (const entry of manifest.sourceSnapshot) {
      expect(entry.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(() => readFileSync(join(root, entry.path))).not.toThrow();
    }
  });

  it('covers every remaining WP08 economy and recovery domain', () => {
    const expectedDomains = [
      'gifts',
      'wallet-ledger',
      'creator-payouts',
      'host-earnings',
      'tasks-achievements',
      'vip',
      'notifications',
      'bullmq',
      'redis-events',
      'creator-ui',
      'admin-ui',
    ];
    expect(manifest.scopeDomains).toEqual(
      expect.arrayContaining(expectedDomains),
    );

    const expectedFindings = Array.from({ length: 16 }, (_, index) => {
      return `ECO-${String(index + 1).padStart(3, '0')}`;
    });
    const actualFindings = manifest.findings.map((finding) => finding.id);
    expect(actualFindings).toEqual(expect.arrayContaining(expectedFindings));

    for (const finding of manifest.findings) {
      expect(finding.lockedDecision.trim().length).toBeGreaterThan(20);
    }
  });

  it('locks PostgreSQL authority and post-commit realtime behavior', () => {
    const expectedPrinciples = [
      expect.stringContaining('PostgreSQL is the source of truth'),
      expect.stringContaining('Redis is cache'),
      expect.stringContaining('database transaction'),
      expect.stringContaining('idempotent'),
      expect.stringContaining('after authoritative database commit'),
      expect.stringContaining('ADMIN or SUPER_ADMIN'),
    ];
    expect(manifest.lockedPrinciples).toEqual(
      expect.arrayContaining(expectedPrinciples),
    );

    expect(reportSource).toContain('Socket.IO gifts remain display-only');
    expect(reportSource).toContain(
      'PostgreSQL wallet balances and ledger transactions are the only financial authority',
    );
  });

  it('records inherited baseline formatting debt without mutating it', () => {
    expect(manifest.baselineFormattingDebt.length).toBe(17);
    expect(manifest.baselineFormattingDebt).toContain(
      'src/modules/rooms/rooms.service.ts',
    );
    expect(manifest.baselineFormattingDebt).not.toContain(
      'src/wp08/wp08-03-01-economy-contract.spec.ts',
    );
  });

  it('provides controlled package-scoped quality checks', () => {
    expect(checkerSource).toContain('package-owned formatting');
    expect(checkerSource).toContain('npm.cmd run format:wp08:03:01');
    expect(checkerSource).toContain(
      'npm.cmd run format:check:wp08:03:01',
    );
    expect(checkerSource).toContain('npm.cmd run lint:fix:wp08:03:01');
    expect(checkerSource).toContain('npm.cmd run lint:wp08:03:01');
    expect(checkerSource).not.toContain('npm audit fix');
  });

  it('registers focused formatting, lint, test, and full checks', () => {
    const formatScript = packageJson.scripts['format:wp08:03:01'];
    const formatCheckScript = packageJson.scripts['format:check:wp08:03:01'];
    const lintFixScript = packageJson.scripts['lint:fix:wp08:03:01'];
    const lintScript = packageJson.scripts['lint:wp08:03:01'];
    const testScript = packageJson.scripts['test:wp08:03:01'];

    for (const requiredPath of [
      'src/main.ts',
      'src/hosting/frontend-hosting.ts',
      'src/hosting-routing.spec.ts',
      'src/wp08/wp08-03-01-economy-contract.spec.ts',
      'scripts/start-local-full.mjs',
      'scripts/wp08/wp08-03-01-self-check.mjs',
      'scripts/wp08/wp08-03-01-frontend-smoke.mjs',
    ]) {
      expect(formatScript).toContain(requiredPath);
      expect(formatCheckScript).toContain(requiredPath);
    }

    expect(formatScript).toContain('prettier --write');
    expect(formatCheckScript).toContain('prettier --check');
    expect(lintFixScript).toContain('eslint');
    expect(lintFixScript).toContain('--fix');
    expect(lintScript).toContain('eslint');
    expect(lintScript).not.toContain('--fix');
    expect(packageJson.scripts['wp08:03:01:self-check']).toBe(
      'node scripts/wp08/wp08-03-01-self-check.mjs',
    );
    expect(testScript).toContain(
      'src/wp08/wp08-03-01-economy-contract.spec.ts',
    );
    expect(testScript).toContain('src/hosting-routing.spec.ts');
    expect(packageJson.scripts['wp08:03:01:check']).toBe(
      'powershell -ExecutionPolicy Bypass -File scripts/wp08/wp08-03-01-check.ps1',
    );
    expect(checkerSource).toContain('COLLECTED FAILURES:');
    expect(checkerSource).toContain('$Failures');
  });

  it('limits the audit package to acceptance tooling', () => {
    const expectedChanges = [
      'docs/wp08/WP08-03-01-ECONOMY-AUDIT-AND-CONTRACT-LOCK.md',
      'docs/wp08/wp08-03-01-economy-contract-lock.json',
      'src/wp08/wp08-03-01-economy-contract.spec.ts',
      'scripts/wp08/wp08-03-01-self-check.mjs',
      'scripts/wp08/wp08-03-01-check.ps1',
      'package.json',
      'CHANGELOG.md',
    ];
    expect(manifest.allowedChangesForThisPackage).toEqual(
      expect.arrayContaining(expectedChanges),
    );
  });
});
