# VC-WEB-PH05-R06 Complete Acceptance Audit

## Scope

This audit tracks the comprehensive correction of the live audio room lifecycle across Admin Provider Config, RTC backend, Creator Studio and consumer website.

## Blocking user findings covered

| Finding | R06 authority / correction |
|---|---|
| Live console: invalid API key | Active LiveKit provider config is normalized and must pass a real RoomService connectivity test; privileged token issuance probes the same authority. |
| Start Speaking says real RTC not connected | Creator persistent media session uses the same backend-authoritative tested LiveKit configuration and server-issued role/token. |
| Start Broadcast redirects immediately | Removed. Start remains on room-management page. |
| No way back into console | LIVE/PAUSED cards expose persistent Open Console. |
| Need Start Speaking on card | LIVE/PAUSED room cards expose Start Speaking / Mute Mic. |
| Joins/chat/reactions must update instantly | Realtime room/presence/stage events invalidate immediately; chat messages insert directly into cache; room chat events are emitted to the live-room channel. |
| Chat shows UUID | Backend returns sender summary and UI uses display name/username with a non-ID fallback. |
| Admin LiveKit Test says fields missing / does not prove connectivity | UI requires serverUrl/apiKey/apiSecret; backend test performs authenticated `RoomService/ListRooms`. |
| Stale credentials after editing active provider | Active RTC edits/secret rotation/rollback synchronize runtime RTC config; provider health resets to not_tested. |
| False LIVE with invalid LiveKit | Host privileged token preflight authenticates to LiveKit before room start. |
| Managing room list changes presence | Room list uses passive realtime observation and never joins room presence just to monitor it. |

## Durable regression checks

`web-ph05-source-check.mjs` validates:

- one LiveKit field resolver;
- real Admin LiveKit connectivity test;
- provider health reset/synchronization;
- privileged LiveKit preflight;
- persistent Creator media service;
- no auto-redirect after Start Broadcast;
- Start Speaking/Mute + Open Console card actions;
- passive room-management realtime observation;
- room/chat events and safe sender identity;
- no UUID fallback in live-room chat;
- MUI v9 direct-system-prop compatibility across Creator + Admin;
- removed TextField `inputProps` API across Creator + Admin;
- existing listener-count and duplicate-room protections.

## Runtime-focused automated tests

R06 adds `src/modules/rtc/livekit-provider.runtime.spec.ts` and runs it with existing room lifecycle/realtime authority tests. It verifies:

- healthy active provider URL/key/secret are used together;
- a real LiveKit `ListRooms` probe occurs before Host token issue;
- untested LiveKit provider is rejected;
- ordinary listener token generation does not run the privileged connectivity probe;
- existing in-place ENDED -> LIVE room lifecycle remains protected;
- existing room/realtime access authority remains protected.

## Delivery rule

R06 must not be called accepted until the Windows acceptance script ends with:

`[PASS] VC-WEB-PH05-R06 acceptance commands completed successfully.`

After automated acceptance, real two-browser LiveKit media QA is still mandatory because an external LiveKit project/network/browser microphone cannot be proven by static source analysis alone.


## R06 workstation closure

- Windows R05 acceptance reached the Admin TypeScript gate and exposed two remaining MUI TextField `InputLabelProps` errors in `admin/src/pages/ReferralPage.tsx`.
- Both datetime-local fields now use MUI v9 `slotProps.inputLabel`.
- The PH05 source checker now rejects legacy `InputLabelProps` and `inputProps` across the complete Admin and Creator TSX trees.
- A broader scan found no remaining flagged legacy TextField APIs, direct Stack/Typography/Box system-prop patterns, or old Grid item breakpoint APIs in Website/Admin/Creator.
