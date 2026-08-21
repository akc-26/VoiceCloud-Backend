# VC-WEB-PH05-R07 Complete Acceptance Audit

## Purpose
R07 closes the acceptance-process weakness exposed when the Windows R06 backend TypeScript gate found a stale manual `RoomsService` construction in `rooms.service.wp08-02.spec.ts` after `RoomAuthorityService` became a required constructor dependency.

## Corrected defect class
The specific stale 7-argument `RoomsService` test construction is corrected with an explicit `RoomAuthorityService` mock. R07 does not stop at that line: `scripts/website/backend-constructor-contract-check.mjs` maps backend class constructors and validates manual service constructions across spec/test files so constructor drift is caught as a class before semantic TypeScript/build acceptance.

## Expanded runtime regression
R07 acceptance runs:
1. PH01-PH05 source regressions.
2. Repository-wide backend constructor-contract audit.
3. Website, Creator, Admin, and Backend/shared TypeScript checks.
4. PH05 focused runtime tests, including LiveKit runtime authority, Admin LiveKit provider testing, room lifecycle, RoomsService WP08 lifecycle, and protected realtime access.
5. Complete existing WP08-02 room/realtime/security test suite.
6. R11 RTC role-authority and Phase20 RTC tests.
7. Website, Creator, and Admin builds.
8. Protected R11 source regression.
9. Full Nest + Website + Admin + Creator monolith build.

## LiveKit Admin regression coverage
`provider-test-connection.livekit.spec.ts` verifies fail-closed behavior when URL/key/secret is incomplete, real RoomService probing for a configured project, and unhealthy status when LiveKit rejects credentials.

## Authority and scope preservation
All PH05-R05/R06 corrections remain intact: real LiveKit preflight, no false LIVE state, Creator room-card Start Speaking/Mute/Open Console controls, persistent Creator media session, realtime participant/chat/reaction updates, username/display-name presentation, listener/speaker counts, and same-room restart without duplicate Room entities.

No database entity/schema/migration changes are introduced by R07.

## Acceptance rule
R07 is not frozen to Git until the Windows acceptance script ends with:

`[PASS] VC-WEB-PH05-R07 acceptance commands completed successfully.`

## Non-fail-fast workstation diagnosis
R07 changes the Windows workflow so `npm ci` remains the only fail-fast prerequisite. Once dependencies are present, `web-ph05-comprehensive-acceptance.mjs` runs every post-install acceptance gate even if an earlier one fails. The final summary reports all failed gates together. This prevents a Backend TypeScript error from hiding later Jest/build failures until another package iteration.
