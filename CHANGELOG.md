# VoiceCloud Platform Changelog

All notable changes to the VoiceCloud Enterprise Audio Platform are documented in this file.
The project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
