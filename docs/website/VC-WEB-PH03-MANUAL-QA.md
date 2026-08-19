# VC-WEB-PH03-R02 Manual QA

Run the full local application with real local PostgreSQL/Redis after the acceptance build and use `http://localhost:3000` as the integrated test origin.

## PH03-QA-001 Home
- Open `/`.
- Confirm Royal Sapphire branding and centralized logo remain intact.
- Confirm Live Now content comes from backend data; an empty state appears when no rooms are live.
- Confirm Explore Rooms and Discover VoiceCloud navigation works.

## PH03-QA-002 Explore
- Open `/explore`.
- Confirm featured rooms, recommended people, communities and scheduled sessions load from backend APIs.
- Confirm empty/error states are readable if any API has no data or is unavailable.

## PH03-QA-003 Live Rooms
- Open `/rooms`.
- Confirm live rooms render with server values for title/category/listener/speaker counts and access indicator.
- Change category filters and confirm a new request/result set is used.
- Confirm room action routes to room details placeholder; full room join is not claimed in PH03.

## PH03-QA-004 People
- Open `/people`.
- Confirm trending and suggested profiles use backend user records.
- Open a public profile.

## PH03-QA-005 Search
- Open `/search`.
- Search for a known room/person/community.
- Confirm results are grouped from canonical search, clubs and scheduled-room APIs.
- Confirm no fabricated community/event result is displayed when the backend returns none.

## PH03-QA-006 Public profile
- Open `/profile/<known-username>`.
- Confirm public profile fields come from the public profile API.
- When authenticated, confirm follow state is resolved through the authenticated profile endpoint.
- Follow/unfollow a non-self user and confirm the relationship updates.

## PH03-QA-007 My Profile
- Sign in and open `/me`.
- Confirm profile, counts, interests and completion percentage come from `/users/profile/me`.
- Confirm Followers and Following counts navigate to the respective pages.
- Confirm Edit Profile is visibly deferred/disabled in PH03 rather than pretending to save.

## PH03-QA-008 Followers / Following
- Open `/followers` and `/following` while authenticated.
- Search each list.
- Confirm Following allows unfollow and refreshes data.

## PH03-QA-009 Friends
- Open `/friends` while authenticated.
- Confirm accepted friends, incoming requests and suggestions load.
- Accept/reject an incoming request if one exists.
- Send a request to a suggested user and confirm the page refreshes.

## PH03-QA-010 Authorization
- Sign out and attempt `/me`, `/followers`, `/following`, `/friends`.
- Confirm RequireAuth redirects to sign-in.
- Confirm public `/explore`, `/rooms`, `/people`, `/search`, and `/profile/:username` remain accessible.

## PH03-QA-011 Branding regression
- Check Home, Explore, Rooms, Search, People and profile pages.
- Confirm logo/colors/typography are consistent with centralized Royal Sapphire branding and no page-specific alternate brand is introduced.
