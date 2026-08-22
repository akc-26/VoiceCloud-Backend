# VC-WEB-PH06-R02 — Manual QA Checklist

Run the automated acceptance first:

```powershell
scripts\website\VC-WEB-PH06-ACCEPTANCE.cmd
```

Do not proceed with manual runtime acceptance if that runner reports a failed gate.

## A. New-laptop database/bootstrap

- [ ] **R02-QA-001 — Empty database preflight:** With PostgreSQL reachable but a fresh empty `voicecloud` database, run `node scripts/start-local-full-real.mjs`. Confirm it exits quickly with the `npm run database:bootstrap` instruction instead of nine TypeORM retries.
- [ ] **R02-QA-002 — Fresh schema bootstrap:** Run `npm run database:bootstrap` once against the empty database. Confirm it reports successful schema creation and migration baseline recording.
- [ ] **R02-QA-003 — Bootstrap safety:** Do not rerun bootstrap over a populated application database. If intentionally tested, confirm it refuses because application tables already exist.
- [ ] **R02-QA-004 — Real-mode startup:** Run `npm run build`, then `node scripts/start-local-full-real.mjs`. Confirm PostgreSQL and Redis are real, the application starts on port 3000, and Website/Admin/Creator open.

## B. Admin RTC provider authority

- [ ] **R02-QA-005 — Unconfigured Admin RTC:** Before an active RTC provider exists, open `/admin/rtc`. Confirm the page loads and reports not configured rather than defaulting to Agora/operational.
- [ ] **R02-QA-006 — LiveKit profile:** In `/admin/providers`, RTC, create a LiveKit profile with the real `serverUrl`, `apiKey`, and `apiSecret`. Save successfully.
- [ ] **R02-QA-007 — Live LiveKit test:** Run Test. Confirm success is reported only when the backend reaches the configured LiveKit RoomService with valid credentials.
- [ ] **R02-QA-008 — LiveKit activation:** Set the tested healthy LiveKit profile Active. Refresh and confirm it remains active.
- [ ] **R02-QA-009 — Unsupported provider guard:** Create an Agora or ZEGOCLOUD RTC profile if desired for inspection. Confirm it is visibly marked runtime adapter unavailable and cannot be made operational/active.
- [ ] **R02-QA-010 — Admin RTC real monitoring:** Open `/admin/rtc`. Confirm active provider is LiveKit and no `VIP-Voice-Lounge-01`, `Music-Jam-Session`, fake host names, invented RTT or unconditional “Recording Active” state appears.
- [ ] **R02-QA-011 — Recording capability:** Confirm Admin clearly indicates LiveKit Egress/output configuration is required rather than presenting recording as working.

## C. Creator Studio live RTC flow

- [ ] **R02-QA-012 — Start Broadcast preflight:** As a verified host/creator, create/select a room and Start Broadcast. With healthy LiveKit config, confirm transition to LIVE succeeds. With deliberately invalid LiveKit credentials, confirm it fails before false LIVE state is created.
- [ ] **R02-QA-013 — Host microphone:** Start Speaking and grant browser microphone permission. Confirm microphone publishes and listener browser receives host audio.
- [ ] **R02-QA-014 — Host mute/unmute:** Mute/unmute the creator microphone from Creator Studio and confirm the UI and listener audio state change correctly.
- [ ] **R02-QA-015 — Pause/Resume:** Pause while speaking. Confirm lifecycle transitions to PAUSED without the old socket-authentication alert. Resume and confirm broadcast and RTC interaction authority recover.
- [ ] **R02-QA-016 — Listener presence:** Join from a separate Website user/browser and confirm listener/participant state appears in Creator Studio.
- [ ] **R02-QA-017 — Raise hand:** Website listener raises hand while LIVE. Confirm Creator Studio receives the pending hand request.
- [ ] **R02-QA-018 — Approve speaker:** Approve the raised hand. Confirm the user receives speaker authority and can enable microphone.
- [ ] **R02-QA-019 — Host mute of speaker:** Host mutes the promoted speaker. Confirm Creator Studio shows muted state, user client reflects authoritative mute and user cannot silently republish until authority allows it.
- [ ] **R02-QA-020 — Remove/move speaker:** Move/remove the promoted speaker according to the available control. Confirm stage/participant state updates on both sides.
- [ ] **R02-QA-021 — End Broadcast:** End. Confirm Website user receives ended notification, RTC disconnects and listener returns to `/rooms`.

## D. Website LiveKit browser runtime

- [ ] **R02-QA-022 — Standard join:** User enters a LIVE room and receives audio without `Unable to load LiveKit browser SDK`.
- [ ] **R02-QA-023 — SDK primary origin:** With jsDelivr reachable, confirm normal join works.
- [ ] **R02-QA-024 — SDK fallback:** If practical in a test browser/network, block only `cdn.jsdelivr.net` while keeping `unpkg.com` reachable. Confirm the same join succeeds through the pinned fallback.
- [ ] **R02-QA-025 — SDK total failure visibility:** If both SDK origins are blocked intentionally, confirm the UI reports the attempted origins clearly rather than silently failing RTC join.
- [ ] **R02-QA-026 — Unsupported browser/device:** If the LiveKit SDK reports the browser unsupported, confirm VoiceCloud presents that as an actionable RTC error.

## E. Realtime room behavior preserved

- [ ] **R02-QA-027 — Emoji reaction:** While LIVE, Website user sends reactions and Creator/participants receive them.
- [ ] **R02-QA-028 — Chat bounds:** Website room chat remains internally scrollable and does not continuously grow the whole page vertically.
- [ ] **R02-QA-029 — Paused interaction guard:** While PAUSED, verify raise hand, chat/reaction/stage management actions that require LIVE state are rejected/disabled according to the room policy.
- [ ] **R02-QA-030 — Resume interaction guard:** After Resume, those LIVE-only interactions become available again.

## F. Webhook/security smoke test (when a reachable webhook endpoint is configured)

- [ ] **R02-QA-031 — Valid LiveKit webhook:** Deliver a genuine provider-signed event and confirm it is accepted/processed.
- [ ] **R02-QA-032 — Tampered webhook body:** Reuse/modify a webhook body without a matching signed SHA-256. Confirm it is rejected.

## Expected provider behavior

Only **LiveKit** is an operational production RTC provider in this revision. Agora and ZEGOCLOUD credentials must not be treated as a passing RTC runtime configuration until their server adapters are implemented. LiveKit recording is also not yet an operational feature without Egress/output integration.
