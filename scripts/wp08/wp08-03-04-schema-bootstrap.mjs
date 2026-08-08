import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const databaseName = process.env.DATABASE_NAME ?? '';
const expectedDatabaseName = process.env.WP08_DATABASE_NAME ?? '';

function fail(message) {
  throw new Error(`WP08-03-04 isolated schema bootstrap refused: ${message}`);
}

if (!/^voicecloud_wp08_03_04_\d{17}$/.test(databaseName)) {
  fail(
    `DATABASE_NAME is not a guarded WP08 temporary database: ${databaseName || '<empty>'}`,
  );
}
if (expectedDatabaseName && expectedDatabaseName !== databaseName) {
  fail(
    `WP08_DATABASE_NAME (${expectedDatabaseName}) does not match DATABASE_NAME (${databaseName})`,
  );
}

const dataSourcePath = resolve('dist/src/database/data-source.js');
const moduleUrl = pathToFileURL(dataSourcePath).href;
const dataSourceModule = await import(moduleUrl);
const dataSource = dataSourceModule.AppDataSource ?? dataSourceModule.default;
if (!dataSource?.initialize || !dataSource?.synchronize) {
  fail('compiled AppDataSource could not be loaded');
}

const historicalMigrations = [
  [1700000000000, 'Phase1ACoreDomainFoundation1700000000000'],
  [1700000000001, 'Phase1BWalletFoundation1700000000001'],
  [1700000000002, 'Phase1CCreatorEconomyFoundation1700000000002'],
  [1700000000003, 'Phase16AuthenticationIdentityPlatform1700000000003'],
  [1700000000004, 'Phase17UserProfileSocialIdentity1700000000004'],
  [1700000000005, 'Phase17SocialIdentityAndVisitors1700000000005'],
  [1700000000006, 'Phase08HostVerificationPrivateAssetStorage1700000000006'],
  [
    1700000000007,
    'Phase08HostVerificationLegacyMigrationTracking1700000000007',
  ],
  [1700000000008, 'Phase08RoomLifecycleAuthority1700000000008'],
];

const authorityRewind = [
  'DROP TABLE IF EXISTS "host_settlement_requests" CASCADE',
  'DROP TABLE IF EXISTS "lucky_box_openings" CASCADE',
  `ALTER TABLE "wallet_transactions"
     DROP COLUMN IF EXISTS "operationKey",
     DROP COLUMN IF EXISTS "operationGroupId",
     DROP COLUMN IF EXISTS "balanceBefore",
     DROP COLUMN IF EXISTS "balanceAfter"`,
  `ALTER TABLE "gift_transactions"
     DROP COLUMN IF EXISTS "operationKey",
     DROP COLUMN IF EXISTS "operationGroupId",
     DROP COLUMN IF EXISTS "senderWalletTransactionId",
     DROP COLUMN IF EXISTS "receiverWalletTransactionId",
     DROP COLUMN IF EXISTS "settledAt"`,
  `ALTER TABLE "creator_payout_requests"
     DROP COLUMN IF EXISTS "reservedAt",
     DROP COLUMN IF EXISTS "settledAt",
     DROP COLUMN IF EXISTS "releasedAt",
     DROP COLUMN IF EXISTS "operationGroupId",
     DROP COLUMN IF EXISTS "reserveOperationKey",
     DROP COLUMN IF EXISTS "reservationTransactionId",
     DROP COLUMN IF EXISTS "settlementTransactionId",
     DROP COLUMN IF EXISTS "releaseTransactionId",
     DROP COLUMN IF EXISTS "rejectionReason"`,
  `ALTER TABLE "host_earnings"
     DROP COLUMN IF EXISTS "authorityInitializedAt",
     DROP COLUMN IF EXISTS "authorityBaselineTransactionId"`,
  `ALTER TABLE "reward_audit_logs"
     DROP COLUMN IF EXISTS "operationKey",
     DROP COLUMN IF EXISTS "walletTransactionId",
     DROP COLUMN IF EXISTS "settledAt"`,
  `ALTER TABLE "host_rewards"
     DROP COLUMN IF EXISTS "claimOperationKey",
     DROP COLUMN IF EXISTS "walletTransactionId"`,
  `ALTER TABLE "vip_transactions"
     DROP COLUMN IF EXISTS "operationKey",
     DROP COLUMN IF EXISTS "paymentProvider",
     DROP COLUMN IF EXISTS "paymentReference",
     DROP COLUMN IF EXISTS "currency",
     DROP COLUMN IF EXISTS "walletTransactionId"`,
  `ALTER TABLE "vip_reward_claims"
     DROP COLUMN IF EXISTS "operationKey",
     DROP COLUMN IF EXISTS "walletTransactionId"`,
  `ALTER TABLE "notifications"
     DROP COLUMN IF EXISTS "operationKey",
     DROP COLUMN IF EXISTS "deliveryStatus",
     DROP COLUMN IF EXISTS "deliveryAttemptCount",
     DROP COLUMN IF EXISTS "lastDeliveryAttemptAt",
     DROP COLUMN IF EXISTS "deliveredAt",
     DROP COLUMN IF EXISTS "lastDeliveryError"`,
];

let initialized = false;
try {
  await dataSource.initialize();
  initialized = true;

  const [{ current_database: currentDatabase }] = await dataSource.query(
    'SELECT current_database()',
  );
  if (currentDatabase !== databaseName) {
    fail(
      `connected database ${currentDatabase} does not match guarded database ${databaseName}`,
    );
  }

  console.log(
    `[BOOTSTRAP] Guarded isolated database confirmed: ${currentDatabase}`,
  );
  console.log(
    '[BOOTSTRAP] Creating current entity schema in the isolated database only...',
  );
  await dataSource.synchronize(false);

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();
  try {
    for (const statement of authorityRewind) {
      await queryRunner.query(statement);
    }

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "migrations" (
        "id" SERIAL NOT NULL,
        "timestamp" bigint NOT NULL,
        "name" character varying NOT NULL,
        CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query('DELETE FROM "migrations"');

    for (const [timestamp, name] of historicalMigrations) {
      await queryRunner.query(
        'INSERT INTO "migrations" ("timestamp", "name") VALUES ($1, $2)',
        [timestamp, name],
      );
    }

    await queryRunner.commitTransaction();
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }

  const [{ table_count: tableCount }] = await dataSource.query(`
    SELECT COUNT(*)::int AS table_count
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `);
  const [{ migration_count: migrationCount }] = await dataSource.query(
    'SELECT COUNT(*)::int AS migration_count FROM "migrations"',
  );

  if (Number(migrationCount) !== historicalMigrations.length) {
    fail(
      `expected ${historicalMigrations.length} historical migration markers, found ${migrationCount}`,
    );
  }

  console.log(
    `[BOOTSTRAP] Current entity schema created (${tableCount} public tables).`,
  );
  console.log(
    '[BOOTSTRAP] WP08 authority delta rewound to the accepted pre-03-02 authority boundary.',
  );
  console.log(
    `[BOOTSTRAP] Marked ${migrationCount} historical incremental migrations as applied.`,
  );
  console.log(
    '[BOOTSTRAP] Ready for migrations 1700000000009 through 1700000000013.',
  );
} finally {
  if (initialized && dataSource.isInitialized) {
    await dataSource.destroy();
  }
}
