import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');
const rtc = read('src/modules/rtc/rtc.service.ts');
const spec = read('src/modules/rtc/phase20-rtc.spec.ts');
const pkg = read('package.json');

const checks = [
  ['r09-source-check-script-registered', pkg.includes('"wp09:r09:source-check": "node scripts/wp09/wp09-r09-rtc-room-authority-source-check.mjs"')],
  ['rtc-stage-manager-authority-helper', rtc.includes('private async assertRoomStageManager(') && rtc.includes('Only room host or authorized moderator can manage the RTC stage')],
  ['rtc-moderator-authority-uses-redis-state', rtc.includes('private readonly redisStateService: RedisStateService') && rtc.includes('this.redisStateService.isModerator(')],
  ['speaker-approve-authority', /async approveSpeaker[\s\S]*?assertRoomStageManager\(hostId, roomId/.test(rtc)],
  ['speaker-reject-authority', /async rejectSpeaker[\s\S]*?assertRoomStageManager\(hostId, roomId/.test(rtc)],
  ['speaker-remove-authority', /async removeSpeaker[\s\S]*?assertRoomStageManager\(hostId, roomId/.test(rtc)],
  ['speaker-mute-authority', /async muteUser[\s\S]*?assertRoomStageManager\(hostId, roomId/.test(rtc)],
  ['seat-lock-authority', /async lockSeat[\s\S]*?assertRoomStageManager\(hostId, roomId/.test(rtc)],
  ['room-audio-profile-host-only', /async updateAudioProfile[\s\S]*?ownerOnly: true/.test(rtc)],
  ['force-disconnect-authority', /async forceDisconnectParticipant[\s\S]*?assertRoomStageManager\(adminOrHostId, dto\.roomId/.test(rtc)],
  ['moderator-cannot-control-host', rtc.includes("options?.targetUserId === room.hostId") && rtc.includes('Only the room host can change the host stage state')],
  ['durable-authority-regression-tests', spec.includes("describe('RTC room stage authority'") && spec.includes('rejects speaker approval from an authenticated non-host/non-moderator') && spec.includes('prevents a moderator from muting the room host')],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed++;
}
if (failed) process.exit(1);
console.log(`WP09 R09 RTC room authority source check passed: ${checks.length}/${checks.length}`);
