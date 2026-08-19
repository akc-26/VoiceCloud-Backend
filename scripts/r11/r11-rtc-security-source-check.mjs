import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const rtc = read('src/modules/rtc/rtc.service.ts');
const rtcController = read('src/modules/rtc/rtc.controller.ts');
const livekit = read('src/modules/rtc/providers/livekit.provider.ts');
const agora = read('src/modules/rtc/providers/agora.provider.ts');
const zego = read('src/modules/rtc/providers/zegocloud.provider.ts');
const moderation = read('src/modules/moderation/phase18-security.controller.ts');
const roomService = read('src/modules/rooms/rooms.service.ts');
const roomAuthority = read('src/modules/rooms/room-authority.service.ts');
const polls = read('src/modules/polls/polls.service.ts');
const quizzes = read('src/modules/quizzes/quizzes.service.ts');
const chat = read('src/modules/chat/chat.service.ts');
const quality = read('src/modules/rtc/rtc-quality.service.ts');
const luckyBox = read('src/modules/gifts/lucky-box.service.ts');
const roomTickets = read('src/modules/rooms/room-tickets.service.ts');

const checks = [
  ['RTC token role is derived from server authority', /deriveAuthoritativeRtcRole\(dto\.roomId, userId\)/.test(rtc) && !/role:\s*dto\.role/.test(rtc)],
  ['RTC role derivation covers host/co-host/moderator/speaker/listener', /SpeakerRole\.HOST/.test(rtc) && /SpeakerRole\.CO_HOST/.test(rtc) && /SpeakerRole\.MODERATOR/.test(rtc) && /SpeakerRole\.SPEAKER/.test(rtc) && /SpeakerRole\.LISTENER/.test(rtc)],
  ['RTC listener token/join access is checked against authoritative room policy', /assertRtcAudienceAccess/.test(rtc) && /assertRoomJoinable\(roomId, userId\)/.test(rtc)],
  ['RTC refresh and rejoin re-derive authoritative role', /async refreshToken[\s\S]*deriveAuthoritativeRtcRole/.test(rtc) && /async rejoinRoom[\s\S]*deriveAuthoritativeRtcRole/.test(rtc)],
  ['Listeners cannot self-assert active speaking', /Listeners cannot report active speaking state/.test(rtc)],
  ['Device ban requires RolesGuard Admin or Super Admin', /@Post\('device-security\/ban'\)[\s\S]{0,220}@UseGuards\(JwtAuthGuard, RolesGuard\)[\s\S]{0,220}@Roles\(UserRole\.ADMIN, UserRole\.SUPER_ADMIN\)/.test(moderation)],
  ['Recording start/stop/pause/resume uses authoritative room/job checks', /startRecording[\s\S]*assertRecordingAuthority/.test(rtc) && /stopRecording[\s\S]*assertRecordingJobAuthority/.test(rtc) && /pauseRecording[\s\S]*assertRecordingJobAuthority/.test(rtc) && /resumeRecording[\s\S]*assertRecordingJobAuthority/.test(rtc)],
  ['Recording listing requires JWT and non-admin room scoping', /@Get\('recordings'\)[\s\S]{0,100}@UseGuards\(JwtAuthGuard\)/.test(rtcController) && /Non-admin recording queries must be scoped/.test(rtc)],
  ['RTC configuration is Admin/Super Admin protected', /@Get\('config'\)[\s\S]{0,160}@Roles\(UserRole\.ADMIN, UserRole\.SUPER_ADMIN\)/.test(rtcController) && /@Patch\('config'\)[\s\S]{0,160}@Roles\(UserRole\.ADMIN, UserRole\.SUPER_ADMIN\)/.test(rtcController)],
  ['Room media mutations authorize before permanent storage', /uploadRoomCover[\s\S]*assertOwnerOrCoHost[\s\S]*storageService\.uploadFile/.test(roomService) && /uploadRoomThumbnail[\s\S]*assertOwnerOrCoHost[\s\S]*storageService\.uploadFile/.test(roomService) && /uploadRoomBackground[\s\S]*assertOwnerOrCoHost[\s\S]*storageService\.uploadFile/.test(roomService)],
  ['Shared room authority supports host/co-host/moderator', /assertManager/.test(roomAuthority) && /isCoHost/.test(roomAuthority) && /isModerator/.test(roomAuthority)],
  ['Poll creation/lifecycle requires room manager authority', /createPoll[\s\S]*assertManager/.test(polls) && /startPoll[\s\S]*assertManager/.test(polls)],
  ['Quiz creation/lifecycle requires room manager authority', /createQuiz[\s\S]*assertManager/.test(quizzes) && /startQuiz[\s\S]*assertManager/.test(quizzes)],
  ['Room announcements require room manager authority', /sendRoomAnnouncement[\s\S]*assertManager/.test(chat)],
  ['LiveKit publishing permission includes authoritative co-host', /SpeakerRole\.CO_HOST/.test(livekit) && /canPublish/.test(livekit)],
  ['LiveKit token validation verifies HMAC signature, issuer and expiry', /timingSafeEqual/.test(livekit) && /payload\.iss === apiKey/.test(livekit) && /payload\.exp > now/.test(livekit)],
  ['LiveKit participant removal uses real RoomService request', /RoomService\//.test(livekit) && /RemoveParticipant/.test(livekit)],
  ['LiveKit participant state uses real ListParticipants request', /ListParticipants/.test(livekit) && /activeParticipants/.test(livekit)],
  ['LiveKit recording does not fabricate provider success', /Egress recording is not configured/.test(livekit) && !/livekit_egress_/.test(livekit)],
  ['Agora unsupported provider operations fail closed instead of fabricating success', /will not fabricate provider success/.test(agora) && !/AGORA006/.test(agora) && /return false;/.test(agora)],
  ['ZEGOCLOUD unsupported provider operations fail closed instead of fabricating success', /will not fabricate provider success/.test(zego) && !/ZEGO04/.test(zego) && /return false;/.test(zego)],
  ['RTC provider webhooks fail closed when verification is unavailable', /return false;/.test(agora) && /return false;/.test(zego) && /timingSafeEqual/.test(livekit)],
  ['Recording status changes require provider confirmation', /provider did not confirm recording stop/i.test(rtc) && /provider did not confirm recording pause/i.test(rtc) && /provider did not confirm recording resume/i.test(rtc)],
  ['RTC no-data quality metrics do not invent perfect quality', /overallConnectionQuality:\s*'no-data'/.test(quality) && /overallScore:\s*null/.test(quality)],
  ['RTC monitoring no-data does not invent RTT/packet-loss telemetry', /telemetryCompleteness/.test(rtc) && /:\s*null;/.test(rtc) && !/: 35;/.test(rtc) && !/: 0\.5;/.test(rtc)],
  ['Lucky-box financial reward randomness is cryptographically generated', /randomInt\(0, 1_000_000\)/.test(luckyBox) && !/Math\.random\(\)/.test(luckyBox)],
  ['Paid room ticket identifiers use cryptographic randomness', /randomBytes\(4\)/.test(roomTickets) && !/Math\.random\(\)/.test(roomTickets)],
];

const failed = checks.filter(([, ok]) => !ok);
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} - ${name}`);
if (failed.length) process.exit(1);
console.log(`R11 RTC/security source check: ${checks.length}/${checks.length}`);
