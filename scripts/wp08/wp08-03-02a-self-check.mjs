import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const BASELINE_BRANCH = 'VoiceCloud-Backend-VC-PH08-WP08-03-01-R05';
const BASELINE_COMMIT = '63d6b0d569e971c1b5e8293c48c7d58858179428';
const BASELINE_LOCK_SHA256 =
  '17bd8cd3c6832e438a51eb0a91bee6b261ed663113c66d328fbf1c0a00dc211a';

const text = (path) => readFileSync(join(root, path), 'utf8');
const sha256 = (path) =>
  createHash('sha256').update(readFileSync(join(root, path))).digest('hex');
const fail = (message) => {
  throw new Error(`WP08-03-02A self-check failed: ${message}`);
};

if (sha256('package-lock.json') !== BASELINE_LOCK_SHA256) {
  fail('package-lock.json changed from the accepted R05 baseline');
}

const requiredFiles = [
  'src/modules/wallet/wallet-mutation.service.ts',
  'src/modules/wallet/entities/wallet-transaction.entity.ts',
  'src/database/migrations/1700000000009-Phase08EconomyWalletAuthority.ts',
  'src/modules/wallet/wallet-authority.service.spec.ts',
  'src/modules/wallet/wallet-concurrency.spec.ts',
  'src/database/migrations/economy-wallet-authority.spec.ts',
  'scripts/wp08/wp08-03-02a-check.mjs',
];
for (const path of requiredFiles) {
  if (!existsSync(join(root, path))) fail(`missing required file ${path}`);
}

const mutationSource = text('src/modules/wallet/wallet-mutation.service.ts');
for (const required of [
  'this.dataSource.transaction',
  "lock: { mode: 'pessimistic_write' }",
  'getDeterministicLockOrder',
  'operationKey',
  'balanceBefore',
  'balanceAfter',
  'coinBalance: 0',
]) {
  if (!mutationSource.includes(required)) fail(`wallet authority missing ${required}`);
}
if (mutationSource.includes('userRepository.create')) {
  fail('wallet authority must never fabricate User identities');
}

const walletService = text('src/modules/wallet/wallet.service.ts');
for (const forbidden of [
  'coinBalance: 1000',
  'diamondBalance: 500',
  'withdrawableBalance: 250',
  'Could not auto-provision user',
]) {
  if (walletService.includes(forbidden)) {
    fail(`unsafe R05 wallet bootstrap remains: ${forbidden}`);
  }
}
for (const delegated of [
  'walletMutationService.credit',
  'walletMutationService.debit',
  'walletMutationService.transfer',
  'walletMutationService.convertDiamonds',
  'walletMutationService.recordCreatorEarnings',
]) {
  if (!walletService.includes(delegated)) fail(`missing delegation ${delegated}`);
}

const migration = text(
  'src/database/migrations/1700000000009-Phase08EconomyWalletAuthority.ts',
);
for (const required of [
  'operationKey',
  'operationGroupId',
  'balanceBefore',
  'balanceAfter',
  'WHERE "operationKey" IS NOT NULL',
  'DROP COLUMN IF EXISTS "operationKey"',
]) {
  if (!migration.includes(required)) fail(`migration missing ${required}`);
}

const packageJson = JSON.parse(text('package.json'));
const scripts = packageJson.scripts || {};
if (scripts['wp08:03:02a:check'] !== 'node scripts/wp08/wp08-03-02a-check.mjs') {
  fail('final acceptance must delegate to the cross-platform Node checker');
}
if (!scripts['wp08:03:02a:prepare']?.includes('format:wp08:03:02a')) {
  fail('development preparation command is missing formatting normalization');
}
if (!scripts['wp08:03:02a:prepare']?.includes('lint:fix:wp08:03:02a')) {
  fail('development preparation command is missing ESLint normalization');
}

const checker = text('scripts/wp08/wp08-03-02a-check.mjs');
for (const forbidden of [
  'format:wp08:03:02a',
  'lint:fix:wp08:03:02a',
  'npm audit fix',
  'migration:run',
]) {
  if (checker.includes(`'${forbidden}'`) || checker.includes(`\"${forbidden}\"`)) {
    fail(`final checker contains forbidden mutating command ${forbidden}`);
  }
}
if (!checker.includes('format:check:wp08:03:02a')) {
  fail('final checker does not perform non-mutating formatting verification');
}
if (!checker.includes('lint:wp08:03:02a')) {
  fail('final checker does not perform non-mutating lint verification');
}
if (!checker.includes('Source immutability verification')) {
  fail('final checker does not verify before/after source hashes');
}
if (!checker.includes('process.env.npm_execpath')) {
  fail('final checker must invoke the active npm CLI through npm_execpath');
}
if (checker.includes('npm.cmd') || checker.includes('npx.cmd')) {
  fail('final checker must not spawn Windows .cmd shims directly from Node');
}
if (!checker.includes('process.execPath')) {
  fail('final checker must launch npm through the current Node executable');
}

console.log('WP08-03-02A financial authority self-check passed.');
console.log(`Baseline branch: ${BASELINE_BRANCH}`);
console.log(`Baseline commit: ${BASELINE_COMMIT}`);
console.log('package-lock.json remains byte-identical to accepted R05.');
