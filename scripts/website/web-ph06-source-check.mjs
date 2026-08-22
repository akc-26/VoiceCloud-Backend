import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const exists = (relative) => fs.existsSync(path.join(root, relative));

const router = read('website/src/app/router/AppRouter.tsx');
const api = read('website/src/features/hosting/hosting.api.ts');
const realtime = read('website/src/features/rooms/room-realtime.ts');
const room = read('website/src/pages/RoomExperiencePage.tsx');
const myRooms = read('website/src/pages/MyRoomsPage.tsx');
const createRoom = read('website/src/pages/CreateRoomPage.tsx');
const settings = read('website/src/pages/RoomSettingsPage.tsx');
const schedule = read('website/src/pages/HostSchedulePage.tsx');
const hostControls = read('website/src/components/hosting/RoomHostControls.tsx');
const polls = read('website/src/components/hosting/RoomPollsPanel.tsx');
const quiz = read('website/src/components/hosting/RoomQuizPanel.tsx');
const designMap = read('docs/website/VC-WEB-DESIGN-PHASE-MAP-R01.md');
const hardening = read('src/common/http/production-http-hardening.ts');
const browserRtc = read('shared/rtc/livekit-browser.ts');

const ph06Designs = Array.from({ length: 10 }, (_, i) => String(31 + i).padStart(3, '0'));

const checks = [
  ['PH06 design authority maps screens 031-040 to WEB-PH06', ph06Designs.every((n) => new RegExp(`\\| ${n} \\|[^\\n]*\\| WEB-PH06 \\|`).test(designMap))],
  ['Protected website host routes cover rooms, create, settings and schedule', ['/host/rooms"','/host/rooms/create"','/host/rooms/:roomId/settings"','/host/schedule"'].every((v) => router.includes(v))],
  ['My Rooms uses backend-owned room authority and lifecycle controls', myRooms.includes('hostingApi.ownedRooms') && myRooms.includes('hostingApi.startBroadcast') && myRooms.includes('hostingApi.pause') && myRooms.includes('hostingApi.resume') && myRooms.includes('hostingApi.endBroadcast')],
  ['Create Room uses canonical room API without fabricated persistence', createRoom.includes('hostingApi.createRoom') && api.includes("apiClient.post('/rooms', input)")],
  ['Room privacy settings persist canonical invite/lock/subscriber/verified/ticket rules', settings.includes('isInviteOnly') && settings.includes('isLocked') && settings.includes('isSubscriberOnly') && settings.includes('isVerifiedOnly') && settings.includes('isTicketRequired') && api.includes('apiClient.patch(`/rooms/${roomId}`')],
  ['Broadcast start preflights authoritative LiveKit and RTC session state', api.includes("apiClient.post('/rtc/token'") && api.includes("data?.provider !== 'livekit'") && api.includes("apiClient.post('/rtc/sessions/start'") && api.includes('hostingApi.ensureVoiceSession(roomId)')],
  ['Schedule stores browser-local timezone as a canonical ISO instant and supports linked broadcast lifecycle', schedule.includes('resolvedOptions().timeZone') && schedule.includes('local.toISOString()') && schedule.includes('scheduledRoomId:item.id') && schedule.includes('hostingApi.startBroadcast') && schedule.includes('hostingApi.pause') && schedule.includes('hostingApi.resume') && schedule.includes('hostingApi.endBroadcast')],
  ['Room audience invitations use canonical authenticated realtime room invitation event', realtime.includes("'room:invite_participant'") && hostControls.includes('inviteRoomParticipant(roomId,userId)')],
  ['Room invite search preserves consumer-only USER/CREATOR visibility policy', api.includes("['USER', 'CREATOR'].includes(String(user.role).toUpperCase())")],
  ['Host stage controls use canonical stage approve/reject/invite/mute/remove APIs', ['/stage`','/approve-speaker`','/reject-speaker`','/invite-speaker`','/mute-user`','/remove-speaker`'].every((v) => api.includes(v)) && hostControls.includes('stage.data?.handQueue') && hostControls.includes('stage.data?.speakers')],
  ['Host and speaker modes remain inside the authoritative live RoomExperience', room.includes("role === 'host'") && room.includes("'Start Speaking'") && room.includes('<RoomHostControls')],
  ['Live polls use canonical create/list/vote/stop APIs and realtime invalidation', api.includes("apiClient.post('/polls'") && api.includes('`/polls/${pollId}/vote`') && api.includes('`/polls/${pollId}/stop`') && polls.includes('hostingApi.votePoll') && room.includes("'poll:created'") && room.includes("'poll:voted'")],
  ['Live quiz uses canonical create/start/active/submit/stop APIs and realtime invalidation', api.includes("apiClient.post('/quizzes'") && api.includes('`/quizzes/${quizId}/start`') && api.includes('`/quizzes/rooms/${roomId}/active`') && api.includes('`/quizzes/${quizId}/submit`') && quiz.includes('hostingApi.submitQuizAnswer') && room.includes("'quiz:started'")],
  ['PH06 UI source files are present', ['website/src/features/hosting/types.ts','website/src/pages/MyRoomsPage.tsx','website/src/pages/CreateRoomPage.tsx','website/src/pages/RoomSettingsPage.tsx','website/src/pages/HostSchedulePage.tsx','website/src/components/hosting/RoomHostControls.tsx','website/src/components/hosting/RoomPollsPanel.tsx','website/src/components/hosting/RoomQuizPanel.tsx'].every(exists)],
  ['R14 LiveKit/CSP correction remains preserved in PH06 baseline', hardening.includes("script-src 'self' https://cdn.jsdelivr.net") && browserRtc.includes('livekit-client@2.22.0/dist/livekit-client.umd.min.js')],
  ['PH06 does not introduce hard-coded host room/poll/quiz runtime datasets', !/const\s+(rooms|polls|quizzes)\s*=\s*\[[^\]]/s.test([myRooms,polls,quiz].join('\n'))],
];

let failed = 0;
for (const [name, ok] of checks) {
  if (ok) console.log(`PASS - ${name}`);
  else { failed += 1; console.error(`FAIL - ${name}`); }
}
console.log(`VC-WEB-PH06 source check: ${checks.length - failed}/${checks.length}`);
if (failed) process.exit(1);
