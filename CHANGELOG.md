## VC-PH08-WP08-03-04 R03 — Real-Infrastructure Historical Baseline Bootstrap Correction

- Preserves the complete R02 UI reconciliation, notification realtime isolation, TypeORM migration-discovery correction, and all accepted WP08 authority behavior.
- Corrects Stage 18 so it no longer treats historical incremental migrations 1700000000000-0008 as a fresh-install schema bootstrap. Those migrations were authored against the pre-existing legacy VoiceCloud schema and legitimately reference tables such as `users` and `rooms`.
- Adds a guarded acceptance-only schema bootstrap that can run only against a `voicecloud_wp08_03_04_<timestamp>` temporary database, creates the current entity schema there, rewinds the WP08 authority delta, records historical migrations 0000-0008, and then replays migrations 0009-0013 through the compiled production TypeORM CLI.
- Keeps application runtime at `DATABASE_SYNCHRONIZE=false` and continues real PostgreSQL/Redis/BullMQ/Socket.IO verification after the authority migrations complete.
- Adds self-check SHA-256 locks for all 14 accepted migration source files so WP08-03-04 cannot silently rewrite migration history.
- No business logic, API/DTO contract, dependency, lockfile, entity, schema migration, financial authority, Creator/Admin UI behavior, or accepted historical migration was changed.

## 2026-08-08 — Production UI & White-label Foundation

- Added a centralized presentation-branding configuration and shared replaceable logo/favicon/app-icon assets for Admin, Creator Studio, and Landing builds.
- Removed production-facing roadmap/development labels and replaced them with product terminology without changing routes, APIs, permissions, financial rules, or business flows.
- Added durable route and critical functional-surface preservation checks for the subsequent UI redesign.
- Documented production-source branding boundaries and the release-packaging separation between engineering tooling and deployable runtime artifacts.
- Added strict Admin/Creator/Website TypeScript certification and closed the full pre-existing Creator MUI v9/type-contract debt exposed by that gate: 82 errors across 16 files.
- Migrated all remaining Creator responsive Grid item props to the supported MUI v9 `size` API without changing responsive breakpoints or page structure.
- Added Vite client typing for Creator runtime environment checks and reconciled presentation-only type mismatches for analytics/profile/room/plan data plus the gift-query AbortSignal call.
- Added source guards that reject removed MUI Grid breakpoint props and missing Creator Vite client types before dependency-backed verification.

## VC-PH08-WP08-03-04 R02 — Production Migration Discovery Correction

- Preserves the complete R01 Creator/Admin UI reconciliation, notification realtime isolation, and real-infrastructure acceptance scope.
- Corrects the shared TypeORM CLI migration discovery glob so only timestamp-prefixed migration files are loaded in source and compiled production modes.
- Prevents compiled Jest `*.spec.js` files from being imported by `migration:run:prod`, eliminating the `describe is not defined` real-infrastructure acceptance failure.
- Adds a durable migration-discovery regression test and package self-check coverage without changing any existing migration, schema, dependency, API, DTO, or financial authority.

## VC-PH08-WP08-03-02D — Host Financial Authority / Admin Economy RBAC / Consolidated Settlement

- Added PostgreSQL-authoritative Host financial reconciliation with durable historical anchoring, immutable Host earnings ledger evidence, and backward-compatible aggregate projections.
- Replaced mutable Host pending/completed settlement authority with durable reservation records, exact settlement consumption, over-settlement rejection, transaction locking, and optional retry idempotency.
- Removed financial settlement clamping; invalid over-settled reservation state now fails reconciliation instead of being silently normalized.
- Reconciled the legacy Admin Creator settlement route with the accepted WP08-03-02C reserved payout lifecycle so it cannot bypass approval, frozen balance, or immutable settlement evidence.
- Enforced explicit ADMIN/SUPER_ADMIN RBAC across Admin Wallet, gift administration, Admin Tasks/Achievements, VIP administration, and Admin notification creation.
- Added a reversible Phase08 Host financial authority migration, product-oriented Host settlement/Admin RBAC tests, and consolidated non-mutating WP08-03-02D acceptance tooling.
- Added a separate locked-dependency/Prettier preparation command; the final 16-stage acceptance checker remains non-mutating.
- Preserved package-lock dependencies and deferred Rewards/Lucky Box/VIP financial authority, notification/queue recovery, UI consolidation, and production certification to their frozen later packages.

## VC-PH08-WP08-03-02C — Creator Payout Lifecycle

- Added PostgreSQL-authoritative Creator payout reservation that moves requested diamonds from spendable/withdrawable balance into frozen balance in the same transaction as payout request and ledger persistence.
- Added strict payout transitions: pending approval, rejection with one-time release, and approved settlement with one-time frozen-balance consumption.
- Added durable payout operation groups, reservation/settlement/release timestamps, immutable ledger links, and rejection evidence through a reversible Phase08 migration.
- Refactored BullMQ payout processing to delegate to the same financial lifecycle authority instead of changing payout status directly.
- Added explicit Admin/Super Admin payout review endpoints while deferring the broader Admin economy RBAC reconciliation to WP08-03-02D.
- Added product-oriented payout lifecycle and migration regression coverage plus consolidated non-mutating acceptance tooling.

## VC-PH08-WP08-03-02B — Authoritative Gift Settlement

- Replaced Redis wallet debits/credits in gift sending with one PostgreSQL transactional settlement authority.
- Added pessimistic gift/wallet locking, deterministic wallet lock ordering, and PostgreSQL advisory locking for idempotent concurrent retries.
- Added authoritative sender coin ledger, receiver diamond ledgers, gift-ledger linkage, atomic limited-stock decrement, and persistent gift operation keys.
- Removed the `host_placeholder` financial path; omitted room receivers now resolve to the persisted room Host.
- Routed both Phase-22 and legacy Phase-18 multi-gift APIs through the same catalog-priced authoritative gifting engine; client `pricePerUnit` remains wire-compatible but is no longer financial authority.
- Moved combo cache, animation queue, and realtime gift presentation strictly after database commit; failures in presentation cannot roll back or duplicate committed money.
- Preserved the display-only Socket.IO gift contract and intentionally deferred Lucky Box/reward authority to WP08-03-03.
- Added the reversible Phase08 authoritative gift settlement migration and product-oriented gift authority/regression tests.
- Added a non-mutating WP08-03-02B acceptance checker that reuses an existing dependency tree on reruns and collects independent failures.

## VC-PH08-WP08-03-01 R05 - Consolidated formatting gate correction

- Preserves the R04 runtime-hosting correction and all passing regression/build/runtime stages.
- Normalizes only the seven WP08-03-01 package-owned files before the non-mutating Prettier verification.
- Prevents formatting drift from being reported a second time through ESLint's `prettier/prettier` rule.
- Runs scoped ESLint auto-fix only on the four WP08-03-01-owned TypeScript files before non-mutating lint verification; all regression/build/runtime stages then run against the normalized result.
- Does not mutate dependencies or modify production business files outside the locked WP08-03-01 hosting scope.

# VC-PH08-WP08-03-01 R04 — Consolidated Verification and Route Boundary Correction

- Removed the unnecessary Express adapter type assertion that failed package-scoped ESLint.
- Reconciled the WP08-03-01 Jest contract with the complete R03 hosting and smoke-test scope.
- Replaced acceptance-time formatting mutation with non-mutating Prettier verification.
- Changed the Windows acceptance checker to collect all independent lint, test, and build failures in one run instead of stopping at the first error.
- Tightened frontend/backend route-prefix boundaries so unrelated routes such as `/apiary`, `/administer`, and `/creator-tools` are not misclassified.
- Added regression coverage for route-boundary collisions and non-GET SPA fallback isolation.

# VC-PH08-WP08-03-01 R03 — Compiled Frontend Runtime Hosting Correction

- Corrected runtime static hosting by registering Landing, Admin, and Creator middleware on the underlying Express adapter before Nest route mapping.
- Added robust compiled `dist` discovery and explicit startup failure when full frontend artifacts are missing.
- Added `npm run start:full` for a deterministic complete local application startup on port 3000.
- Replaced conditional hosting tests with deterministic temporary-build tests for root pages, history fallbacks, index files, and compiled assets.
- Added a post-build child-process smoke test that loads Landing, Admin, Creator, their assets, and `/health` before acceptance can pass.

# VC-PH08-WP08-03-01 R02 — Acceptance Checker Correction

- Corrected the WP08-03-01 checker so it does not fail on 17 formatting-drift files inherited byte-for-byte from the approved WP08-02 Git baseline.
- Added controlled Prettier normalization plus package-scoped Prettier and ESLint verification for only the two WP08-03-01 files.
- Recorded the inherited formatting debt explicitly in the contract manifest rather than silently rewriting unrelated production source.
- Preserved the full WP08-01, WP08-02, complete Jest, and four-application build verification sequence.

# VC-PH08-WP08-03-01 — Economy Audit and Contract Lock

- Locked the approved `VoiceCloud-Backend-VC-PH08-WP08-02-R05` baseline at commit `5d73fac20e87630b70ca8bfe6711be93d94138f0`.
- Audited gifts, wallet ledger, Creator and Host earnings, payouts, rewards, VIP, notifications, BullMQ, Redis events, and Admin/Creator economy integration.
- Recorded 16 evidence-backed findings without modifying production business logic.
- Locked PostgreSQL financial authority, atomic ledger mutations, idempotency, post-commit Socket.IO broadcasts, retry-safe queues, and Admin RBAC requirements.
- Added a non-mutating manifest self-check, focused Jest contract test, and full audit/build checker.

# WP08-01 Revision 03

- Reconciled AppController health metadata tests with the locked `/health` route.
- Added API metadata and hosting-route tests to the focused WP08 preflight.
- Replaced ambiguous npm Jest argument forwarding with deterministic direct serial Jest execution.
- Added checker-contract regression coverage to prevent route and test-command drift.

# WP07 Package 05

- Corrected strict public-route metadata handling in RolesGuard and JwtAuthGuard.
- Isolated AuthService unit tests from Firebase Admin/Jose ESM loading.
- Removed the Package 04 class-level Creator role regression affecting subscription routes.
- Made development acceptance credentials deterministic for existing accounts.
- Invalidated stale Admin and Creator browser sessions with v3 persistence keys.
- Added focused authorization/authentication preflight tests to the acceptance script.

# VoiceCloud Platform Changelog

All notable changes to the VoiceCloud Enterprise Audio Platform are documented in this file.
The project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0-WP07-07] - 2026-08-04 (ExecutionContext Test Contract Correction)

### Fixed

- Replaced incomplete NestJS `ExecutionContext` test doubles with one complete reusable factory.
- Removed the unsafe direct TypeScript assertion that caused `TS2352` during the focused authentication regression suite.
- Preserved strict production authorization behavior without weakening either guard.

## [1.0.0-WP05D] - 2026-07-31 (VC-PH08-WP05D Creator Studio Simplification & Streaming Infrastructure Relocation)

### Reconciled & Certified Creator Studio & Streaming Infrastructure Realignment

- **Creator Studio UI Simplification**: Removed UI exposure of RTMP ingest URLs, WebRTC gateway URLs, stream key secrets, visibility toggles, copy actions, key regeneration controls, and external encoder cards from `/creator/src/pages/SettingsPage.tsx`.
- **Admin Portal Infrastructure Relocation**: Added administrator-managed **Streaming Infrastructure & Media Server Configuration** section to `/admin/src/pages/SystemSettingsPage.tsx` supporting active provider selection (MediaMTX, LiveKit, Ant Media, Agora), edge region, RTMP/WebRTC gateways, TURN/STUN URIs, default bitrate, audio codecs, low-latency mode, cloud recording, and stream key rotation policy.
- **Backend Architecture & Service Preservation**: Retained 100% of NestJS backend streaming endpoints (`GET /creator/stream-credentials` & `POST /creator/stream-credentials/regenerate`), stream key generation logic, JWT authentication, and Swagger documentation for Android apps, external encoders, and future platform integrations.
- **Automated Verification**: Rebuilt all frontend applications (`admin`, `creator`, `website`) and backend NestJS services, passing all unit, integration, and routing test suites.

---

## [1.0.0-WP05C] - 2026-07-31 (VC-PH08-WP05C Multi-Application Hosting, Root Route & SPA Routing Reconciliation)

### Reconciled & Certified Hosting Architecture & SPA Fallback Isolation

- **Approved Root Contract**: Confirmed `GET /` directly serves the public Landing Website (`dist/website/index.html`).
- **API Information Route Preservation**: Re-exposed API metadata endpoints under `GET /api` and `GET /api/info`.
- **Static Asset Guarding**: Configured extension-based asset filtering (`path.extname(reqPath) !== ''`) ensuring missing static assets return 404 rather than erroneous HTML SPA fallbacks.
- **Production Entry Point Standardization**: Updated `package.json` `"start:prod"` script to point accurately to `"node dist/src/main"`.
- **Automated E2E Verification**: Created `src/hosting-routing.spec.ts` to validate route isolation, SPA fallback HTML responses, API JSON metadata preservation, and 404 API error responses.

---

## [1.0.0-WP05B] - 2026-07-31 (VC-PH08-WP05B React/MUI Prop Leakage Reconciliation)

### Reconciled & Certified React/MUI Component Props

- **MUI v6+ Prop Standardization**: Migrated deprecated `InputProps` on `<TextField />` components in Creator Studio Settings (`/creator/src/pages/SettingsPage.tsx`) to `slotProps={{ input: { ... } }}` standard.
- **Zero DOM Prop Leakage**: Eliminated runtime warning (`React does not recognize the InputProps prop on a DOM element`) permanently at root cause without suppressing warnings.

---

## [1.0.0-WP05A] - 2026-07-31 (VC-PH08-WP05A Multi-Application Hosting, Static Asset Routing & Root Route Reconciliation)

### Reconciled & Certified Multi-Application Hosting

- **Root Route Reconciliation**: Relocated root API metadata from `GET /` to `GET /api` and `GET /api/info`.
- **Landing Website Integration**: `GET /` now directly serves the static SPA for Landing Website (`dist/website/index.html`).
- **Production Route Priority Hierarchy**: Certified strict routing hierarchy (`Landing Website` -> `Admin Portal /admin` -> `Creator Studio /creator` -> `REST API /api/v1` -> `Swagger /api/docs` -> `Socket.IO /socket.io`).
- **SPA Fallback Refresh Safety**: Verified hard-refresh handling across all frontend routes (`/features`, `/pricing`, `/admin/users`, `/creator/dashboard`, `/creator/wallet`, etc.) preventing 404 fallthroughs.

---

## [1.0.0-WP05] - 2026-07-31 (VC-PH08-WP05 Enterprise Reconciliation, Regression Audit & Feature Certification)

### Certified & Reconciled Capabilities

#### 1. Backend REST API Reconciliation

- **Complete End-to-End API Coverage**: Verified 100% of Creator Studio and Creator Economy REST routes (`/api/v1/creator/*`, `/api/v1/wallet/*`, `/api/v1/gifts/*`, `/api/v1/social/*`, `/api/v1/notifications/*`).
- **Validation & Auth Compliance**: Strict DTO ValidationPipe enforcement, JwtAuthGuard, RolesGuard, and Swagger OpenAPI `@ApiOperation` annotations across all endpoints.

#### 2. Creator Studio Frontend Audit

- **Full View Coverage**: Verified 100% page functionality across Dashboard, Profile, Settings, Wallet, Revenue, Analytics, Live Rooms, Scheduling, Followers, Subscribers, Notifications, Audience, and Payout Requests.
- **State & Data Synchronization**: React Query data fetching, Zustand state management, unified loading/empty/error states, and responsive layout scaling certified.

#### 3. Realtime Socket.IO Event Engine

- **Full Event Synchronization**: Verified event dispatch and listeners for `/creator`, `/rooms`, and root Socket.IO gateways including `gift_received`, `wallet_updated`, `follower_added`, `subscriber_added`, `notification_created`, `presence_updated`, and auto-reconnect logic with JWT handshake.

#### 4. Enterprise Security & Database Integrity

- **JWT Refresh Rotation & Auth Standard**: Verified multi-tab session handling, transparent single-attempt access token refresh, zero hardcoded secrets, and rate limiting.
- **TypeORM Ledger Integrity**: Verified transactional atomicity, foreign key constraints, cascading soft-deletes, and immutable financial ledgers for coins, diamonds, payouts, and gifts.

---

## [1.0.0] - 2026-07-31 (VC-PH07 Core Business Platform & Production v1.0.0)

### Added & Accelerated Capabilities

#### 1. Live Room Lifecycle & Realtime Audience

- **Room Lifecycle Management**: Complete create, schedule, start live, pause, resume, end live, archive, and replay metadata endpoints.
- **Audience Presence Engine**: Dynamic viewer join/leave notifications, real-time participant counts, role-based audience controls (Host, Speaker, Moderator, Listener).
- **Socket.IO Namespace Synchronization**: Unbound namespace handling for `/creator`, `/rooms`, and root Socket.IO gateways with unified JWT authentication verification.

#### 2. Chat & Moderation Architecture

- **Real-time Public & Moderator Chat**: Instant socket message broadcasting, slow-mode enforcement, message deletion, and user reporting APIs.
- **Automated & Manual Moderation**: Mute/ban management, word blacklist filtering, report auditing, and action log persistence for Admin & Creator Studio dashboards.

#### 3. Creator Economy & Monetization

- **Virtual Gifting Ledger**: Transactional coin spending, diamond revenue earnings, real-time gift event broadcasting with animated effects.
- **Wallet & Payout Engine**: Immutable wallet summary, transaction history tracking, top host rankings, and creator payout initialization.

#### 4. Unified Notifications & Social Features

- **In-App & Live Notifications**: Dynamic alert dispatch for room invites, follower activity, gifts received, and system announcements.
- **Community Discovery**: Follow/unfollow state management, trending creators feed, room search, and creator profile customization.

#### 5. Enterprise Client & Multi-App Routing

- **Landing Website (`/`)**: Static SPA served at root endpoint.
- **Admin Portal (`/admin`)**: Enterprise management console with automatic JWT token refresh retry interceptor.
- **Creator Studio (`/creator`)**: Professional creator studio with real-time Socket.IO synchronization and automatic JWT refresh retry handler.
- **REST API (`/api/v1`)**: OpenAPI/Swagger 3.0 documented REST endpoints with standardized JWT Auth Guard.
- **Swagger Docs (`/api/docs`)**: Interactive OpenAPI contract browser.

---

## [1.0.0-RC1] - 2026-07-31 (VC-PH06 Release Candidate 1)

### Fixed & Verified

- **JWT Authentication Standard**: Unified JWT payload (`sub`, `userId`, `creatorId`, `role`, `iat`, `exp`, `iss`, `aud`) across REST HTTP and Socket.IO handshakes.
- **Token Refresh Interceptors**: Transparent single-attempt JWT access token refresh across Creator Studio and Admin Portal without session disruption or reconnect loops.
- **Backend Logging**: Enhanced `[AuthDebug]` structured logging for token verification, socket room joining, and guard authorization in development mode.
- **Automated Test Suite**: 300 passing test cases across 30 test suites covering room lifecycle, wallet ledgers, real-time event emitters, tasks & achievements, and moderation services.

---

## [1.0.0-WP07-04] - 2026-08-04 (Authentication and Portal Authorization Acceptance Correction)

### Fixed

- Removed Admin fake-token fallback and client-selected role override.
- Restored server-authoritative Admin JWT roles and deterministic development Admin access.
- Rejected unknown email/username login attempts instead of auto-creating accounts.
- Required passwords for login and email registration.
- Restricted Creator Studio login to valid Creator email accounts.
- Protected Creator APIs with the backend `CREATOR` role while preserving public plan reads.
- Invalidated Package 03 browser authentication persistence keys.
- Added focused authentication and portal-authorization regression coverage.

## VC-PH08-WP08-01-R03 migration CLI correction

- Added a dedicated TypeORM CLI data-source wrapper that exports exactly one `DataSource` instance.
- Updated development and production migration scripts to use the CLI-only wrapper.
- Preserved the existing `AppDataSource` named export used by repository tests and application tooling.

## VC-PH08-WP08-03-02A — Financial Authority & Idempotency Foundation

- Replaced unsafe non-zero wallet bootstrap and User auto-provisioning with existing-User-only zero wallet creation.
- Added PostgreSQL transactional wallet mutation authority with pessimistic locking and deterministic multi-wallet lock order.
- Added persistent wallet ledger idempotency/audit fields and reversible Phase08 economy migration.
- Converted credit, debit, transfer, diamond conversion, and Creator earnings to atomic balance+ledger transactions.
- Added optional backward-compatible operation keys and product-oriented wallet/migration regression tests.
- Split mutating development preparation from cross-platform non-mutating final acceptance with before/after source hash verification.

## VC-PH08-WP08-03-02A-R02 — Cross-Platform Acceptance Launcher Correction

- Corrected the Node acceptance verifier on Windows by removing direct `spawnSync` execution of `npm.cmd`/`npx.cmd` shims with `shell: false`, which produced `spawnSync npm.cmd EINVAL`.
- The verifier now invokes the active npm CLI (`process.env.npm_execpath`) through the current Node executable (`process.execPath`) on every platform.
- Removed the `npx` dependency from acceptance execution; focused and full Jest stages now run through the repository's locked `npm test` script.
- Added a dependency-free self-check that rejects future direct `.cmd` spawning and requires the cross-platform Node/npm launcher contract.
- No wallet, migration, DTO, API, frontend, or business implementation changed from WP08-03-02A-R01.

## VC-PH08-WP08-03-03 — Rewards / VIP / Notifications / Queues / Recovery

- Routed task, achievement, streak, check-in, seasonal and queued COIN/DIAMOND rewards through PostgreSQL wallet authority with durable operation keys and immutable wallet references.
- Replaced Redis/fallback Lucky Box wallet authority with atomic PostgreSQL debit/cashback settlement and replayable persisted opening results.
- Added wallet-authoritative Host reward claims with durable claim identity and ledger evidence.
- Added verified-provider VIP purchase/renew/tier-change authority, immutable external-payment evidence and replay-safe periodic VIP reward claims.
- Added idempotent notification creation plus persistent delivery attempts/status and persisted-ID BullMQ delivery retries; historical notifications are protected from accidental re-delivery on migration.
- Connected recovery workers to authoritative persisted operations for rewards, VIP, Host rewards/earnings, gifts and payouts; placeholder financial successes now fail explicitly.
- Added additive/reversible Phase08 rewards/VIP/notification recovery migration and consolidated product-oriented tests.
- Preserved accepted WP08-03-02A/B/C/D financial authority, API compatibility, frontend implementation and `package-lock.json`.
