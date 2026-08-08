# Shared Enums Module (@shared/enums)

## Responsibility
Centralized repository of platform-wide enumeration types guarantees consistent state values across backend, web frontends, and native mobile clients.

## Exported Entities
- `UserRole`: Platform role authorization hierarchy.
- `AppEnvironment`: Deployment environment enumeration.
- `PlatformClient`: Application client identifiers.
- `VerificationStatus`: Creator and host verification lifecycle states.
- `RoomStatus` & `RoomType`: Live audio/video room classification and state.
- `MediaCategory`: Storage categorization enums.
- `NotificationType` & `WalletTransactionType`: Business action categorizations.

## Guidelines
- Enums defined here must be standard TypeScript `enum` declarations (not `const enum`).
- Never rename existing enum values to avoid database and API payload mismatches.
