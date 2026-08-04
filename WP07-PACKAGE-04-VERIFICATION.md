# VoiceCloud WP07 Package 04 Verification

## Purpose

Package 04 fixes the runtime acceptance defects reported after Package 03:

1. Admin System Settings, Auth & Identity, and Hosts returned `403 Access denied: Insufficient privileges`.
2. Creator Studio accepted arbitrary text as a new login identity.

## Root causes

- The Admin login page overrode the backend role with a user-selected role and created a fake token whenever backend login failed.
- The backend email/username login endpoint automatically created a new `USER` account when an identity did not exist.
- The resulting JWT still contained `USER`, so backend Admin role guards correctly rejected it even though the frontend displayed `SUPER_ADMIN`.
- Creator Studio allowed either email or username and did not verify that the authenticated account had the `CREATOR` role.
- Old persisted browser sessions could retain the invalid Package 03 authentication state.

## Permanent corrections

### Backend authentication

- Unknown login identities now return `401`; login never creates accounts.
- Login requires exactly one identifier and a non-empty password.
- Accounts without a password hash cannot use the password-login endpoint.
- Registration requires a password of at least eight characters.
- Email addresses are normalized to lowercase during registration and login.
- JWT roles continue to come only from the persisted backend user record.

### Local acceptance accounts

A development-only startup seeder prepares deterministic accounts when `NODE_ENV` is not `production`:

- `admin@voicecloud.com` / `AdminPass123!` / `SUPER_ADMIN`
- `creator@voicecloud.com` / `CreatorPass123!` / `CREATOR`

The seeder repairs an existing local account with either configured email, including a previously auto-created `USER` account. It is disabled unconditionally in production and can be disabled locally with `DEV_SEED_ACCOUNTS=false`.

### Admin Portal

- Removed the role selector.
- Removed fake JWT and fallback authentication.
- Uses only the backend-returned role.
- Rejects non-Admin portal roles.
- Corrected profile endpoint from `/auth/profile` to `/auth/me`.
- Uses a new persisted-session key so invalid Package 03 sessions are not reused.

### Creator Studio

- Requires a syntactically valid email address and password.
- Does not submit arbitrary text as a username.
- Requires the authenticated backend account to have the `CREATOR` role.
- Uses a new persisted-session key so previous auto-created sessions are not reused.
- Backend Creator APIs now require both JWT authentication and `CREATOR` role.
- Public creator-plan reads remain public because `RolesGuard` now honors `@Public()` metadata.

## Regression coverage

`src/modules/auth/authentication-security.spec.ts` covers:

- required login password
- registration password policy
- exact login identifier contract
- unknown-account rejection without persistence
- passwordless-account rejection
- server-authoritative JWT role
- development account seeding
- production seeding prohibition
- Creator controller JWT/role metadata
- public-route role bypass
- frontend removal of fake Admin login and arbitrary Creator username login

## Package boundaries

- No database migration.
- No dependency additions or upgrades.
- No framework or architecture change.
- Existing WP07 module-wiring and System Settings corrections are preserved.
- `package.json` and `package-lock.json` dependency declarations remain unchanged.

## Verification

Run `WP07-04-CHECK.cmd` from the extracted package root. After all automated checks pass, start the runtime with `npm run start:dev` and verify the three application surfaces and the two credential-rejection cases printed by the script.

## Pre-delivery package checks performed

- TypeScript/TSX syntax transpilation: 738 files checked, zero syntax errors.
- Authentication and package invariants: 24/24 passed.
- Relative source imports: zero unresolved paths.
- `package.json` and `package-lock.json`: byte-identical to Package 03.
- No migration or dependency changes.

The complete locked npm build, ESLint and Jest suite must run through `WP07-04-CHECK.cmd` on the Windows acceptance environment, where Package 03 already installed the locked dependency graph successfully.
