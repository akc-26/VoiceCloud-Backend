# VC-WEB-PH05-R08 Complete Acceptance Audit

## Purpose
R08 fixes the acceptance-runner defect exposed by the Windows R07 run. R07 used `spawnSync('npm.cmd', ..., { shell: false })`; on Windows that `.cmd` shim did not produce a child exit status, and the runner converted the null status into exit 1. That made all 17 gates appear to fail without actually executing their underlying commands.

## Runner correction
R08 removes post-install `npm.cmd` dispatch entirely. After `npm ci`, every source check, TypeScript compiler, Jest suite, Vite build, and Nest build is invoked through `process.execPath` and the real JavaScript entry point. The runner also performs a Node child-process dispatch probe before the gates begin and reports missing entry points or spawn failures explicitly as `[SPAWN-ERROR]` instead of misreporting them as application failures.

## Preserved source corrections
R08 preserves the R07 backend semantic correction: the stale 7-argument `RoomsService` construction in `rooms.service.wp08-02.spec.ts` includes the required `RoomAuthorityService` dependency, and `scripts/website/backend-constructor-contract-check.mjs` audits manual service construction across the backend spec/test tree.

R08 also preserves all PH05 live-room corrections from R05/R06: real LiveKit provider preflight, no false LIVE state, Creator room-card Start Speaking/Mute/Open Console controls, persistent Creator media session, realtime participant/chat/reaction updates, username/display-name presentation, listener/speaker counts, and same-room restart without duplicate Room entities.

## Comprehensive post-install gates
After dependency installation, R08 runs 23 visible gates:
1. PH01-PH05 source regressions.
2. Repository-wide backend constructor-contract audit.
3. Website, Creator, Admin, and Backend/shared TypeScript checks.
4. PH05 focused live-room runtime tests.
5. Complete WP08-02 room/realtime/security tests.
6. R11/Phase20 RTC authority tests.
7. Website, Creator Studio, and Admin builds.
8. Five independently visible R11 source-regression gates.
9. Nest backend build.
10. Full integrated Nest + Website + Admin + Creator monolith build.

The runner continues after post-install gate failures and prints one consolidated summary so later failures are not hidden by an earlier compiler/test/build failure.

## Validation performed before packaging
The exact R08 source tree passes PH01-PH05 source checks, the repository-wide constructor audit (172 constructors mapped, 0 mismatches), R11 Admin 7/7, Creator 12/12, Backend Authority 14/14, RTC/Security 27/27, and API parity (220 frontend calls mapped to 648 backend operations). The runner itself was executed in the sandbox without project `node_modules`: source gates ran and passed, while dependency-backed gates correctly reported explicit missing dependency entry points rather than false generic exit-1 results.

No database entity/schema/migration changes are introduced by R08.

## Acceptance rule
R08 is not frozen to Git until Windows acceptance ends with:

`[PASS] VC-WEB-PH05-R08 acceptance commands completed successfully.`
