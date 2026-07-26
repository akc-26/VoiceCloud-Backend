import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserBookmarksTable1700000000003 implements MigrationInterface {
  name = 'CreateUserBookmarksTable1700000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_bookmarks" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "targetType" character varying NOT NULL,
        "targetId" character varying NOT NULL,
        "title" character varying,
        "description" text,
        "imageUrl" character varying,
        "metadata" json,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_user_bookmarks_user_target" UNIQUE ("userId", "targetType", "targetId"),
        CONSTRAINT "PK_user_bookmarks_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_user_bookmarks_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_user_bookmarks_userId" ON "user_bookmarks" ("userId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_user_bookmarks_target" ON "user_bookmarks" ("targetType", "targetId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_bookmarks_target"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_bookmarks_userId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_bookmarks"`);
  }
}
