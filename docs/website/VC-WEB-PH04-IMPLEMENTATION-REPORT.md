# VC-WEB-PH04-R01 Implementation Report

## Protected parent

- Parent branch: `VoiceCloud-Backend-VC-WEB-PH03-R02`
- Exact parent commit: `ba268d03f9ca2ec2cd949c121731c0fd3a633923`
- PH02-R05 parent: `90aafda6d731e38c3e76df0ee0b199e935b73484`
- PH01-R01 parent: `87007f2b6779288393c71669e3c9b1e8cc82baf8`
- R11 remains the functional/backend authority ancestor.

## PH04 scope

PH04 implements the consumer Communities, Events, Messaging and Notifications slice while keeping live-room listening/RTC work in PH05/PH06.

### Communities

- Community discovery/listing via `GET /api/v1/clubs`.
- Community details via `GET /api/v1/clubs/:idOrHandle`.
- Public member directory via `GET /api/v1/clubs/:id/members`.
- Authenticated join via `POST /api/v1/clubs/:id/join`.
- Private-community invite-code input maps only to `JoinClubDto.inviteCode`.
- Authenticated leave via `POST /api/v1/clubs/:id/leave`.
- Current membership is determined by querying the member API with the signed-in user's unique username and confirming the exact user ID; no local membership flag is fabricated.
- Community-linked scheduled rooms/events use `GET /api/v1/scheduled-rooms?clubId=<id>`.

The R11 public live-room list deliberately excludes club-only rooms and its `QueryRoomDto` has no clubId filter. PH04 therefore does **not** fabricate a live community-room directory. It displays the backend-supported club-linked scheduled-room directory only. Live-room access remains later-phase work.

### Events

- Upcoming session list via `GET /api/v1/scheduled-rooms?status=SCHEDULED`.
- Scheduled session detail via `GET /api/v1/scheduled-rooms/:id`.
- Reminder/RSVP via `POST /api/v1/scheduled-rooms/:id/reminder` using only `enablePush` / `enableEmail` settings.
- The client disables the reminder action after successful registration during the current view to reduce accidental duplicate submissions against the backend's incrementing RSVP contract.

### Messaging

- Inbox via `GET /api/v1/chat/conversations`.
- Conversation detail via `GET /api/v1/chat/conversations/:id`.
- History via `GET /api/v1/chat/conversations/:id/messages`.
- Text send via `POST /api/v1/chat/conversations/:id/messages` with backend `type: text`.
- Read receipt via `POST /api/v1/chat/conversations/:id/read`.
- Direct-message creation/opening from a public profile via `POST /api/v1/chat/conversations` with `{ type: 'direct', recipientId }`.
- Direct participant display name/avatar is resolved through the existing authenticated profile endpoint because the R11 conversation member response contains user IDs rather than expanded user objects.

R11 has no canonical direct/group conversation socket-join event. The existing `join_room` socket message is voice-room presence authority and must not receive a conversation ID. PH04 therefore uses a bounded five-second HTTP refresh for an open direct/group conversation rather than misusing room-presence authority. Sending and read receipts remain immediate HTTP operations.

### Notifications

- List/filter authority: `GET /api/v1/notifications`.
- Unread badge: `GET /api/v1/notifications/unread-count`.
- Mark one read: `PATCH /api/v1/notifications/:id/read`.
- Mark all read: `PATCH /api/v1/notifications/read-all`.
- Delete: `DELETE /api/v1/notifications/:id`.
- User-scoped realtime `notification:new`, `notification:read`, and `notification:deleted` events invalidate notification queries.

## Design mapping

PH04 implements the functional/visual intent of these approved consumer designs/states:

- `VC-WEB-008` Communities
- `VC-WEB-009` Notifications
- `VC-WEB-013` Messages Inbox
- `VC-WEB-014` Direct Message Conversation
- `VC-WEB-015` Community Details
- `VC-WEB-016` Upcoming Sessions / Events
- `VC-WEB-017` Scheduled Session / Event Details
- `VC-WEB-057` Private Community Membership Access
- `VC-WEB-058` Community Members
- `VC-WEB-059` Community Events
- `VC-WEB-060` Community Room Directory (implemented only to the canonical scheduled-room authority available in R11)

## Branding preservation

PH04 adds no independent branding configuration. New components/styles use the website CSS variables installed by `website/src/branding/index.ts`, whose authority remains `shared/branding/index.ts`. Logo, Royal Sapphire colors, typography, radii, shadows and layout remain centrally managed.

## Preserved/deferred scope

Not pulled into PH04:

- Room detail/access/listening/reconnect — PH05.
- RTC speaker lifecycle and host controls — PH06.
- Wallet/gifts/store/VIP — PH07.
- Replay/activity/gamification — PH08.
- Settings/privacy/security/safety — PH09.

PH04-R01 did not modify backend authority. PH04-R02 makes a narrow backend correction in discovery/search/public-profile services to enforce consumer account visibility and fix the verified global-search SQL field mismatch. No database entity/schema/migration, Admin source, Creator source, or shared-branding source is modified.

## Acceptance requirement

Before Git freeze the Windows acceptance script must pass PH01-PH04 source checks, website TypeScript, website production build, all protected R11 source regressions and the full Nest + Website + Admin + Creator monolith build.


## R02 corrective pass

- Consumer discovery/search excludes backend-only ADMIN/SUPER_ADMIN and non-consumer account roles; USER and CREATOR remain discoverable.
- Recommendation surfaces exclude the currently authenticated user.
- Header search is editable in place and submits to `/search?q=...`.
- Route content uses a short reduced-motion-safe transition.
- Global search host lookup no longer references non-existent `host.displayName` / `host.category` columns; it searches real HostProfile and linked User fields.
- Public profile lookup returns not-found for backend-only roles.
