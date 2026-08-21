# VC-WEB-PH05-R11 Manual QA

Run `scripts\website\VC-WEB-PH05-ACCEPTANCE.cmd` first. Then start the integrated application with `node scripts/start-local-full-real.mjs` and use `http://localhost:3000`.

## 0. LiveKit prerequisite — must pass before room testing

- [ ] Open `/admin/provider-configs` -> RTC.
- [ ] LiveKit config contains **serverUrl + apiKey + apiSecret from the same LiveKit project**.
- [ ] `serverUrl` is the LiveKit Project URL, normally `wss://<project>.livekit.cloud`.
- [ ] Save after any credential change; health becomes **Not Tested**.
- [ ] Click **Test**.
- [ ] Test reports **CONNECTION SUCCESSFUL** and real RoomService connectivity verified.
- [ ] If Test fails, do not proceed to Creator broadcast QA; fix the provider config first.
- [ ] Setting a never-tested/unhealthy LiveKit provider active is rejected.

## A. Create and Start Broadcast — room card stays visible

- [ ] Creator opens `/creator/rooms`.
- [ ] Create one room and record its room ID/title.
- [ ] Click **Start Broadcast**.
- [ ] Browser remains on `/creator/rooms`; it does **not** auto-open the console.
- [ ] The same room card becomes LIVE.
- [ ] LIVE card shows Pause, End, Start Speaking, and Open Console.
- [ ] Invalid/unhealthy LiveKit credentials cause Start Broadcast to fail **before** the room becomes LIVE.

## B. Start Speaking directly from card

- [ ] On LIVE card click **Start Speaking**.
- [ ] Browser microphone permission is requested if not already granted.
- [ ] On success button changes to Mute Mic and media state remains connected.
- [ ] Click **Open Console** while speaking; microphone publication continues.
- [ ] Navigate back to `/creator/rooms`; microphone state still shows publishing.
- [ ] Mute from the card; remote listener can no longer hear host.
- [ ] Start Speaking again succeeds without creating another room/session card.

## C. Console reopenability and lifecycle controls

- [ ] Open `/creator/rooms/:roomId/live` from the card.
- [ ] Console can be closed/navigated away from and reopened while LIVE.
- [ ] Console displays Pause/Resume/End as appropriate.
- [ ] PAUSED room still has Open Console on room-management page.
- [ ] End disconnects creator microphone/media and ends the active RTC session.

## D. Listener count and participant presence — two browsers

Use a separate normal USER account/session.

- [ ] User joins the room.
- [ ] Creator room card listener count updates without manual refresh (realtime event + bounded recovery polling).
- [ ] Creator console listener/present counts update immediately.
- [ ] User appears by display name/username, never raw UUID.
- [ ] User leaves; counts decrement exactly once.
- [ ] Rejoin/reconnect does not double-count.
- [ ] Merely opening `/creator/rooms` does not make Creator appear present in every live room.

## E. Real audio

- [ ] Host Start Speaking publishes microphone through LiveKit.
- [ ] Normal listener hears host.
- [ ] Listener browser autoplay blocker, if present, is resolved by Enable Audio.
- [ ] Host mute/unmute is audible immediately.
- [ ] Host can keep publishing while navigating room list <-> console.

## F. Realtime chat / reactions

- [ ] Listener sends room chat; Creator console sees it immediately without refresh.
- [ ] Creator sends room chat; consumer sees it immediately without refresh.
- [ ] Both directions display display name/username, never raw user UUID.
- [ ] Listener sends emoji reaction; Creator Live Reactions receives it immediately with a safe username label.
- [ ] Chat edit/delete/reaction updates refresh both sides without manual page reload.
- [ ] Admin Messaging views identify people by display name/username rather than presenting Sender ID as the primary identity.

## G. Raise hand / speaker stage

- [ ] Listener raises hand.
- [ ] Creator console updates immediately and shows the person by name.
- [ ] Creator approves/rejects successfully.
- [ ] Approved listener receives server-authoritative speaker role before Start Speaking becomes available.
- [ ] Speaker publishes microphone and can be heard.
- [ ] Creator can mute/unmute/remove speaker.
- [ ] Listener cannot self-assert a speaking role.

## H. Pause / Resume / End -> Restart duplicate regression

- [ ] Pause and Resume use the same room ID.
- [ ] End the broadcast.
- [ ] Start that same ended room again.
- [ ] The exact same room ID returns LIVE.
- [ ] No duplicate room card/entity is created.
- [ ] Repeat End -> Start three times; still one room.

## I. Cross-app regression

- [ ] `/` consumer site loads.
- [ ] `/admin` loads.
- [ ] `/creator` loads.
- [ ] PH04 search/self/backend-account filters remain correct.
- [ ] Direct/group messages and notifications remain operational.
- [ ] No database migration is required.


## J. R11 consolidated runtime correction

- [ ] Creator Start Broadcast remains on `/creator/rooms`; controls show Pause/End, Start Speaking/Mute and Open Console with clear grouping.
- [ ] Creator Pause succeeds while host microphone is publishing; no `Authenticated socket user required` alert appears.
- [ ] Creator console stays realtime-connected while paused and resumes without a page refresh.
- [ ] Scheduled broadcast form interprets entered date/time in the creator browser timezone and displays it locally.
- [ ] Scheduled card can be edited before broadcast and can Start Broadcast, Pause/Resume, End, Start Speaking/Mute and Open Console once linked.
- [ ] A viewer in another timezone sees the same scheduled instant converted by their browser locale.
- [ ] Creator room chat keeps own messages right and other users left and never displays a UUID as the visible sender label.
- [ ] Host mute of an approved speaker disables that participant microphone and the Creator stage UI changes to muted immediately.
- [ ] Consumer emoji reactions appear immediately during LIVE and are blocked with visible feedback during PAUSED.
- [ ] Consumer receives PAUSED/RESUMED immediately; PAUSED blocks chat, reactions and raise-hand.
- [ ] Consumer receives ENDED immediately, leaves RTC/realtime cleanly, and automatically returns to `/rooms`.
- [ ] Consumer chat height remains bounded with an internal message scrollbar as messages accumulate.
- [ ] Host invite/approve/reject/mute/remove operations are unavailable while PAUSED and work again after Resume.
