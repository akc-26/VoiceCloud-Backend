# VC-WEB-PH05-R12 Manual QA

Run these after `scripts\website\VC-WEB-PH05-ACCEPTANCE.cmd` passes.

- [ ] **QA-01 Pause after host speaks:** Creator `/rooms` → Go Live → Start Speaking → Pause Broadcast. No `Authenticated socket user required`; room becomes PAUSED and host mic stops.
- [ ] **QA-02 Rooms controls:** Verify Ready/On air/Paused states and Go Live, Pause/Resume, End, Start Speaking/Mute, Manage Live Room controls are readable, aligned and correctly enabled.
- [ ] **QA-03 Schedule create/edit/start:** Create a future schedule in local time, edit date/time, start it from the schedule card, then verify Pause/Resume/End, Start Speaking/Mute and Open Console behavior.
- [ ] **QA-04 Timezones:** Compare the same scheduled session in two browsers/devices with different OS/browser timezones. The displayed wall time must convert to each viewer's local timezone while representing the same instant.
- [ ] **QA-05 Creator chat sides:** Send Creator's own message and another user's message. Creator own message is right-aligned; every other sender is left-aligned.
- [ ] **QA-06 Host mute authority:** Approve/invite a user to stage, let them start speaking, mute them from Creator console. Host sees muted icon/state; user microphone stops and user sees `Muted by Host`. Unmute permits user to manually Start Speaking again.
- [ ] **QA-07 Consumer emoji:** User joins a LIVE room and taps each quick emoji. Reaction appears immediately. Repeat after a socket reconnect; first reaction must recover membership/retry instead of silently doing nothing.
- [ ] **QA-08 Pause notification/restrictions:** While a user is in room, Creator pauses. User is notified immediately; chat/reactions/raise hand/speaking controls are disabled. Creator cannot invite/approve/mute stage users until resumed.
- [ ] **QA-09 Resume:** Creator resumes. User is notified immediately and LIVE interaction controls are re-enabled according to role.
- [ ] **QA-10 End redirect:** Creator ends broadcast. User is immediately removed from the live experience, redirected to `/rooms`, and sees the ended-broadcast notice.
- [ ] **QA-11 Bounded consumer chat:** Generate enough messages to exceed the visible chat area. Only the chat stream scrolls; the full room page does not grow continuously with chat history.
- [ ] **QA-12 Existing R11 preservation:** Recheck room join/rejoin, host audio publication, participant counts, speaker promotion/removal, Creator/Admin navigation, and website discovery/auth smoke paths.
