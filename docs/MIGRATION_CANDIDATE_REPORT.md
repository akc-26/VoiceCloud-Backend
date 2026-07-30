# VoiceCloud - Future Migration Candidate Report (VC-PH03)

This report details candidates identified in `VoiceCloud-Backend` (`src/`) and `VoiceCloud Admin Console` (`admin/`) for future migration into `@shared/`.

> **Note**: Per VC-PH03 constraints, these modules are **NOT** migrated in this phase. This report establishes the roadmap for future phases (e.g. VC-PH04, VC-PH05).

---

## 📋 Identified Migration Candidates

| # | Current Location | Future Shared Location | Description | Dependencies | Migration Complexity |
|---|---|---|---|---|---|
| 1 | `src/common/enums/user-role.enum.ts` | `shared/enums/` | System user roles (`super_admin`, `admin`, `creator`, `user`, `guest`) | None | Low |
| 2 | `src/common/enums/verification-status.enum.ts` | `shared/enums/` | Verification lifecycle states | None | Low |
| 3 | `src/common/enums/media-category.enum.ts` | `shared/enums/` | Storage media categories | None | Low |
| 4 | `src/common/enums/notification-type.enum.ts` | `shared/enums/` | Notification event types | None | Low |
| 5 | `src/modules/auth/dto/login.dto.ts` | `shared/dto/` | Login request payload specification | `class-validator` | Medium |
| 6 | `src/modules/auth/dto/register.dto.ts` | `shared/dto/` | Registration request specification | `class-validator` | Medium |
| 7 | `src/common/dto/api-response.dto.ts` | `shared/api/` | Standardized JSON response envelope wrapper | None | Low |
| 8 | `src/common/dto/paginated-response.dto.ts` | `shared/api/` | Pagination payload envelope | None | Low |
| 9 | `src/modules/rooms/enums/room-status.enum.ts` | `shared/enums/` | Audio room statuses | None | Low |
| 10 | `src/modules/moderation/enums/report-status.enum.ts` | `shared/enums/` | Moderation report status values | None | Low |
| 11 | `admin/src/types/user.ts` | `shared/contracts/` | Admin frontend user profile type definition | None | Low |
| 12 | `admin/src/types/room.ts` | `shared/contracts/` | Admin frontend room type definition | None | Low |

---

## 🎯 Migration Execution Plan & Safeguards

1. **Phase Rollout**: Migration will be executed incrementally during module-specific phases (e.g., Creator Studio in VC-PH04, Landing Website in VC-PH05).
2. **Backward Compatibility Guarantee**: When legacy files in `src/common/enums` are migrated, the legacy file path will re-export from `@shared/enums` to prevent breaking existing backend imports.
3. **Validation Isolation**: Frontend apps will import TypeScript interfaces from `@shared/dto`, while backend services continue using NestJS `class-validator` decorated classes extending shared interfaces.
