import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase17SocialIdentityAndVisitors1700000000005 implements MigrationInterface {
  name = 'Phase17SocialIdentityAndVisitors1700000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. profile_visitors
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "profile_visitors" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "targetUserId" varchar NOT NULL,
        "visitorUserId" varchar NOT NULL,
        "isAnonymous" boolean NOT NULL DEFAULT false,
        "visitCount" integer NOT NULL DEFAULT 1,
        "metadata" json,
        "visitedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_profile_visitors_id" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_profile_visitors_targetUserId" ON "profile_visitors" ("targetUserId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_profile_visitors_visitorUserId" ON "profile_visitors" ("visitorUserId")`,
    );

    // 2. friend_requests
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "friend_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "senderId" varchar NOT NULL,
        "receiverId" varchar NOT NULL,
        "status" varchar NOT NULL DEFAULT 'pending',
        "message" varchar,
        "category" varchar,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_friend_requests_id" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_friend_requests_senderId" ON "friend_requests" ("senderId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_friend_requests_receiverId" ON "friend_requests" ("receiverId")`,
    );

    // 3. user_friends
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_friends" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" varchar NOT NULL,
        "friendId" varchar NOT NULL,
        "category" varchar DEFAULT 'friends',
        "alias" varchar,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_friends_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_friends_user_friend" UNIQUE ("userId", "friendId")
      );
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_user_friends_userId" ON "user_friends" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_user_friends_friendId" ON "user_friends" ("friendId")`,
    );

    // 4. user_settings
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_settings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" varchar NOT NULL,
        "messagingPermission" varchar NOT NULL DEFAULT 'everyone',
        "followPermission" varchar NOT NULL DEFAULT 'everyone',
        "invitationPermission" varchar NOT NULL DEFAULT 'everyone',
        "visitorPermission" varchar NOT NULL DEFAULT 'everyone',
        "allowVisitorTracking" boolean NOT NULL DEFAULT true,
        "anonymousVisiting" boolean NOT NULL DEFAULT false,
        "notificationPreferences" json,
        "language" varchar NOT NULL DEFAULT 'en',
        "theme" varchar NOT NULL DEFAULT 'light',
        "timezone" varchar NOT NULL DEFAULT 'UTC',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_settings_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_settings_userId" UNIQUE ("userId")
      );
    `);

    // 5. badges
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "badges" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "code" varchar NOT NULL,
        "name" varchar NOT NULL,
        "description" text,
        "iconUrl" varchar,
        "category" varchar NOT NULL DEFAULT 'system',
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_badges_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_badges_code" UNIQUE ("code")
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "badges"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_settings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_friends"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "friend_requests"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "profile_visitors"`);
  }
}
