# VoiceCloud VC-PH08-WP08-01 Implementation Report

## Baseline

- Repository: `https://github.com/akc-26/VoiceCloud-Backend/`
- Authoritative baseline branch: `backend-ph08-wp07-continuation`
- Accepted source package used for implementation: WP07 Package 07
- Architecture preserved: NestJS monolith, PostgreSQL/TypeORM, Redis/ioredis, BullMQ, Socket.IO, Landing `/`, Admin `/admin`, Creator `/creator`, APIs `/api/v1/*`, Swagger `/api/docs`, health `/health`.

No established application, module, migration, API prefix, route basename, queue, socket, entity, or shared contract was deleted.

## Controlled WP08 split

WP08 is too large for one safe implementation. It is divided into controlled work packages:

1. **WP08-01 (this package):** real-infrastructure foundation and real HTTP identity/profile/private Host lifecycle.
2. **WP08-02:** real room lifecycle, Socket.IO participation and moderation workflows.
3. **WP08-03:** earnings, rewards, settlements, notifications, recovery paths and consolidated WP08 acceptance.

This package does not claim that all of WP08 is complete.

## Baseline defects corrected

The accepted WP07 development startup could silently use `pg-mem` and `ioredis-mock` when PostgreSQL and Redis were configured on localhost. That behavior was suitable for fallback development but could not prove a real WP08 workflow.

WP08-01 introduces an explicit infrastructure policy:

- `INFRASTRUCTURE_MODE=auto`: attempts real PostgreSQL and Redis, with a visible development fallback.
- `INFRASTRUCTURE_MODE=real`: fails startup unless both real services are reachable.
- `INFRASTRUCTURE_MODE=memory`: deterministic development/test fallback; forbidden in production.
- Jest defaults to memory mode unless explicitly overridden.
- `DATABASE_SYNCHRONIZE=true` is forbidden in production.
- Health output identifies the actual database and Redis engines and exposes `realInfrastructure`.

The API metadata and startup log now advertise the locked `/health` route rather than the obsolete `/api/v1/health` path.

## Real HTTP workflow coverage

The acceptance runner performs real requests against the unified built application and an isolated real PostgreSQL database plus real Redis/Memurai. It covers:

- health and infrastructure identity;
- Landing, Admin, Creator and Swagger route availability;
- unknown/random login rejection;
- Admin and Creator authentication and backend role enforcement;
- Creator denial from Admin settings and Host review APIs;
- unique user registration;
- authenticated profile retrieval and update;
- refresh-token rotation and replay rejection;
- backend-authoritative Host eligibility;
- private Government ID, selfie and supporting-document uploads;
- safe upload DTOs with no storage-key leakage;
- owner-only unlinked asset access;
- cross-user and premature Admin access denial;
- asset-ID Host application submission;
- duplicate pending-application rejection;
- Admin application and linked private-document review;
- controlled rejection and applicant reason visibility;
- rejected application resubmission using retained private assets;
- Admin approval;
- privacy-safe approved public Host profile;
- Host lifecycle audit history;
- restoration of original Host business settings on success or failure.

## Acceptance isolation

`WP08-01-CHECK.cmd`:

- installs locked dependencies with `npm ci`;
- verifies formatting and non-mutating ESLint;
- runs focused and complete Jest suites;
- builds Backend, Landing, Admin and Creator;
- allocates an available local port;
- creates a unique temporary PostgreSQL database;
- starts the built monolith with `INFRASTRUCTURE_MODE=real`;
- requires health to confirm real PostgreSQL and real Redis;
- runs the real HTTP workflow;
- stops the application;
- drops the temporary database;
- deletes temporary private files;
- retains server logs only when a failure occurs.

The PostgreSQL account used for acceptance must be allowed to create and drop a temporary database. Redis or Memurai must already be running.

## Files added

- `WP08-01-CHECK.cmd`
- `scripts/wp08/wp08-01-check.ps1`
- `scripts/wp08/wp08-01-database.mjs`
- `scripts/wp08/wp08-01-acceptance.mjs`
- `src/config/infrastructure-mode.ts`
- `src/config/infrastructure-mode.spec.ts`
- `src/config/env-validator.spec.ts`
- `src/modules/health/health.service.spec.ts`
- `src/wp08/wp08-01-acceptance-contract.spec.ts`
- `WP08-01-IMPLEMENTATION-REPORT.md`
- `WP08-PACKAGE-01-VERIFICATION.md`

## Files modified

- `.env.example`
- `.gitignore`
- `package.json`
- `src/app.controller.ts`
- `src/config/configuration.ts`
- `src/config/env-validator.ts`
- `src/config/validation.schema.ts`
- `src/database/database.module.ts`
- `src/hosting-routing.spec.ts`
- `src/main.ts`
- `src/modules/health/health.controller.ts`
- `src/modules/health/health.service.ts`
- `src/redis/redis.module.ts`

## Files deleted

None.

## Dependency and database scope

- No runtime or development dependency version was changed.
- `package-lock.json` was not changed.
- No entity or migration was added, removed or modified.
- The normal and production database policy remains `DATABASE_SYNCHRONIZE=false`.
- Automatic synchronization is used only for the temporary isolated WP08 acceptance database, which is dropped afterward.

## Required local verification

Extract into a new folder. Ensure PostgreSQL and Redis/Memurai are running, then execute:

```cmd
WP08-01-CHECK.cmd
```

WP08-01 must not be accepted or pushed as the next stable baseline until this complete Windows verification passes.


## Revision 03 acceptance corrections

- Reconciled `src/app.controller.spec.ts` with the locked `/health` runtime metadata contract.
- Added AppController and hosting-routing tests to the focused acceptance preflight.
- Changed the complete Jest command to direct serial execution with `npx.cmd jest --runInBand`, avoiding npm argument forwarding ambiguity and parallel worker teardown noise.
- Added a checker-contract regression that prevents either issue from returning.
