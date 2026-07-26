import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase1BWalletFoundation1700000000001 implements MigrationInterface {
  name = 'Phase1BWalletFoundation1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create wallet_balances table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "wallet_balances" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "coinBalance" bigint NOT NULL DEFAULT 0,
        "diamondBalance" bigint NOT NULL DEFAULT 0,
        "totalCoinsPurchased" bigint NOT NULL DEFAULT 0,
        "totalCoinsSpent" bigint NOT NULL DEFAULT 0,
        "totalDiamondsEarned" bigint NOT NULL DEFAULT 0,
        "totalDiamondsWithdrawn" bigint NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_wallet_balances_userId" UNIQUE ("userId"),
        CONSTRAINT "PK_wallet_balances_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_wallet_balances_userId" ON "wallet_balances" ("userId")`,
    );

    // 2. Create wallet_transactions table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "wallet_transactions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "walletId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "transactionType" character varying NOT NULL DEFAULT 'PURCHASE',
        "amount" numeric(14,2) NOT NULL DEFAULT 0,
        "currency" character varying NOT NULL DEFAULT 'COIN',
        "referenceType" character varying,
        "referenceId" character varying,
        "status" character varying NOT NULL DEFAULT 'COMPLETED',
        "description" text,
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_wallet_transactions_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_wallet_transactions_walletId" ON "wallet_transactions" ("walletId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_wallet_transactions_userId" ON "wallet_transactions" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_wallet_transactions_transactionType" ON "wallet_transactions" ("transactionType")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_wallet_transactions_status" ON "wallet_transactions" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_wallet_transactions_createdAt" ON "wallet_transactions" ("createdAt")`,
    );

    // 3. Create coin_packages table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "coin_packages" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "packageName" character varying NOT NULL,
        "coinAmount" bigint NOT NULL DEFAULT 0,
        "bonusCoins" bigint NOT NULL DEFAULT 0,
        "price" numeric(10,2) NOT NULL DEFAULT 0,
        "currency" character varying NOT NULL DEFAULT 'USD',
        "badgeText" character varying,
        "displayOrder" integer NOT NULL DEFAULT 0,
        "isPopular" boolean NOT NULL DEFAULT false,
        "isActive" boolean NOT NULL DEFAULT true,
        "startsAt" TIMESTAMP,
        "expiresAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_coin_packages_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_coin_packages_displayOrder" ON "coin_packages" ("displayOrder")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_coin_packages_isActive" ON "coin_packages" ("isActive")`,
    );

    // 4. Foreign Key Constraints
    await queryRunner.query(`
      ALTER TABLE "wallet_balances"
      ADD CONSTRAINT "FK_wallet_balances_user"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "wallet_transactions"
      ADD CONSTRAINT "FK_wallet_transactions_wallet"
      FOREIGN KEY ("walletId") REFERENCES "wallet_balances"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "wallet_transactions"
      ADD CONSTRAINT "FK_wallet_transactions_user"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "wallet_transactions" DROP CONSTRAINT IF EXISTS "FK_wallet_transactions_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet_transactions" DROP CONSTRAINT IF EXISTS "FK_wallet_transactions_wallet"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet_balances" DROP CONSTRAINT IF EXISTS "FK_wallet_balances_user"`,
    );

    await queryRunner.query(`DROP TABLE IF EXISTS "coin_packages"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wallet_transactions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wallet_balances"`);
  }
}
