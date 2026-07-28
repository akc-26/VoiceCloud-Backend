import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase1ACoreDomainFoundation1700000000000 implements MigrationInterface {
  name = 'Phase1ACoreDomainFoundation1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create clubs table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "clubs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying NOT NULL,
        "handle" character varying NOT NULL,
        "description" text NOT NULL DEFAULT '',
        "imageUrl" character varying,
        "bannerUrl" character varying,
        "category" character varying NOT NULL DEFAULT 'General',
        "rules" json NOT NULL DEFAULT '[]',
        "visibility" character varying NOT NULL DEFAULT 'PUBLIC',
        "memberCount" integer NOT NULL DEFAULT 1,
        "hostCount" integer NOT NULL DEFAULT 1,
        "upcomingRoomsCount" integer NOT NULL DEFAULT 0,
        "ownerId" uuid NOT NULL,
        "isVerified" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_clubs_handle" UNIQUE ("handle"),
        CONSTRAINT "PK_clubs_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_clubs_name" ON "clubs" ("name")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_clubs_category" ON "clubs" ("category")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_clubs_ownerId" ON "clubs" ("ownerId")`);

    // 2. Create club_members table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "club_members" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "clubId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "role" character varying NOT NULL DEFAULT 'MEMBER',
        "joinedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_club_members_clubId_userId" UNIQUE ("clubId", "userId"),
        CONSTRAINT "PK_club_members_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_club_members_clubId" ON "club_members" ("clubId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_club_members_userId" ON "club_members" ("userId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_club_members_club_user" ON "club_members" ("clubId", "userId")`);

    // 3. Create scheduled_rooms table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "scheduled_rooms" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "title" character varying NOT NULL,
        "description" text,
        "category" character varying NOT NULL DEFAULT 'General',
        "language" character varying NOT NULL DEFAULT 'en',
        "tags" json,
        "coverUrl" character varying,
        "hostId" uuid NOT NULL,
        "clubId" uuid,
        "scheduledStartTime" TIMESTAMP NOT NULL,
        "durationMinutes" integer NOT NULL DEFAULT 60,
        "timeZone" character varying NOT NULL DEFAULT 'UTC',
        "status" character varying NOT NULL DEFAULT 'SCHEDULED',
        "visibility" character varying NOT NULL DEFAULT 'PUBLIC',
        "isInviteOnly" boolean NOT NULL DEFAULT false,
        "maxParticipants" integer NOT NULL DEFAULT 500,
        "rsvpCount" integer NOT NULL DEFAULT 0,
        "isPremium" boolean NOT NULL DEFAULT false,
        "ticketPriceAmount" numeric(10,2) NOT NULL DEFAULT 0,
        "currency" character varying NOT NULL DEFAULT 'USD',
        "reminderSettings" json,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_scheduled_rooms_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_scheduled_rooms_title" ON "scheduled_rooms" ("title")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_scheduled_rooms_category" ON "scheduled_rooms" ("category")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_scheduled_rooms_hostId" ON "scheduled_rooms" ("hostId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_scheduled_rooms_clubId" ON "scheduled_rooms" ("clubId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_scheduled_rooms_scheduledStartTime" ON "scheduled_rooms" ("scheduledStartTime")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_scheduled_rooms_status" ON "scheduled_rooms" ("status")`);

    // 4. Create room_tickets table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "room_tickets" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "ticketCode" character varying NOT NULL,
        "scheduledRoomId" uuid,
        "roomId" uuid,
        "userId" uuid NOT NULL,
        "priceUsd" numeric(10,2) NOT NULL DEFAULT 0,
        "status" character varying NOT NULL DEFAULT 'ACTIVE',
        "isValid" boolean NOT NULL DEFAULT true,
        "purchasedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "usedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_room_tickets_ticketCode" UNIQUE ("ticketCode"),
        CONSTRAINT "PK_room_tickets_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_room_tickets_scheduledRoomId" ON "room_tickets" ("scheduledRoomId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_room_tickets_roomId" ON "room_tickets" ("roomId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_room_tickets_userId" ON "room_tickets" ("userId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_room_tickets_status" ON "room_tickets" ("status")`);

    // 5. Extend users table
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "coverUrl" character varying`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "creatorBadge" character varying`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "creatorCategory" character varying`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "creatorTier" character varying`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isCreatorEnabled" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "verificationStatus" character varying NOT NULL DEFAULT 'UNVERIFIED'`);

    // 6. Extend rooms table
    await queryRunner.query(`ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "scheduledRoomId" uuid`);
    await queryRunner.query(`ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "clubId" uuid`);
    await queryRunner.query(`ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "isPremium" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "isTicketRequired" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "isSubscriberOnly" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "isInviteOnly" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "isVerifiedOnly" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "ticketPriceAmount" numeric(10,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "currency" character varying NOT NULL DEFAULT 'USD'`);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_rooms_scheduledRoomId" ON "rooms" ("scheduledRoomId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_rooms_clubId" ON "rooms" ("clubId")`);

    // 7. Foreign Key Constraints
    await queryRunner.query(`
      ALTER TABLE "clubs"
      ADD CONSTRAINT "FK_clubs_owner"
      FOREIGN KEY ("ownerId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "club_members"
      ADD CONSTRAINT "FK_club_members_club"
      FOREIGN KEY ("clubId") REFERENCES "clubs"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "club_members"
      ADD CONSTRAINT "FK_club_members_user"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "scheduled_rooms"
      ADD CONSTRAINT "FK_scheduled_rooms_host"
      FOREIGN KEY ("hostId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "scheduled_rooms"
      ADD CONSTRAINT "FK_scheduled_rooms_club"
      FOREIGN KEY ("clubId") REFERENCES "clubs"("id")
      ON DELETE SET NULL ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "room_tickets"
      ADD CONSTRAINT "FK_room_tickets_scheduledRoom"
      FOREIGN KEY ("scheduledRoomId") REFERENCES "scheduled_rooms"("id")
      ON DELETE SET NULL ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "room_tickets"
      ADD CONSTRAINT "FK_room_tickets_room"
      FOREIGN KEY ("roomId") REFERENCES "rooms"("id")
      ON DELETE SET NULL ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "room_tickets"
      ADD CONSTRAINT "FK_room_tickets_user"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "rooms"
      ADD CONSTRAINT "FK_rooms_club"
      FOREIGN KEY ("clubId") REFERENCES "clubs"("id")
      ON DELETE SET NULL ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "rooms"
      ADD CONSTRAINT "FK_rooms_scheduledRoom"
      FOREIGN KEY ("scheduledRoomId") REFERENCES "scheduled_rooms"("id")
      ON DELETE SET NULL ON UPDATE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "rooms" DROP CONSTRAINT IF EXISTS "FK_rooms_scheduledRoom"`);
    await queryRunner.query(`ALTER TABLE "rooms" DROP CONSTRAINT IF EXISTS "FK_rooms_club"`);
    await queryRunner.query(`ALTER TABLE "room_tickets" DROP CONSTRAINT IF EXISTS "FK_room_tickets_user"`);
    await queryRunner.query(`ALTER TABLE "room_tickets" DROP CONSTRAINT IF EXISTS "FK_room_tickets_room"`);
    await queryRunner.query(`ALTER TABLE "room_tickets" DROP CONSTRAINT IF EXISTS "FK_room_tickets_scheduledRoom"`);
    await queryRunner.query(`ALTER TABLE "scheduled_rooms" DROP CONSTRAINT IF EXISTS "FK_scheduled_rooms_club"`);
    await queryRunner.query(`ALTER TABLE "scheduled_rooms" DROP CONSTRAINT IF EXISTS "FK_scheduled_rooms_host"`);
    await queryRunner.query(`ALTER TABLE "club_members" DROP CONSTRAINT IF EXISTS "FK_club_members_user"`);
    await queryRunner.query(`ALTER TABLE "club_members" DROP CONSTRAINT IF EXISTS "FK_club_members_club"`);
    await queryRunner.query(`ALTER TABLE "clubs" DROP CONSTRAINT IF EXISTS "FK_clubs_owner"`);

    await queryRunner.query(`DROP TABLE IF EXISTS "room_tickets"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "scheduled_rooms"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "club_members"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "clubs"`);

    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "verificationStatus"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "isCreatorEnabled"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "creatorTier"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "creatorCategory"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "creatorBadge"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "coverUrl"`);

    await queryRunner.query(`ALTER TABLE "rooms" DROP COLUMN IF EXISTS "currency"`);
    await queryRunner.query(`ALTER TABLE "rooms" DROP COLUMN IF EXISTS "ticketPriceAmount"`);
    await queryRunner.query(`ALTER TABLE "rooms" DROP COLUMN IF EXISTS "isVerifiedOnly"`);
    await queryRunner.query(`ALTER TABLE "rooms" DROP COLUMN IF EXISTS "isInviteOnly"`);
    await queryRunner.query(`ALTER TABLE "rooms" DROP COLUMN IF EXISTS "isSubscriberOnly"`);
    await queryRunner.query(`ALTER TABLE "rooms" DROP COLUMN IF EXISTS "isTicketRequired"`);
    await queryRunner.query(`ALTER TABLE "rooms" DROP COLUMN IF EXISTS "isPremium"`);
    await queryRunner.query(`ALTER TABLE "rooms" DROP COLUMN IF EXISTS "clubId"`);
    await queryRunner.query(`ALTER TABLE "rooms" DROP COLUMN IF EXISTS "scheduledRoomId"`);
  }
}
