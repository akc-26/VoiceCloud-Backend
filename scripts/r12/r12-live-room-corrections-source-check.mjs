import fs from 'node:fs';

const checks = [
  ['Realtime handlers await shared socket authentication', 'src/common/events/services/realtime-socket-auth.service.ts', /ensureAuthenticatedUser[\s\S]*authPromise/],
  ['Presence gateway awaits socket authentication', 'src/common/events/gateways/presence.gateway.ts', /await this\.socketAuthService\.ensureAuthenticatedUser/],
  ['Room gateway awaits socket authentication', 'src/common/events/gateways/room.gateway.ts', /await this\.resolveUserId\(client\)/],
  ['Reaction gateway returns authoritative reaction ACK payload', 'src/common/events/gateways/reactions.gateway.ts', /reaction: payload/],
  ['Scheduled room instant uses timestamptz', 'src/modules/rooms/entities/scheduled-room.entity.ts', /scheduledStartTime[\s\S]*timestamptz|timestamptz[\s\S]*scheduledStartTime/],
  ['Scheduled room timezone migration preserves UTC legacy instants', 'src/database/migrations/1700000000014-Phase08ScheduledRoomTimezoneAuthority.ts', /TYPE timestamptz[\s\S]*AT TIME ZONE 'UTC'/],
  ['Creator schedule exposes start and edit controls', 'creator/src/pages/SchedulePage.tsx', /Create & Start Broadcast[\s\S]*Edit Date & Time/],
  ['Creator schedule records browser timezone', 'creator/src/pages/SchedulePage.tsx', /resolvedOptions\(\)\.timeZone[\s\S]*timeZone: localTimeZone/],
  ['Creator chat identifies own messages from durable user id', 'creator/src/pages/LiveRoomConsolePage.tsx', /creatorUserId[\s\S]*senderId[\s\S]*mine/],
  ['Creator stage visibly reports muted speakers', 'creator/src/pages/LiveRoomConsolePage.tsx', /speaker\?\.isMuted \|\| participant\.isMuted \? ' · muted'/],
  ['Consumer speaker honors authoritative host mute', 'website/src/pages/RoomExperiencePage.tsx', /mutedByHost[\s\S]*Muted by Host/],
  ['Consumer room reacts to pause and end realtime events', 'website/src/pages/RoomExperiencePage.tsx', /(?=[\s\S]*room\.paused)(?=[\s\S]*room\.ended)(?=[\s\S]*navigate\('\/rooms')/],
  ['Ended-room redirect surfaces a user notification on rooms page', 'website/src/pages/LiveRoomsPage.tsx', /routeNotice[\s\S]*aria-live=\"polite\"/],
  ['Consumer reactions retry room membership after reconnect', 'website/src/features/rooms/room-realtime.ts', /presence:reconnect[\s\S]*reaction:send/],
  ['Consumer live chat is bounded and internally scrollable', 'website/src/styles/global.css', /grid-template-rows:auto minmax\(0,1fr\) auto[\s\S]*overflow-y:auto/],
  ['Phase20 RTC fixture represents an actual live room', 'src/modules/rtc/phase20-rtc.spec.ts', /status: 'live'[\s\S]*isLive: true/],
];

let failures = 0;
for (const [label, file, pattern] of checks) {
  const text = fs.readFileSync(file, 'utf8');
  if (!pattern.test(text)) {
    failures += 1;
    console.error(`FAIL - ${label}`);
  } else {
    console.log(`PASS - ${label}`);
  }
}

if (failures) {
  console.error(`R12 live-room corrections source check: ${checks.length - failures}/${checks.length}`);
  process.exit(1);
}
console.log(`R12 live-room corrections source check: ${checks.length}/${checks.length}`);
