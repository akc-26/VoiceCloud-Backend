# Shared Platform (@shared)

The shared platform provides common domain contracts, data transfer definitions, enums, permission rules, validation helpers, utility functions, configuration defaults, design tokens, and presentation-branding primitives used across the application suite.

---

## 📁 Repository Structure

```text
shared/
├── api/            # API response envelopes, error contracts & route definitions
├── contracts/      # Core domain model interfaces (User, Room, Health, Media)
├── dto/            # Shared query & filter request interfaces
├── enums/          # Platform-wide TypeScript enums (UserRole, VerificationStatus, etc.)
├── constants/      # System constants, application titles, HTTP header names
├── permissions/    # RBAC permissions and access matrix
├── validators/     # Reusable regex patterns and functional string validators
├── utils/          # Pure helper utilities (date formatting, string truncation, deep clone)
├── config/         # System configuration defaults & feature flags
├── theme/          # Design system tokens (colors, typography, spacing, breakpoints)
├── branding/       # White-label identity, product names, palettes & replaceable brand assets
├── index.ts        # Centralized export entry
└── README.md       # Root documentation
```

---

## 📐 Architecture & Dependency Rules

1. **Isolation Rule**: Code inside `shared/` **MUST NEVER** import from `src/`, `admin/`, `creator/`, `website/`, or any external application code.
2. **Centralized Export Rule**: Consumers should import modules through path aliases (`@shared/api`, `@shared/contracts`, `@shared/enums`, etc.) or directly through the main centralized entry `@shared`.
3. **Pure Function Requirement**: Utility functions inside `shared/utils` or `shared/validators` must be side-effect free and runnable in both Node.js and browser JS environments.
4. **Versioning Strategy**: Breaking changes to `@shared` entities require a formal migration review and update across all client applications.

---

## 🛠️ Usage Example

```typescript
import {
  UserRole,
  hasPermission,
  Permission,
  ApiResponse,
  THEME_TOKENS,
} from '@shared';

const isAuthorized = hasPermission(UserRole.ADMIN, Permission.USER_BAN);
console.log('Is Admin Authorized:', isAuthorized);
```
