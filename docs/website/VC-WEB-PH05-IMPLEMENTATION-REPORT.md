# VC-WEB-PH05-R11 Implementation Report

## Protected parent

- Parent branch: `VoiceCloud-Backend-VC-WEB-PH04-R03`
- Exact parent commit: `bd330734886cda3ebf2b1a268a6dfd63f7f6011a`
- Candidate: `VC-WEB-PH05-R11`
- PH05-R01 through PH05-R08 are superseded candidates and must not be Git-frozen.

## Why R05 exists

End-to-end Creator + consumer testing exposed a linked set of live-room defects that could not be treated as isolated UI issues:

1. A room could reach LIVE while the configured LiveKit project credentials were invalid or incomplete.
2. Admin Provider Config and the runtime RTC adapter could read different/stale LiveKit fields after credential edits.
3. Creator Start Broadcast redirected immediately to the console instead of leaving room-management controls available.
4. Host media belonged to the console component, so leaving/reopening the console could tear down microphone/media state.
5. Room-management observation could join presence for rooms simply to receive updates.
6. Chat/reaction events could expose raw UUIDs or wait for polling/refetch instead of rendering immediately.
7. Previous acceptance did not directly type-check Admin and therefore could hide MUI v9 compatibility failures until later.

R05 corrects the entire authority chain and strengthens acceptance so these classes are checked together.

## LiveKit configuration authority

A single resolver at `src/modules/rtc/livekit-config.util.ts` normalizes the supported legacy/current field aliases while standardizing the UI on:

```json
{
  "serverUrl": "wss://YOUR_PROJECT.livekit.cloud",
  "apiKey": "YOUR_LIVEKIT_API_KEY",
  "apiSecret": "YOUR_LIVEKIT_API_SECRET",
  "tokenExpiration": 3600
}
```

The Project URL, API Key and API Secret must belong to the same LiveKit project.

### Admin Test

The Admin provider Test action now performs a real authenticated LiveKit `RoomService/ListRooms` request. A structurally non-empty configuration is not enough.

- missing URL/key/secret -> FAIL
- placeholder/default values -> FAIL
- unreachable endpoint -> FAIL
- rejected credentials -> FAIL
- authenticated RoomService request -> HEALTHY

Changing provider config, rotating secrets or rolling back config resets provider health to `not_tested`. An old healthy result cannot survive credential changes.

### Runtime synchronization

When an active RTC provider changes, active-provider credentials are synchronized into the existing `rtc_configs` compatibility record. The LiveKit adapter itself uses the decrypted active provider configuration as its primary authority, preventing URL from one source and key/secret from another.

LiveKit runtime also requires the active LiveKit provider health to be `healthy`.

### Broadcast preflight

For Host/Co-host/Moderator token generation, LiveKit performs a real authenticated signaling/control-plane probe before returning the privileged token. Therefore Creator `Start Broadcast` cannot move an offline/ended room to LIVE merely because a JWT can be generated locally. Invalid LiveKit credentials fail before room lifecycle start.

Ordinary listener token generation does not perform this extra control-plane probe on every listener join.

## Creator room-management workflow

`/creator/rooms` now remains the primary room-management surface.

Starting a room:

- performs the real LiveKit preflight;
- starts the same room entity;
- ensures the authoritative RTC voice session;
- keeps the creator on the room-management page;
- exposes `Start Speaking` / `Mute Mic` directly on the LIVE/PAUSED room card;
- exposes persistent `Open Console` navigation for LIVE/PAUSED rooms.

Pause, Resume and End remain on the card. End explicitly disconnects the creator media session before stopping the RTC session and ending the same room entity.

The room-management page listens passively for global authoritative RTC events and retains bounded room polling as recovery. It does not join room presence merely to observe room status/count changes.

## Persistent Creator media session

`creator/src/services/creator-live-media.service.ts` owns the Creator browser media session outside individual pages.

It provides:

- connect to backend-authorized LiveKit room;
- Start Speaking;
- Mute microphone;
- browser autoplay recovery;
- persistent snapshot through `useSyncExternalStore`;
- explicit disconnect on End Broadcast/log-out/room switch.

Navigating between `/creator/rooms` and `/creator/rooms/:roomId/live` no longer implicitly destroys a publishing microphone session.

## Creator live console

The console remains available for LIVE and PAUSED rooms and contains:

- broadcast lifecycle controls;
- host microphone/audio state;
- listeners / present / on-stage / raised-hands counters;
- authoritative participant and speaker state;
- approve/reject hand requests;
- invite listener to stage;
- mute/unmute/remove speaker;
- room chat;
- realtime reactions;
- persistent Open Console route from the room card.

The console joins realtime presence only for the room that is actually open.

## Realtime data and identity

Room chat responses are enriched server-side with a safe sender summary:

- `username`
- `displayName`
- `avatarUrl`

Room chat message/edit/delete/reaction events are emitted both to the canonical conversation channel and, for ROOM conversations, the live room channel.

Creator and consumer live-room pages insert new chat messages into their query cache immediately and use refetch only as recovery for mutation/update events. Listener/stage/presence events invalidate authoritative state immediately.

Transient live reactions include a safe username from authenticated realtime identity. Creator reaction presentation no longer requires a raw UUID.

Consumer/Creator/Admin messaging surfaces use display name / username as the visible identity. Raw UUIDs are not used as the human-facing fallback for live-room chat.

## Listener-count and lifecycle protections retained

R05 preserves the prior PH05 corrections:

- RTC join/leave/rejoin synchronize `Room.listenerCount` and `Room.speakerCount`;
- only currently-present speaker participants are subtracted from listeners;
- host is counted as stage/speaker rather than listener when present;
- ENDED -> LIVE restarts the same room ID and never clones a duplicate room;
- reconnect re-derives server-authoritative role/token;
- chat remains limited to current authorized room participants/host;
- speaker publication cannot be self-asserted by a listener.

## Cross-app TypeScript/build acceptance

R05 acceptance now runs direct TypeScript checks for all affected application layers before any build is accepted:

1. Website TypeScript
2. Creator TypeScript
3. Admin TypeScript
4. Backend/shared TypeScript
5. focused live-room runtime Jest regressions
6. Website build
7. Creator build
8. Admin build
9. R11 Admin/Creator/Backend/RTC/API-parity source regression
10. full Nest + Website + Admin + Creator monolith build

This prevents the previous one-gate-at-a-time failure pattern.

## Database impact

No database entity/schema/migration change is introduced by PH05-R05.
