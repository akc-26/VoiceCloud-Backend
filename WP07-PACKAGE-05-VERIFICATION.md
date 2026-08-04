# VoiceCloud VC-PH08-WP07 Package 05 Verification

## Baseline

Package 05 is derived only from `VoiceCloud-Backend-VC-PH08-WP07-04.zip`.

## Reported Package 04 failures

1. `hosts.security.spec.ts` did not throw for a non-admin user because `RolesGuard` treated a role-array mock as truthy public metadata.
2. `authentication-security.spec.ts` loaded `firebase-admin` transitively through `AuthService`, causing Jest CommonJS execution to parse the ESM-only `jose` package.

## Permanent corrections

- `RolesGuard` bypasses authorization only when `IS_PUBLIC_KEY === true`.
- `JwtAuthGuard` uses the same strict boolean public-route rule.
- The authentication unit suite mocks `GoogleAuthService` before loading `AuthService`, preventing Firebase/Jose from entering this isolated unit test.
- The overbroad class-level `CREATOR` role restriction introduced in Package 04 was removed from `CreatorController`, preserving existing authenticated-user subscription routes.
- Development acceptance accounts now verify and repair stale password hashes as well as roles.
- Admin and Creator browser persistence keys were advanced to v3 to invalidate stale local sessions.
- Focused authorization/authentication tests run before the full build and complete Jest suite.

## Static verification completed in the packaging environment

- Parsed/transpiled 734 TypeScript/TSX files with zero syntax diagnostics.
- Executed an isolated runtime simulation of `RolesGuard` strict public metadata behavior.
- Executed an isolated runtime simulation of `JwtAuthGuard` strict public metadata behavior.
- Executed an isolated runtime simulation of development-account role/password repair.
- Verified package dependency declarations and lockfile are unchanged from Package 04.
- Verified no migration changes.
- Verified no `node_modules`, `dist`, `.git`, `coverage`, `.env`, logs, or generated uploads are included.

## Full acceptance command

Run from Windows Command Prompt:

```cmd
WP07-05-CHECK.cmd
```

The script performs locked dependency installation, formatting normalization and verification, ESLint, focused security regressions, all application builds, and the complete Jest suite.

The packaging sandbox cannot execute `npm ci` because its isolated package mirror does not contain the locked `zustand@5.0.14` archive. Therefore the complete dependency-backed suite must run in the Windows acceptance environment, where Package 04 already installed the same lockfile successfully.
