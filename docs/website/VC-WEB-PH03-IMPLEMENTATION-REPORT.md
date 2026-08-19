# VC-WEB-PH03-R02 Implementation Report

## Protected parent

- Parent phase: `VoiceCloud-Backend-VC-WEB-PH02-R05`
- Exact parent commit: `90aafda6d731e38c3e76df0ee0b199e935b73484`
- PH01 parent remains `87007f2b6779288393c71669e3c9b1e8cc82baf8`.
- R11 functional authority remains the backend ancestor.

## Phase scope

PH03 implements the consumer discovery/profile/social slice:

- Home page live-room and trending-person data integration.
- Explore / discovery page.
- Live Rooms directory with category filtering.
- People discovery.
- Global Search results.
- Public profile by username.
- Authenticated self profile.
- Follow / unfollow.
- Followers and Following lists.
- Friends list, incoming requests, suggested friends, request accept/reject/send.

## Canonical backend mappings

| Website capability | Backend authority |
|---|---|
| Home / live rooms | `GET /api/v1/discovery/rooms/live` |
| Trending rooms | `GET /api/v1/discovery/rooms/trending` |
| Trending / suggested people | `GET /api/v1/discovery/users/trending`, `GET /api/v1/discovery/users/suggested` |
| Search | `GET /api/v1/search` |
| Search communities | `GET /api/v1/clubs?search=` |
| Search scheduled sessions | `GET /api/v1/scheduled-rooms?search=` |
| Public profile | `GET /api/v1/users/public/:username` |
| Authenticated profile detail | `GET /api/v1/users/:userId/profile` |
| Self profile | `GET /api/v1/users/profile/me` |
| Follow / unfollow | `POST/DELETE /api/v1/users/:userId/follow` |
| Followers / Following | `GET /api/v1/users/followers`, `GET /api/v1/users/following` |
| Friends | `GET /api/v1/users/friends` |
| Pending friend requests | `GET /api/v1/users/friends/requests/pending` |
| Suggested friends | `GET /api/v1/users/friends/suggested` |
| Send / accept / reject request | canonical `/api/v1/users/friends/request...` operations |

## Design mapping

PH03 directly implements the functional/visual intent of:

- `VC-WEB-001` Home
- `VC-WEB-002` Discover / Explore
- `VC-WEB-003` Live Rooms
- `VC-WEB-006` Public User Profile
- `VC-WEB-007` My Profile
- `VC-WEB-010` Search Results
- `VC-WEB-012` Following
- `VC-WEB-021` Followers
- `VC-WEB-022` People / Creators Discovery
- `VC-WEB-023` Friends

Room detail/listening, communities, event detail, messaging and profile editing are intentionally not pulled forward from their later locked phases.

## Branding preservation

All PH03 styles consume the existing website CSS variables installed by `website/src/branding/index.ts`, whose only authority is `shared/branding/index.ts`. PH03 introduces no independent hex/RGBA brand values in its new style block or page components.

## Runtime-data policy

PH03 removes the PH01 hard-coded demo live-room array from Home. Room titles, people, counts, profile data and social relationships are supplied by backend APIs. Local generated imagery is used only as visual fallback artwork when a backend record has no image URL; it does not fabricate product state.

## Deliberately deferred

- Joining/listening and access enforcement inside a live room — PH05.
- Community detail/membership implementation — PH04.
- Scheduled event detail/reminders — PH04.
- Direct messages — PH04.
- Host/creator room creation and RTC speaker lifecycle — PH06.
- Profile editing/upload — later settings/profile phase.

## Acceptance

The workstation acceptance script must pass PH01, PH02 and PH03 source checks, website TypeScript, website build, R11 preservation checks and the full Nest + Website + Admin + Creator monolith build before Git freeze.


## R02 workstation correction

- Corrected the TanStack Query follow/unfollow mutation result contract discovered by the workstation TypeScript gate.
- `profileApi.follow()` and `profileApi.unfollow()` now share `FollowMutationResult { isFollowing: boolean }` instead of incompatible literal-only `{ isFollowing: true }` / `{ isFollowing: false }` types.
- `ProfilePage` explicitly types the mutation with the shared result contract.
- Added a durable PH03 source regression check that rejects the previous literal-only typing pattern.
- No backend, Admin, Creator, shared-branding, database, route-scope, or PH03 feature-scope changes were made for R02.
