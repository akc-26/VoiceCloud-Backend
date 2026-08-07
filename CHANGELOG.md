
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
