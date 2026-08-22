# VC-WEB-PH06-R01 Implementation Report

## Baseline and scope

VC-WEB-PH06-R01 is implemented directly on top of VC-WEB-PH05-R14 as instructed. R14 is intentionally carried forward even though it has not yet been separately workstation-accepted; the R14 and PH06 gates are therefore included in the PH06 comprehensive acceptance command so they can be verified together.

The locked WEB-PH06 design-map scope is screens 031-040:

- 031 My Rooms
- 032 Create Room
- 033 Schedule Room
- 034 Room Access / Privacy Settings
- 035 Invite People To Room
- 036 Live Room Speaker Mode
- 037 Live Room Host Controls
- 038 Room Participants
- 039 Live Room Polls
- 040 Live Room Quiz

## Implemented website host surfaces

### My Rooms

`/host/rooms` now loads the authenticated host's canonical `/rooms/mine` inventory. Approved-host status is verified through `/hosts/profile`. Each room exposes lifecycle controls appropriate to its server status: Start Broadcast, Pause, Resume, Open Host Room, End, Settings, and Delete when offline.

Broadcast start is not a UI-only state transition. It first requests an authoritative RTC token, requires an active LiveKit provider/server URL, starts the room lifecycle, and ensures a real RTC voice session. If RTC session startup fails after lifecycle start, the room is ended again rather than being left falsely LIVE.

### Create Room

`/host/rooms/create` creates canonical rooms through `POST /rooms`, including access policy fields supported by the backend. No local placeholder room is generated.

### Schedule Room

`/host/schedule` supports create, edit date/time, cancel, linked-room creation, Start Broadcast, Pause, Resume, Open Host Room, and End.

The creator enters date/time in the browser's local timezone. The website converts that local time to an ISO UTC instant and sends the browser IANA timezone in `timeZone`. Rendering uses the JavaScript viewer locale/timezone so the same scheduled instant is shown in each viewer's local timezone.

Starting a scheduled item reuses a room already linked by `scheduledRoomId`; if none exists, a canonical room is created and linked before broadcast start. This avoids creating a new duplicate room on each start.

### Access / Privacy

`/host/rooms/:roomId/settings` edits server-authoritative access rules for the room owner:

- Invite-only
- Locked
- Subscribers-only
- Verified-users-only
- Ticket required / premium
- Ticket price

The page verifies room ownership before exposing mutation controls. Enforcement remains in backend room/realtime/RTC authority rather than depending on disabled frontend controls.

## Live host console

The existing `/rooms/:roomId/live` experience is extended rather than duplicated. The backend-derived RTC role continues to determine host/speaker/listener behavior.

For the room owner/authoritative host, PH06 adds:

- Pause / Resume / End lifecycle controls
- Raised-hand queue with Approve and Reject
- Speaker-stage list with mute/unmute state
- Move speaker back to audience
- Invite currently present listeners to the stage
- Search registered users and grant a room-level invitation through the authenticated realtime `room:invite_participant` event
- Poll management
- Quiz management

The existing microphone publication flow remains the speaking authority. Hosts and promoted speakers receive the existing Start Speaking / Mute Microphone control, and authoritative host mute remains enforced on the speaker client.

## Participants and invitations

Stage data comes from `/rtc/rooms/:roomId/stage`; participant presence continues to use the PH05 canonical RTC/realtime flow. Room-level audience invitations are not stored as frontend-only flags: the socket invitation event is handled by the existing realtime room-state service and is part of backend access authority for restricted rooms.

User search results for invitation preserve the website's consumer identity policy by allowing only USER/CREATOR identities; backend administration identities are not presented as invite candidates.

## Polls

PH06 uses the existing canonical poll APIs:

- `POST /polls`
- `GET /polls/rooms/:roomId`
- `POST /polls/:pollId/vote`
- `POST /polls/:pollId/stop`

Hosts can create and stop polls; listeners can vote while the broadcast is LIVE. Realtime poll events invalidate the room poll query for both sides. UI interactions are disabled while the broadcast is paused.

## Quiz

PH06 uses the existing canonical quiz APIs:

- `POST /quizzes`
- `POST /quizzes/:quizId/start`
- `GET /quizzes/rooms/:roomId/active`
- `POST /quizzes/:quizId/submit`
- `POST /quizzes/:quizId/stop`

The initial website workflow creates a one-round quiz with two answer choices, immediately starts it, allows listeners to submit the active question, and lets the host end it. Realtime quiz lifecycle events invalidate the active quiz view. The API model still supports later expansion to multiple rounds without introducing a parallel data model.

## Preserved prior-phase behavior

PH06 deliberately preserves the existing PH05/R12/R13/R14 behavior, including:

- Listener room join/rejoin/leave and server-derived RTC role
- LiveKit audio subscription and authoritative microphone publication
- Pause restrictions for chat/reactions/hand-raise/stage mutations
- Host mute propagation to invited speakers
- Bounded room chat scrolling
- Reaction reconnect/ACK handling
- Immediate paused/ended realtime handling
- Listener ended-room redirect to `/rooms` with notification
- Host ended-room cleanup followed by `/host/rooms`
- R14 production CSP allowance for the pinned LiveKit browser SDK URL
- Existing Creator Studio and Admin authorities

## Automated verification included

`web-ph06-source-check.mjs` adds dedicated PH06 protection for screens 031-040 and their backend contracts. `VC-WEB-PH06-ACCEPTANCE.cmd` runs the preserved PH01-PH05 checks, R12/R13/R14 corrective regressions, PH06 source regression, TypeScript gates, RTC/runtime suites, website/Creator/Admin builds, R11 authority/API checks, Nest build, and full monolith build.

In the assistant execution environment, source-only gates and syntax/transpile verification can be run, but the locked npm dependency tree is not present. The npm-backed TypeScript/Jest/Vite/Nest acceptance must therefore be executed on the workstation with the supplied acceptance command before Git freeze.
