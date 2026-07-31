# VoiceCloud Platform Changelog

All notable changes to the VoiceCloud Enterprise Audio Platform are documented in this file.
The project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

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
