# VC-WEB-PH04-R01 Manual QA

Run the full local application and test through `http://localhost:3000` after the automated acceptance gate passes.

## Communities

- [ ] `/communities` loads backend communities without fabricated demo cards.
- [ ] Search filters through `GET /clubs?search=`.
- [ ] Opening a community loads `/communities/:handle`.
- [ ] Public community shows member/host/upcoming counts from backend data.
- [ ] `/communities/:handle/members` loads backend members and profile links.
- [ ] Signed-in non-member can join a public community.
- [ ] Private community requires invite code UI before Join is submitted.
- [ ] Existing member is recognized by exact user ID after member lookup.
- [ ] Non-owner member can leave; owner receives backend refusal rather than a false local success.
- [ ] `/communities/:handle/rooms` shows only club-linked scheduled sessions returned by `/scheduled-rooms?clubId=`.
- [ ] UI does not claim unsupported club-only live-room discovery.

## Events

- [ ] `/events` displays scheduled backend sessions.
- [ ] Search uses scheduled-room search query.
- [ ] `/events/:id` displays backend title, description, date/time, duration and RSVP count.
- [ ] Signed-out Reminder action redirects to sign-in.
- [ ] Signed-in Reminder calls backend and shows returned RSVP count.
- [ ] Successful reminder button cannot be repeatedly clicked in the same page view.

## Messaging

- [ ] `/messages` requires authentication.
- [ ] Inbox loads authenticated conversations and unread counts.
- [ ] Direct conversation resolves the other participant's profile where possible.
- [ ] `/messages/:conversationId` loads backend history.
- [ ] Sending a text message creates a real backend message and refreshes the thread.
- [ ] Opening a conversation marks the newest message as read.
- [ ] Direct/group conversation refresh works without sending the voice-room `join_room` event with a conversation ID.
- [ ] On another user's `/profile/:username`, Message creates/opens the canonical direct conversation and navigates to it.

## Notifications

- [ ] Header bell shows backend unread count for an authenticated user.
- [ ] `/notifications` requires authentication.
- [ ] Notification list loads newest first.
- [ ] Mark one read updates the card and unread badge.
- [ ] Mark all read updates the list and unread badge.
- [ ] Delete removes the notification after backend confirmation.
- [ ] New/read/deleted realtime notification events refresh the list when available.
- [ ] Notification navigation only uses supported IDs present in the backend `data` payload.

## Regression / presentation

- [ ] PH01 shell, branding and responsive navigation remain intact.
- [ ] PH02 sign-in/register/phone OTP/guest/onboarding remain operational.
- [ ] PH03 Home/Explore/Rooms/People/Search/Profile/Friends remain operational.
- [ ] New PH04 pages use the centralized VoiceCloud logo and Royal Sapphire theme.
- [ ] Admin `/admin` and Creator `/creator` still load from the full application.


## R02 corrective pass

- Consumer discovery/search excludes backend-only ADMIN/SUPER_ADMIN and non-consumer account roles; USER and CREATOR remain discoverable.
- Recommendation surfaces exclude the currently authenticated user.
- Header search is editable in place and submits to `/search?q=...`.
- Route content uses a short reduced-motion-safe transition.
- Global search host lookup no longer references non-existent `host.displayName` / `host.category` columns; it searches real HostProfile and linked User fields.
- Public profile lookup returns not-found for backend-only roles.

## R03 Consumer Identity Visibility Regression

- Sign in as a normal USER and search for the exact signed-in display name: the signed-in account must not appear under People.
- Search for the exact signed-in username: the signed-in account must not appear under People.
- Confirm `/`, `/explore`, `/people`, `/friends`, `/followers`, and `/following` do not render the signed-in user as a discoverable person.
- Confirm SUPER_ADMIN / ADMIN / platform moderation / guest identities do not render in consumer people results.
- Confirm another normal USER or CREATOR matching the query still appears normally.
- Confirm community member directories hide backend-only/guest platform identities but may show the signed-in USER/CREATOR when they are a legitimate member.
