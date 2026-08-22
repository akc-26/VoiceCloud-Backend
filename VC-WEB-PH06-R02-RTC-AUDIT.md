# VC-WEB-PH06-R02 — Complete RTC Runtime Audit and Corrective Implementation

## Baseline

VC-WEB-PH06-R02 is a corrective revision of VC-WEB-PH06-R01 and therefore includes the R14 LiveKit browser/CSP correction and all PH01-PH06 implementation already present in that package.

The purpose of R02 is to make the RTC configuration and runtime contract truthful and consistent across Admin, Creator Studio, Website and backend runtime.

## Startup finding from the new laptop

The attached new-laptop log is not an RTC failure. The monolith build completed, Redis connected, and PostgreSQL was reachable. Startup then failed because the `voicecloud` PostgreSQL database did not contain the VoiceCloud application schema.

For a completely new/empty local database, initialize the schema once:

```powershell
npm run database:bootstrap
```

The bootstrap command deliberately refuses to run if application tables already exist. If this database is supposed to be an existing deployment, restore that database instead and use normal migrations.

After bootstrap:

```powershell
npm run migration:status
npm run build
node scripts/start-local-full-real.mjs
```

R02 also changes `start-local-full-real.mjs` so it performs a fast PostgreSQL schema preflight before Nest starts. A missing schema now produces one deterministic message instead of waiting through repeated TypeORM retries.

## RTC support matrix

| Provider / capability | R02 operational status | Notes |
| --- | --- | --- |
| LiveKit token generation | Operational | Real signed server-authoritative tokens |
| LiveKit connectivity test | Operational | Admin test performs real RoomService request |
| LiveKit browser listen/publish | Operational | Website and Creator Studio use shared browser RTC client |
| LiveKit participant listing | Operational | Real RoomService participant state |
| LiveKit server mute | Operational | Real MutePublishedTrack request when an audio publication exists |
| LiveKit participant removal | Operational | Real RemoveParticipant request |
| LiveKit room state | Operational | Real room/participant provider calls |
| LiveKit webhook verification | Operational | R02 verifies signed JWT and SHA-256 of exact raw body |
| LiveKit recording | Not operational yet | Requires authoritative LiveKit Egress/output adapter; source fails closed rather than fabricating recording success |
| Agora runtime | Not operational | Server adapter is not implemented; Admin may store credentials for future work but cannot test/activate it as healthy |
| ZEGOCLOUD runtime | Not operational | Server adapter is not implemented; Admin may store credentials for future work but cannot test/activate it as healthy |
| Development mock RTC | Development-only | Remains explicitly gated and must not become production authority |

## Defects found and corrected

### 1. Admin could advertise unsupported RTC engines as operational

Before R02, structural Agora/ZEGOCLOUD credentials could produce a successful Admin connection-test result even though all runtime operations deliberately threw `ServiceUnavailableException`. This made it possible for Admin configuration to put Creator Studio and Website into a guaranteed failure state.

R02 changes this contract:

- Agora and ZEGOCLOUD connection tests no longer report operational success.
- Unsupported RTC profiles cannot be set active.
- LiveKit is the default operational RTC profile.
- The legacy RTC configuration API cannot bypass this restriction by writing Agora/ZEGOCLOUD directly.
- Admin makes the lack of runtime adapters visible rather than presenting the providers as interchangeable engines.

### 2. Admin RTC monitoring contained fabricated state

Before R02, the RTC page contained default Agora/operational state, hard-coded sample live channels and a recording-active presentation independent of server truth.

R02 removes those runtime examples and consumes only backend-derived state. The page also loads correctly before any RTC provider has been configured.

### 3. Browser LiveKit loading was too fragile

R14 allowed the pinned jsDelivr origin in production CSP, but the shared browser RTC loader still had one external origin. Local real-mode startup runs with `NODE_ENV=development`, so a local CDN failure could still appear even when production CSP was not involved.

R02 retains the pinned LiveKit 2.22.0 browser runtime and adds:

- primary pinned jsDelivr URL;
- pinned unpkg fallback URL;
- optional runtime URL override via `window.__VOICECLOUD_LIVEKIT_CLIENT_URL__`;
- browser capability validation through the loaded SDK;
- an error that identifies all attempted SDK URLs.

The application still uses an externally loaded browser SDK in this revision; it is not yet bundled into the Vite dependency graph. This is intentionally documented rather than represented as a self-contained SDK bundle.

### 4. LiveKit webhook verification did not validate the raw body hash

R02 enables Nest raw-body capture and passes the exact raw request bytes into the provider webhook verifier. The verifier now validates the signed SHA-256 body claim in addition to token signature/issuer/expiry checks.

### 5. Recording status was misleading

The backend already refused to fabricate LiveKit recording success because Egress/output handling is not implemented. Admin, however, could visually imply recording was active.

R02 reports recording capability honestly as `egress_adapter_required` for LiveKit and does not show fabricated recording state.

### 6. Real-mode startup waited through repeated schema errors

`start-local-full-real.mjs` now connects to PostgreSQL first and validates the VoiceCloud `users` table before booting Nest. A new/empty database receives the exact `npm run database:bootstrap` instruction immediately. Existing deployments are told to restore/use migrations instead of bootstrapping over data.

## Canonical RTC flow after R02

### Admin

1. Sign in as Admin/Super Admin.
2. Open `/admin/providers` and select RTC.
3. Create/edit the LiveKit provider configuration with:
   - `serverUrl` — normally `wss://<project>.livekit.cloud` or the self-hosted WSS endpoint;
   - `apiKey`;
   - `apiSecret`.
4. Save.
5. Run **Test**. The test must perform live connectivity, not only format validation.
6. Set the healthy LiveKit profile **Active**.
7. Open `/admin/rtc`.
8. Confirm active provider = LiveKit and monitor only real server-derived state.

### Creator Studio

1. Creator must have valid host authority.
2. Create/select a room.
3. Start Broadcast.
4. Backend performs authoritative provider preflight before transitioning the room LIVE.
5. Creator joins the LiveKit room using a server-derived host role/token.
6. Start Speaking publishes the creator microphone.
7. Pause/Resume controls the broadcast lifecycle without fabricating a new room.
8. Host can approve/reject raised hands, invite speakers, server-mute/unmute supported participants and remove/move participants according to backend authority.
9. End Broadcast terminates the lifecycle and listeners receive the ended event.

### Website listener/speaker

1. User joins a LIVE room through canonical room access + RTC join authority.
2. Server derives role and creates LiveKit token.
3. Shared browser loader loads the pinned LiveKit SDK from an allowed/fallback origin.
4. Listener subscribes to published audio.
5. If promoted/approved to speaker, role authority is refreshed and microphone publishing becomes available.
6. Host mute state is authoritative and reflected by the speaker client.
7. Pause disables room interactions according to the existing live-only interaction policy.
8. End causes RTC cleanup, user notification and listener navigation back to `/rooms`.

## Recording limitation

Do not use recording as a pass/fail criterion for the current RTC runtime unless LiveKit Egress and the VoiceCloud output adapter are separately implemented/configured. The application now exposes this as an unavailable capability instead of claiming success.

## Acceptance

Run on the workstation with locked dependencies available:

```powershell
scripts\website\VC-WEB-PH06-ACCEPTANCE.cmd
```

Required final line:

```text
[PASS] VC-WEB-PH06-R02 acceptance commands completed successfully.
```

This runner includes all protected PH01-PH06/R12/R13/R14 gates, the new PH06-R02 RTC gate, TypeScript gates, targeted RTC tests, WP08 room/realtime/security tests and all application builds.
