# VoiceCloud - Shared Contracts Manifest (VC-PH02)

This document maps all reusable DTOs, Enums, Interfaces, and API Response contracts identified during Phase **VC-PH02 (Production Hardening & Technical Debt Resolution)**.
These contracts are prepared for future extraction into a shared library (`@voicecloud/shared` or `@voicecloud/contracts`) during **VC-PH03**.

---

## 1. Reusable Enums (`common/enums/`)

| Enum Name | Location | Usage across Modules |
| :--- | :--- | :--- |
| `UserRole` | `src/common/enums/` | Auth, Users, Admin, Moderation, Room |
| `VerificationStatus` | `src/common/enums/` | Users, Host, Admin, Moderation |
| `MediaCategory` | `src/common/enums/` | Storage, Users, Room, Gifts, Announcements |
| `NotificationType` | `src/common/enums/` | Notifications, Room, Wallet, Gifts |
| `WalletTransactionType` | `src/common/enums/` | Wallet, Gifts, Mall, VIP |
| `WalletCurrency` | `src/common/enums/` | Wallet, Gifts, Mall |
| `RoomType` / `RoomStatus` | `src/modules/rooms/` | Rooms, Discovery, Admin, Analytics |
| `GiftType` / `GiftCategory` | `src/modules/gifts/` | Gifts, Gamified Gifting, Admin Mall |
| `ReportStatus` / `ReportType` | `src/modules/moderation/` | Moderation, Admin, User Reports |
| `MallItemType` / `MallRarity` | `src/modules/mall/` | Mall, Store, User Customization |

---

## 2. Reusable Authentication & User DTOs

| DTO / Contract Name | Location | Description |
| :--- | :--- | :--- |
| `LoginDto` | `src/modules/auth/dto/login.dto.ts` | User login credentials payload |
| `RegisterDto` | `src/modules/auth/dto/register.dto.ts` | Account registration payload |
| `RefreshTokenDto` | `src/modules/auth/dto/refresh-token.dto.ts` | Token refresh payload |
| `JwtAccessTokenPayload` | `src/modules/auth/jwt-token.service.ts` | Decoded access token claims |
| `JwtRefreshTokenPayload` | `src/modules/auth/jwt-token.service.ts` | Decoded refresh token claims |
| `UserProfileDto` | `src/modules/users/dto/` | Public user profile contract |

---

## 3. Reusable API Response Wrapping Contracts

| Response Contract | Description |
| :--- | :--- |
| `ApiResponseDto<T>` | Standardized JSON payload wrapper (`success`, `data`, `message`, `timestamp`) |
| `PaginatedResponseDto<T>` | Pagination contract (`items`, `total`, `page`, `limit`, `totalPages`) |
| `JwtTokenPairResponse` | Auth token response contract (`accessToken`, `refreshToken`, `expiresIn`) |

---

## 4. Reusable Storage & Upload Contracts

| Contract Name | Location | Description |
| :--- | :--- | :--- |
| `UploadMediaDto` | `src/modules/storage/dto/` | File metadata & category upload payload |
| `MediaMetadataResponse` | `src/modules/storage/dto/` | Presigned URL / storage reference object |

---

## 5. Preparation Guidelines for VC-PH03 Extraction

1. **Zero Breaking Changes**: When creating `@voicecloud/contracts` in VC-PH03, re-export all extracted entities from their legacy paths in `VoiceCloud-Backend` to guarantee complete backward compatibility.
2. **Type-Only Exports**: Use `export type` for type-only interfaces and type aliases to optimize bundle sizes.
3. **Admin Portal Synchronization**: Import shared contracts directly into the Admin Portal (`admin/src/`) to ensure full type alignment across backend and frontend.
