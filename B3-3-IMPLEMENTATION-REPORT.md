# VC-PH08-WP06C-B3-3 Implementation and Acceptance-Fix Report

## Authoritative baseline

- Repository: `https://github.com/akc-26/VoiceCloud-Backend`
- Branch: `backend-ph08-wp06c-b3-2-continuation`
- Work was rebuilt from the approved B3-2 baseline. Earlier experimental B3-3 ZIPs were not used as the implementation baseline.

## B3-3 scope implemented

A centralized Host lifecycle transition authority was added with the following allowed transitions:

- No application -> `PENDING` through `APPLY`
- `REJECTED` -> `PENDING` through `REAPPLY`
- `PENDING` -> `APPROVED` through `APPROVE`
- `PENDING` -> `REJECTED` through `REJECT`
- `APPROVED` -> `SUSPENDED` through `SUSPEND`
- `SUSPENDED` -> `APPROVED` through `REACTIVATE`

All skipped, repeated, mismatched, or unauthorized lifecycle transitions are rejected with `ConflictException`. In particular, a suspended Host cannot bypass administrator reactivation by reapplying.

## Acceptance failures investigated and corrected

### 1. Creator test-suite out-of-memory crash

The OOM was caused by an infinite loop in the stream-credential test mock—not by Jest heap size or TypeScript compilation.

The test mock returned the stored credential for every repository `findOne()` query. During `regenerateStreamKey()`, every newly generated key was therefore reported as already existing, so the collision loop never terminated and memory grew until Node crashed.

Correction:

- The repository mock now distinguishes `creatorId` lookups from `streamKey` collision lookups.
- A stream-key lookup returns a conflict only when the queried key actually equals the stored key.
- The Nest testing module is compiled once for the suite and closed after the suite, instead of being compiled separately for every test.
- Jest mocks and spies are reset/restored between tests.

No Creator production service or controller behavior was changed.

### 2. Windows `EPERM` during symbolic-link security test

The previous test attempted to create a file symlink. Windows commonly rejects that operation without elevated privileges or Developer Mode, causing the test setup to fail before the application security check ran.

Correction:

- Windows uses a directory junction.
- Unix-like systems use a directory symlink.
- The linked directory points outside the public upload root.
- The same production path-component protection must still reject the reference with a `Symbolic link` error.

The security assertion is not skipped or weakened.

## Files added

- `src/modules/hosts/host-state-transition.service.ts`
- `src/modules/hosts/host-state-transition.spec.ts`
- `B3-3-IMPLEMENTATION-REPORT.md`

## Files modified

- `src/modules/hosts/hosts.module.ts`
- `src/modules/hosts/hosts.service.ts`
- `src/modules/creator/creator-business.spec.ts`
- `src/modules/hosts/legacy-host-verification-migration.spec.ts`

## Files deleted

- None

## Explicitly unchanged

- Production Creator business logic
- Database entities and migrations
- Website
- Admin Portal
- Creator Studio frontend
- Shared contracts
- Socket.IO
- Redis
- BullMQ
- Storage-provider production behavior
- Public and private storage contracts
- `package.json` and `package-lock.json`
- Jest and TypeScript configuration

## Source-level verification performed

- TypeScript syntax transpilation passed for every added or modified TypeScript file.
- Corrected stream-credential repository semantics were independently exercised and terminate correctly.
- Portable directory-link detection was independently exercised.
- Source comparison found no unrelated deletion or application/module loss.

## Required local acceptance commands

Run from the project root:

```powershell
npm ci
npm run build
npx jest src/modules/hosts/host-state-transition.spec.ts --runInBand
npx jest src/modules/creator/creator-business.spec.ts --runInBand --detectOpenHandles
npx jest src/modules/hosts/legacy-host-verification-migration.spec.ts --runInBand
npx jest src/modules/hosts/host-level-config.spec.ts --runInBand
npx jest src/modules/hosts/host-eligibility.spec.ts --runInBand
npx jest src/modules/hosts/hosts.security.spec.ts --runInBand
npx jest src/modules/hosts/hosts.spec.ts --runInBand
npm test -- --runInBand
```

A normal `npm test` run may also be used after the required `--runInBand` acceptance run succeeds.

## Expected acceptance result

- No `EPERM` symlink setup failure on Windows.
- No Creator stream-key infinite loop.
- No Node/Jest heap exhaustion from `creator-business.spec.ts`.
- All B3-3, Host regression, Creator, legacy migration, and full-suite tests pass.
- Unified Backend, Website, Admin, and Creator build succeeds.

## Scope boundaries

No later B3 phase, WP07, WP08, or WP09 work was started.

## Acceptance correction: deterministic private-storage opacity test

During the final full-suite acceptance run, the existing B2A-1 private-storage test
`Opaque key generation conceals phone number` failed nondeterministically because it
asserted that a generated UUID must not contain the three-character hexadecimal
substring `555`. Random UUIDs can legitimately contain that substring even though no
phone-number data is used in the generated key.

The test now verifies the actual security contract deterministically:

- the complete normalized phone number is absent from the key;
- the key contains the expected four path segments;
- the owner-scope and filename segments are valid version-4 UUIDs;
- the expected private document category is retained.

No private-storage production code or behavior was changed by this correction.

## Final acceptance correction: lint and Redis test lifecycle

The user-provided final acceptance run completed successfully with:

- 44 of 44 Jest suites passing;
- 535 of 535 tests passing;
- no Creator-suite heap exhaustion;
- no Windows symbolic-link setup failure.

The remaining non-mutating ESLint run reported two Prettier-only layout errors in
`src/modules/hosts/host-level-config.service.ts`. Those exact expressions were
reformatted without changing runtime behavior.

The successful test run also exposed a `MaxListenersExceededWarning` from
`ioredis-mock`. The warning originated in `phase3b-redis.spec.ts`, which created a
new Redis mock and duplicated Pub/Sub client for every one of its tests. The suite
now creates one Nest testing module and one Redis mock for the suite, flushes Redis
between tests, and closes both the Nest module and Redis client after the suite.
This removes listener accumulation rather than suppressing the warning or raising
the EventEmitter limit.

Files changed by this final correction:

- `src/modules/hosts/host-level-config.service.ts`
- `src/common/events/phase3b-redis.spec.ts`
- `B3-3-IMPLEMENTATION-REPORT.md`

No production Redis, Host, storage, API, entity, migration, Admin, Creator, Website,
Socket.IO, BullMQ, or shared-contract behavior was changed.

Final local acceptance commands:

```powershell
npm ci
npm run build
npm test -- --runInBand
npx eslint "{src,apps,libs,test}/**/*.ts"
```

Expected result: all commands succeed, all 44 Jest suites and 535 tests pass, and
no `MaxListenersExceededWarning` is emitted by `phase3b-redis.spec.ts`.
