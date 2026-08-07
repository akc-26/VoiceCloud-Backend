import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const requiredBaseline = {
  branch: 'VoiceCloud-Backend-VC-PH08-WP08-03-02A-R02',
  commit: '249281c39388f18ee3ad5a5cc6a5797cbb052d92',
  packageLockSha256:
    '17bd8cd3c6832e438a51eb0a91bee6b261ed663113c66d328fbf1c0a00dc211a',
};

const failures = [];
const read = (path) => readFileSync(join(root, path), 'utf8');
const requireFile = (path) => {
  if (!existsSync(join(root, path))) {
    failures.push(`Missing required file: ${path}`);
  }
};
const requireText = (path, text) => {
  if (!read(path).includes(text)) {
    failures.push(`${path} missing: ${text}`);
  }
};
const forbidText = (path, text) => {
  if (read(path).includes(text)) {
    failures.push(`${path} must not contain: ${text}`);
  }
};

for (const path of [
  'src/modules/gifts/gift-settlement.service.ts',
  'src/modules/gifts/gifting-engine.service.ts',
  'src/modules/gifts/multi-gifting.service.ts',
  'src/modules/gifts/gift-settlement.service.spec.ts',
  'src/modules/gifts/gifting-engine.authority.spec.ts',
  'src/database/migrations/1700000000010-Phase08AuthoritativeGiftSettlement.ts',
  'src/database/migrations/authoritative-gift-settlement.spec.ts',
  'docs/wp08/WP08-03-02B-AUTHORITATIVE-GIFT-SETTLEMENT.md',
  'scripts/wp08/wp08-03-02b-check.mjs',
]) {
  requireFile(path);
}

const lockHash = createHash('sha256')
  .update(readFileSync(join(root, 'package-lock.json')))
  .digest('hex');
if (lockHash !== requiredBaseline.packageLockSha256) {
  failures.push(
    `package-lock.json changed from accepted 03-02A baseline: ${lockHash}`,
  );
}

requireText(
  'src/modules/gifts/gift-settlement.service.ts',
  'SELECT pg_advisory_xact_lock(hashtext($1))',
);
requireText(
  'src/modules/gifts/gift-settlement.service.ts',
  "lock: { mode: 'pessimistic_write' }",
);
requireText(
  'src/modules/gifts/gift-settlement.service.ts',
  'WalletTransactionType.GIFT_SENT',
);
requireText(
  'src/modules/gifts/gift-settlement.service.ts',
  'WalletTransactionType.GIFT_RECEIVED',
);
requireText(
  'src/modules/gifts/gift-settlement.service.ts',
  'this.walletMutationService.getDeterministicLockOrder',
);
requireText('src/modules/gifts/gift-settlement.service.ts', 'room.hostId');
forbidText('src/modules/gifts/gift-settlement.service.ts', 'host_placeholder');
forbidText('src/modules/gifts/gifting-engine.service.ts', 'wallet:${');
forbidText('src/modules/gifts/multi-gifting.service.ts', 'wallet:${');
forbidText('src/modules/gifts/multi-gifting.service.ts', 'pricePerUnit:');

requireText(
  'src/modules/gifts/gifting-engine.service.ts',
  'if (!settlement.idempotent)',
);
requireText(
  'src/modules/gifts/gifting-engine.service.ts',
  'await this.giftSettlementService.settle',
);
requireText(
  'src/modules/gifts/multi-gifting.service.ts',
  'this.giftingEngineService.sendGift',
);
requireText(
  'src/modules/gifts/multi-gifting.service.ts',
  'room_multi_gift_blast',
);
requireText(
  'src/modules/gifts/multi-gifting.service.ts',
  'if (!result.data.idempotent)',
);
requireText(
  'src/common/events/gateways/reactions.gateway.ts',
  'Gift Broadcast Events (Display Only)',
);
forbidText(
  'src/common/events/gateways/reactions.gateway.ts',
  'WalletMutationService',
);

const migration =
  'src/database/migrations/1700000000010-Phase08AuthoritativeGiftSettlement.ts';
for (const text of [
  '"operationKey"',
  '"operationGroupId"',
  '"senderWalletTransactionId"',
  '"receiverWalletTransactionId"',
  '"settledAt"',
  'UQ_gift_transactions_operationKey',
  'IDX_gift_transactions_operationGroupId',
  'WHERE "operationKey" IS NOT NULL',
]) {
  requireText(migration, text);
}

for (const path of [
  'src/modules/gifts/dto/send-gift-phase22.dto.ts',
  'src/modules/gifts/dto/multi-gift.dto.ts',
]) {
  requireText(path, 'operationKey?: string');
}

const checker = read('scripts/wp08/wp08-03-02b-check.mjs');
for (const forbidden of [
  'prettier --write',
  'eslint --fix',
  'npm audit fix',
  "'run', 'format:wp08:03:02b'",
  "'run', 'lint:fix:wp08:03:02b'",
]) {
  if (checker.includes(forbidden)) {
    failures.push(`Final checker contains mutating command: ${forbidden}`);
  }
}

const revisionSpecificTests = [];
const walk = (directory) => {
  for (const name of readdirSync(directory)) {
    const absolute = join(directory, name);
    const info = statSync(absolute);
    if (info.isDirectory()) {
      walk(absolute);
      continue;
    }
    const path = relative(root, absolute).replaceAll('\\', '/');
    if (/wp08-03-02b.*\.spec\.ts$/i.test(path)) {
      revisionSpecificTests.push(path);
    }
  }
};
walk(join(root, 'src'));
if (revisionSpecificTests.length) {
  failures.push(
    `Revision-specific 03-02B test files are forbidden: ${revisionSpecificTests.join(
      ', ',
    )}`,
  );
}

if (failures.length) {
  console.error('WP08-03-02B authoritative gift settlement self-check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('WP08-03-02B authoritative gift settlement self-check passed.');
console.log(`Baseline branch: ${requiredBaseline.branch}`);
console.log(`Baseline commit: ${requiredBaseline.commit}`);
console.log('PostgreSQL is the only gift/wallet financial authority.');
console.log('Realtime gift presentation remains post-commit and display-only.');
console.log('package-lock.json remains byte-identical to accepted 03-02A.');
