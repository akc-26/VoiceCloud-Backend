import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const required = [
  'VC-WEB-PH05-BASELINE.txt',
  'website/src/features/rooms/types.ts',
  'website/src/features/rooms/room.api.ts',
  'website/src/features/rooms/room-access.ts',
  'website/src/features/rooms/room-session.store.ts',
  'website/src/features/rooms/room-realtime.ts',
  'website/src/features/rooms/room-runtime.ts',
  'website/src/components/rooms/RoomAccessNotice.tsx',
  'website/src/components/rooms/RoomParticipantsPanel.tsx',
  'website/src/components/rooms/RoomReactionBar.tsx',
  'website/src/components/rooms/RoomChatPanel.tsx',
  'website/src/pages/RoomDetailsPage.tsx',
  'website/src/pages/RoomExperiencePage.tsx',
  'creator/src/pages/LiveRoomConsolePage.tsx',
  'creator/src/services/live-room-realtime.service.ts',
  'shared/rtc/livekit-browser.ts',
  'docs/website/VC-WEB-PH05-IMPLEMENTATION-REPORT.md',
  'docs/website/VC-WEB-PH05-MANUAL-QA.md',
  'docs/website/VC-WEB-PH05-R11-COMPLETE-ACCEPTANCE-AUDIT.md',
  'creator/src/services/creator-live-media.service.ts',
  'src/modules/rtc/livekit-config.util.ts',
  'src/modules/rtc/livekit-provider.runtime.spec.ts',
  'src/modules/admin/provider-test-connection.livekit.spec.ts',
  'scripts/website/backend-constructor-contract-check.mjs',
  'scripts/website/web-ph05-comprehensive-acceptance.mjs',
];
for (const rel of required) if (!fs.existsSync(path.join(root, rel))) errors.push(`Missing ${rel}`);

const baseline = fs.readFileSync(path.join(root, 'VC-WEB-PH05-BASELINE.txt'), 'utf8');
if (!baseline.includes('PHASE=VC-WEB-PH05-R11')) errors.push('PH05 baseline revision is not R11');
if (!baseline.includes('PARENT=bd330734886cda3ebf2b1a268a6dfd63f7f6011a')) errors.push('PH05 protected parent is not frozen PH04-R03');

const router = fs.readFileSync(path.join(root, 'website/src/app/router/AppRouter.tsx'), 'utf8');
if (!router.includes('path="/rooms/:roomId" element={<RoomDetailsPage/>}')) errors.push('Room detail route is not implemented');
if (!router.includes('path="/rooms/:roomId/live" element={<RoomExperiencePage/>}')) errors.push('Authenticated live-room route is not implemented');
if (router.includes('path="/rooms/:roomId" element={<FeaturePlaceholderPage/>}')) errors.push('Room detail placeholder remains');

const api = fs.readFileSync(path.join(root, 'website/src/features/rooms/room.api.ts'), 'utf8');
for (const token of ['/rooms/${roomId}', '/rtc/rooms/join', '/rtc/rooms/rejoin', '/rtc/rooms/leave', '/participants', "type: 'room'", '/messages', '/reactions']) {
  if (!api.includes(token)) errors.push(`PH05 room API client missing ${token}`);
}
if (!api.includes("role: 'listener'")) errors.push('PH05 room join must request listener only as a client hint');

const realtime = fs.readFileSync(path.join(root, 'website/src/features/rooms/room-realtime.ts'), 'utf8');
for (const token of ['presence:join','presence:leave','presence:reconnect','reaction:send']) if (!realtime.includes(token)) errors.push(`PH05 realtime room flow missing ${token}`);
const socket = fs.readFileSync(path.join(root, 'website/src/realtime/socket.client.ts'), 'utf8');
if (!socket.includes("io('/realtime'")) errors.push('Consumer socket must connect to the canonical /realtime namespace');
if (!socket.includes("path: '/socket.io'")) errors.push('Consumer socket must retain canonical Socket.IO path');

const roomPage = fs.readFileSync(path.join(root, 'website/src/pages/RoomExperiencePage.tsx'), 'utf8');
for (const token of ['establishRoomRuntime','reconnectRoomRuntime','leaveRoomRuntime','RoomParticipantsPanel','RoomChatPanel','RoomReactionBar','chat_message','reaction:broadcast','connectLiveKitAudio','raiseHand','cancelRaiseHand','Start Speaking']) if (!roomPage.includes(token)) errors.push(`Live room page missing ${token}`);

const details = fs.readFileSync(path.join(root, 'website/src/pages/RoomDetailsPage.tsx'), 'utf8');
if (!details.includes('roomApi.join') || !details.includes('roomAccessIssue')) errors.push('Room details does not use server-authoritative join/access handling');
if (!details.includes("navigate('/auth/sign-in')")) errors.push('Signed-out room join does not use existing auth flow');

const access = fs.readFileSync(path.join(root, 'website/src/features/rooms/room-access.ts'), 'utf8');
for (const token of ['ticket','subscription','verification','club','invite','locked','full','closed','offline']) if (!access.includes(`'${token}'`)) errors.push(`Room access mapping missing ${token}`);

const chat = fs.readFileSync(path.join(root, 'src/modules/chat/chat.service.ts'), 'utf8');
if (!chat.includes('RealtimeRoomStateService')) errors.push('Room chat does not consume canonical realtime room access authority');
for (const token of ['assertRoomConversationAccess', 'assertRoomJoinable(roomId, createdById)', 'assertParticipantOrHost(roomId, createdById)', 'await this.assertRoomConversationAccess(conversation, senderId)']) if (!chat.includes(token)) errors.push(`Room chat authority hardening missing ${token}`);
if (!chat.includes("relations: { conversation: { members: true } }")) errors.push('Message reaction authority must load conversation membership');


const creatorAudience = fs.readFileSync(path.join(root, 'creator/src/pages/AudiencePage.tsx'), 'utf8');
const creatorSubscribers = fs.readFileSync(path.join(root, 'creator/src/pages/SubscribersPage.tsx'), 'utf8');

// MUI v9 no longer accepts generic system shorthand props directly on these components.
// Keep this guard broad enough to catch the exact class of workstation TypeScript failures
// that blocked PH05-R03 acceptance.
const creatorMuiSources = [
  ['creator/src/pages/AudiencePage.tsx', creatorAudience],
  ['creator/src/pages/LiveRoomConsolePage.tsx', fs.readFileSync(path.join(root, 'creator/src/pages/LiveRoomConsolePage.tsx'), 'utf8')],
];
for (const [rel, src] of creatorMuiSources) {
  const forbiddenDirectProps = [
    /<Stack[^>]*\s(?:alignItems|justifyContent|gap|flexWrap|mt|mb)=/,
    /<Typography[^>]*\s(?:fontWeight|mt|mb)=/,
    /<Box[^>]*\s(?:mt|mb)=/,
  ];
  for (const pattern of forbiddenDirectProps) {
    if (pattern.test(src)) errors.push(`${rel} still uses MUI v9-incompatible direct system styling props`);
  }
}
if (creatorSubscribers.includes('inputProps={{')) errors.push('SubscribersPage still uses removed TextField inputProps instead of slotProps.htmlInput');
if (!creatorSubscribers.includes("slotProps={{ htmlInput: { min: 0, step: '0.01' } }}")) errors.push('SubscribersPage numeric price inputs are not protected with slotProps.htmlInput');

const creatorRooms = fs.readFileSync(path.join(root, 'creator/src/pages/LiveRoomsPage.tsx'), 'utf8');
for (const token of ['startBroadcast','navigate(`/rooms/${room.id}/live`)','Manage Live Room','Start Speaking','Mute Mic','refetchInterval','CreateLiveRoomInput']) if (!creatorRooms.includes(token)) errors.push(`Creator rooms page missing lifecycle/control behavior: ${token}`);
if (creatorRooms.includes('Speaker Stage & Host Controls')) errors.push('Obsolete static Creator speaker-stage dialog remains');
if (creatorRooms.includes('Partial<LiveRoomSummary>') && creatorRooms.includes('creatorApi.createRoom')) errors.push('Creator room creation still passes Partial<LiveRoomSummary> to required CreateLiveRoomInput');

const creatorConsole = fs.readFileSync(path.join(root, 'creator/src/pages/LiveRoomConsolePage.tsx'), 'utf8');
for (const token of ['creatorLiveMediaService','useCreatorLiveMedia','Start Speaking','Mute Microphone','getRoomStage','getRoomConversation','reaction:broadcast','Raised hands','Invite to stage','End Broadcast']) if (!creatorConsole.includes(token)) errors.push(`Creator live console missing ${token}`);

const creatorApi = fs.readFileSync(path.join(root, 'creator/src/services/creator-api.service.ts'), 'utf8');
for (const token of ['preflightBroadcastAudio','startBroadcast','endBroadcast','ensureVoiceSession','joinRtcRoom','leaveRtcRoom','getRoomStage','getRoomConversation','reportSpeakingState']) if (!creatorApi.includes(token)) errors.push(`Creator API missing live-room operation ${token}`);
if (!creatorApi.includes("result.provider !== 'livekit' || !result.serverUrl")) errors.push('Creator Start Broadcast does not fail closed when real browser RTC media is unavailable');
if (!creatorApi.includes('await this.endRoom(id, signal).catch')) errors.push('Creator Start Broadcast does not rollback room LIVE state when RTC session start fails');
if (creatorApi.includes("body: JSON.stringify({ targetUserId, isMuted })")) errors.push('Creator mute payload still uses obsolete isMuted field');

const lifecycle = fs.readFileSync(path.join(root, 'src/modules/rooms/room-lifecycle.service.ts'), 'utf8');
if (!lifecycle.includes("start: [RoomLifecycleStatus.OFFLINE, RoomLifecycleStatus.ENDED]")) errors.push('Ended room cannot restart in-place');
const roomsService = fs.readFileSync(path.join(root, 'src/modules/rooms/rooms.service.ts'), 'utf8');
if (roomsService.includes('const restarted = this.roomRepository.create')) errors.push('Ended-room restart still creates duplicate Room entity');

const realtimeState = fs.readFileSync(path.join(root, 'src/common/events/services/realtime-room-state.service.ts'), 'utf8');
for (const token of ['presentUserIds','activeSpeakerCount','participantCount - activeSpeakerCount']) if (!realtimeState.includes(token)) errors.push(`Realtime room count authority missing ${token}`);
if (realtimeState.includes('participantCount - speakerCount')) errors.push('Realtime room listener count still subtracts disconnected stage speakers');

const rtcService = fs.readFileSync(path.join(root, 'src/modules/rtc/rtc.service.ts'), 'utf8');
for (const token of ['syncRoomCounts','listenerCount','speakerCount','getRoomStageState','serverUrl: tokenResult.serverUrl','participant_joined','participant_left']) if (!rtcService.includes(token)) errors.push(`RTC live-room authority missing ${token}`);
const rtcController = fs.readFileSync(path.join(root, 'src/modules/rtc/rtc.controller.ts'), 'utf8');
if (!rtcController.includes("@Get('rooms/:roomId/stage')")) errors.push('Authoritative Creator stage endpoint is missing');
const livekitProvider = fs.readFileSync(path.join(root, 'src/modules/rtc/providers/livekit.provider.ts'), 'utf8');
if (!livekitProvider.includes('serverUrl')) errors.push('LiveKit token result does not expose authoritative browser server URL');
const livekitBrowser = fs.readFileSync(path.join(root, 'shared/rtc/livekit-browser.ts'), 'utf8');
for (const token of ['setMicrophoneEnabled(true)','setMicrophoneEnabled(false)','TrackSubscribed','startAudio','room.connect']) if (!livekitBrowser.includes(token)) errors.push(`Browser LiveKit integration missing ${token}`);
if (livekitBrowser.includes('import.meta')) errors.push('Shared browser RTC module must not use import.meta because shared files are also compiled by Nest');
if (livekitBrowser.includes('element.playsInline = true;') && !livekitBrowser.includes('element instanceof HTMLVideoElement')) errors.push('Shared browser RTC module assigns playsInline on generic HTMLMediaElement instead of narrowing to HTMLVideoElement');


const creatorMedia = fs.readFileSync(path.join(root, 'creator/src/services/creator-live-media.service.ts'), 'utf8');
for (const token of ['useSyncExternalStore','ensureConnected','startSpeaking','stopSpeaking','startAudio','disconnect','connectLiveKitAudio']) {
  if (!creatorMedia.includes(token)) errors.push(`Persistent Creator live media service missing ${token}`);
}
if (creatorMedia.includes('return () => this.listeners.delete(listener)')) errors.push('Creator live media external-store cleanup still returns Set.delete boolean instead of void');
if (creatorRooms.includes('await realtime.join(')) errors.push('Creator room-management page must not join live-room presence merely to observe room updates');
if (!creatorRooms.includes('Passive management-page subscription only')) errors.push('Creator room-management passive realtime subscription guard is missing');

const livekitUtil = fs.readFileSync(path.join(root, 'src/modules/rtc/livekit-config.util.ts'), 'utf8');
for (const token of ['serverUrl','url','wsUrl','host','apiKey','apiSecret','liveKitHttpBaseUrl']) {
  if (!livekitUtil.includes(token)) errors.push(`LiveKit config normalization missing ${token}`);
}
if (!livekitProvider.includes('getActiveProviderConfig')) errors.push('LiveKit runtime is not using active provider configuration authority');
if (!livekitProvider.includes("healthStatus !== 'healthy'")) errors.push('LiveKit runtime does not require a successful Admin provider connection test');
if (!livekitProvider.includes('verifyConnectivity')) errors.push('Privileged LiveKit token generation does not perform a real provider connectivity preflight');
if (!livekitProvider.includes('livekit.RoomService/ListRooms')) errors.push('LiveKit host preflight does not authenticate through RoomService ListRooms');

const providerTest = fs.readFileSync(path.join(root, 'src/modules/admin/provider-test-connection.service.ts'), 'utf8');
for (const token of ['resolveLiveKitProviderConfig','liveKitHttpBaseUrl','livekit.RoomService/ListRooms','LiveKit connection verified successfully']) {
  if (!providerTest.includes(token)) errors.push(`Admin LiveKit real connectivity test missing ${token}`);
}
const providerAdmin = fs.readFileSync(path.join(root, 'src/modules/admin/admin-providers.service.ts'), 'utf8');
for (const token of ['syncRtcRuntimeConfig','healthStatus = \'not_tested\'','Test the LiveKit Project URL, API Key, and API Secret successfully']) {
  if (!providerAdmin.includes(token)) errors.push(`Admin RTC provider/runtime synchronization missing ${token}`);
}
const providerUi = fs.readFileSync(path.join(root, 'admin/src/pages/ProviderConfigsPage.tsx'), 'utf8');
for (const token of ['LIVEKIT_CONFIG_TEMPLATE','serverUrl','API Key, and API Secret from the same LiveKit project','RoomService connectivity check']) {
  if (!providerUi.includes(token)) errors.push(`Admin LiveKit configuration UI missing ${token}`);
}

if (!chat.includes('senderSummary') || !chat.includes('withSenders')) errors.push('Chat service does not enrich messages with safe sender identity');
for (const token of ["sender: await this.senderSummary", "conversation.roomId", "'chat_message'", "chat_reaction_added", "chat_reaction_removed"]) {
  if (!chat.includes(token)) errors.push(`Room chat realtime identity/event hardening missing ${token}`);
}
const reactionsGateway = fs.readFileSync(path.join(root, 'src/common/events/gateways/reactions.gateway.ts'), 'utf8');
if (!reactionsGateway.includes("username: username || 'VoiceCloud user'")) errors.push('Live room reaction payload does not include a safe username label');
const roomChatPanel = fs.readFileSync(path.join(root, 'website/src/components/rooms/RoomChatPanel.tsx'), 'utf8');
if (roomChatPanel.includes('senderId') && /senderId\s*\|\|/.test(roomChatPanel)) errors.push('Consumer room chat visibly falls back to sender UUID');
if (!roomChatPanel.includes("'VoiceCloud user'")) errors.push('Consumer room chat safe identity fallback is missing');
if (creatorConsole.includes("|| message.senderId") || creatorConsole.includes("|| request.userId")) errors.push('Creator live console visibly falls back to raw UUIDs');
const adminMessaging = fs.readFileSync(path.join(root, 'admin/src/pages/MessagingPage.tsx'), 'utf8');
if (adminMessaging.includes("label: 'Sender ID'")) errors.push('Admin messaging still presents raw sender UUID as the primary identity');

// R05 acceptance now guards the MUI v9 compatibility class across both Creator and Admin.
for (const base of ['creator/src', 'admin/src']) {
  const stack = [path.join(root, base)];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) { stack.push(full); continue; }
      if (!entry.name.endsWith('.tsx')) continue;
      const ui = fs.readFileSync(full, 'utf8');
      const rel = path.relative(root, full);
      if (/<Stack[^>]*\s(?:alignItems|justifyContent|gap|flexWrap|mt|mb)=/.test(ui)) errors.push(`${rel} still uses MUI v9-incompatible direct Stack system props`);
      if (/<Typography[^>]*\s(?:fontWeight|mt|mb)=/.test(ui)) errors.push(`${rel} still uses MUI v9-incompatible direct Typography system props`);
      if (/<Box[^>]*\s(?:mt|mb)=/.test(ui)) errors.push(`${rel} still uses MUI v9-incompatible direct Box system props`);
      if (/\binputProps=\{\{/.test(ui)) errors.push(`${rel} still uses removed MUI TextField inputProps API`);
      if (/\bInputLabelProps=\{/.test(ui)) errors.push(`${rel} still uses removed MUI TextField InputLabelProps API`);
    }
  }
}


const roomsWp08Spec = fs.readFileSync(path.join(root, 'src/modules/rooms/rooms.service.wp08-02.spec.ts'), 'utf8');
if (!roomsWp08Spec.includes("import { RoomAuthorityService } from './room-authority.service';")) errors.push('RoomsService WP08-02 spec does not import the current RoomAuthorityService constructor dependency');
if (!roomsWp08Spec.includes('as unknown as RoomAuthorityService')) errors.push('RoomsService WP08-02 spec does not supply the current RoomAuthorityService constructor dependency');
const acceptance = fs.readFileSync(path.join(root, 'scripts/website/VC-WEB-PH05-ACCEPTANCE.cmd'), 'utf8');
if (!acceptance.includes('web-ph05-comprehensive-acceptance.mjs')) errors.push('PH05 Windows acceptance does not invoke the non-fail-fast comprehensive acceptance runner');
const comprehensiveAcceptance = fs.readFileSync(path.join(root, 'scripts/website/web-ph05-comprehensive-acceptance.mjs'), 'utf8');
for (const token of [
  'process.execPath',
  'node_modules/typescript/bin/tsc',
  'node_modules/jest/bin/jest.js',
  'node_modules/vite/bin/vite.js',
  'node_modules/@nestjs/cli/bin/nest.js',
  'backend-constructor-contract-check.mjs',
  'livekit-provider.runtime.spec.ts',
  'provider-test-connection.livekit.spec.ts',
  'rooms.service.wp08-02.spec.ts',
  'r11-rtc-role-authority.spec.ts',
  'phase20-rtc.spec.ts',
  'r11-admin-qa-source-check.mjs',
  'r11-creator-qa-source-check.mjs',
  'r11-backend-authority-source-check.mjs',
  'r11-rtc-security-source-check.mjs',
  'r11-api-parity-source-check.mjs',
  'Full integrated monolith build',
  'failures.push',
  'SPAWN-ERROR',
  'Cross-platform Node command-dispatch probe',
]) {
  if (!comprehensiveAcceptance.includes(token)) errors.push(`PH05 comprehensive acceptance runner is missing direct gate/protection ${token}`);
}
if (comprehensiveAcceptance.includes("process.platform === 'win32' ? 'npm.cmd'")) errors.push('PH05 comprehensive acceptance still dispatches npm.cmd directly on Windows');
if (/spawnSync\(npm/.test(comprehensiveAcceptance)) errors.push('PH05 comprehensive acceptance still relies on npm shell shims for post-install gates');


const phase20RtcSpec = fs.readFileSync(path.join(root, 'src/modules/rtc/phase20-rtc.spec.ts'), 'utf8');
if (!phase20RtcSpec.includes("healthStatus: 'healthy'")) errors.push('Legacy Phase20 LiveKit test still bypasses the healthy-provider requirement');
if (!phase20RtcSpec.includes("global.fetch = jest.fn().mockResolvedValue")) errors.push('Legacy Phase20 LiveKit host-token test does not mock the required real connectivity preflight');
if (!phase20RtcSpec.includes('Only room host, authorized co-host, or authorized moderator can manage the RTC stage')) errors.push('Phase20 stage-authority assertion is stale and omits co-host authority');
if (!phase20RtcSpec.includes('isSpeaker.mockResolvedValueOnce(true)')) errors.push('Phase20 active-speaker fixture is not promoted by server authority before reporting speech');
if (!phase20RtcSpec.includes('fails closed when Agora recording pause has no authoritative server adapter')) errors.push('Phase20 Agora pause test still expects fabricated provider success');
if (!phase20RtcSpec.includes('fails closed when Agora recording resume has no authoritative server adapter')) errors.push('Phase20 Agora resume test still expects fabricated provider success');
if (!phase20RtcSpec.includes('expect(stats.activeProvider).toEqual(mockConfig.activeProvider)')) errors.push('Phase20 monitoring test still hard-codes a provider inconsistent with its fixture');
if (phase20RtcSpec.includes('expect(stats.activeProvider).toEqual(RtcProviderType.AGORA)')) errors.push('Phase20 monitoring test still hard-codes AGORA instead of fixture authority');
if (!phase20RtcSpec.includes('mockRecordingJob.status = RecordingJobStatus.RECORDING')) errors.push('Phase20 recording fixture is not reset between tests');


// R11 runtime correction guards: the room lifecycle is enforced consistently across
// Creator, consumer, backend interaction authority and scheduled-room control surfaces.
if (!socket.includes('waitForWebsiteSocketReady')) errors.push('Consumer realtime client does not expose authenticated socket readiness');
for (const token of ["'connection_established'", "'auth_error'", 'authenticated']) {
  if (!socket.includes(token)) errors.push(`Consumer realtime socket readiness missing ${token}`);
}
const creatorRealtime = fs.readFileSync(path.join(root, 'creator/src/services/live-room-realtime.service.ts'), 'utf8');
for (const token of ['ready(): Promise<void>', "'connection_established'", 'await ready()', 'authenticated']) {
  if (!creatorRealtime.includes(token)) errors.push(`Creator realtime authenticated-handshake guard missing ${token}`);
}
if (!realtime.includes('waitForWebsiteSocketReady')) errors.push('Room realtime commands do not wait for authenticated socket readiness');

for (const token of ['assertRoomInteractive(roomId: string)', "Room interactions are disabled while the broadcast is paused"]) {
  if (!realtimeState.includes(token)) errors.push(`Realtime pause interaction authority missing ${token}`);
}
if (!reactionsGateway.includes('assertRoomInteractive(data.roomId)')) errors.push('Live emoji gateway does not block reactions while paused');
for (const token of ['assertRoomLiveInteraction(roomId)', 'await this.assertRoomLiveInteraction(roomId)', 'isMuted: dto.mute']) {
  if (!rtcService.includes(token)) errors.push(`RTC pause/mute authority missing ${token}`);
}
if (!rtcService.includes('this.redisStateService.setSpeaker(roomId')) errors.push('RTC mute action does not persist speaker mute state for host UI');
if (!rtcService.includes("broadcastToRoom(roomId, eventName")) errors.push('RTC microphone mute state is not broadcast to the room');
for (const token of ['await this.assertRoomConversationAccess(conversation, senderId)', 'assertRoomInteractive(conversation.roomId)']) {
  if (!chat.includes(token)) errors.push(`Room chat pause authority missing ${token}`);
}

const schedulePage = fs.readFileSync(path.join(root, 'creator/src/pages/SchedulePage.tsx'), 'utf8');
for (const token of [
  'Intl.DateTimeFormat().resolvedOptions().timeZone',
  'updateScheduledRoom',
  'scheduledRoomId: event.id',
  'Start Speaking',
  'Open Console',
]) {
  if (!schedulePage.includes(token)) errors.push(`Creator scheduled-room lifecycle missing ${token}`);
}
if (!schedulePage.includes('instant.toISOString()') && !schedulePage.includes('new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString()')) {
  errors.push('Creator scheduled-room lifecycle missing browser-local wall-time to canonical instant conversion');
}
if (!schedulePage.includes('Start Broadcast') && !schedulePage.includes('Create & Start Broadcast') && !schedulePage.includes('Start Linked Broadcast')) {
  errors.push('Creator scheduled-room lifecycle missing start control');
}
if (!schedulePage.includes('Edit Schedule') && !schedulePage.includes('Edit Date & Time')) {
  errors.push('Creator scheduled-room lifecycle missing edit control');
}
if (schedulePage.includes('T${scheduledTime}:00Z')) errors.push('Creator schedule still forces local wall time to UTC with a trailing Z');
if (!creatorApi.includes('timeZone') && schedulePage.includes('timeZone: localTimeZone') === false) errors.push('Creator schedule does not submit creator timezone metadata');
if (!creatorApi.includes('scheduledRoomId?: string')) errors.push('Creator live-room create contract does not support scheduledRoomId linkage');

for (const token of ["'room.paused'", "'room.resumed'", "'room.ended'", "navigate('/rooms', { replace: true", 'disabled={!isLive}', 'waitForWebsiteSocketReady']) {
  if (!roomPage.includes(token) && !realtime.includes(token)) errors.push(`Consumer live lifecycle correction missing ${token}`);
}
if (!roomPage.includes('setMicEnabled(false)') || !roomPage.includes("reportSpeakingState(roomId, false)")) errors.push('Consumer pause/mute handling does not shut down local speaking state');
if (!roomPage.includes('Live reactions are unavailable while the broadcast is paused')) errors.push('Consumer emoji pause feedback is missing');

for (const token of ['disabled = false', 'streamRef', 'vc-room-chat__paused', 'disabled={disabled}']) {
  if (!roomChatPanel.includes(token)) errors.push(`Bounded/paused consumer chat behavior missing ${token}`);
}
const globalCssR11 = fs.readFileSync(path.join(root, 'website/src/styles/global.css'), 'utf8');
if (!globalCssR11.includes('.vc-room-chat{height:min(640px,calc(100vh - 170px))')) errors.push('Consumer live chat does not have a bounded viewport-height container');
if (!globalCssR11.includes('.vc-room-chat__stream{min-height:0;overscroll-behavior:contain}')) errors.push('Consumer live chat stream does not own internal scrolling');

for (const token of ['roomRuntimeActive', "'room.paused'", "'room.resumed'", "'room.ended'", 'disabled={!isLive', 'chatStreamRef']) {
  if (!creatorConsole.includes(token)) errors.push(`Creator console realtime/pause/chat correction missing ${token}`);
}
if (!creatorConsole.includes("message.senderId === creator?.id") && !(creatorConsole.includes('creatorUserId') && creatorConsole.includes('senderId') && creatorConsole.includes('mine'))) errors.push('Creator chat does not align own messages independently from other users');
if (!creatorRooms.includes('BROADCAST CONTROLS') && !creatorRooms.includes('Broadcast controls')) errors.push('Creator room cards do not use the consolidated broadcast-control UI');

const messagingTypes = fs.readFileSync(path.join(root, 'website/src/features/messaging/types.ts'), 'utf8');
if (!messagingTypes.includes('reactions?: Array<')) errors.push('Room chat message reaction type is missing');

const ph05Files = required.filter((rel) => rel.startsWith('website/src/'));
for (const rel of ph05Files) {
  const src = fs.readFileSync(path.join(root, rel), 'utf8');
  if (/#[0-9a-fA-F]{3,8}|rgba\(/.test(src)) errors.push(`${rel} contains hard-coded brand color`);
}
const css = fs.readFileSync(path.join(root, 'website/src/styles/global.css'), 'utf8');
const marker = css.indexOf('/* VC-WEB-PH05');
if (marker < 0) errors.push('PH05 style block marker missing');
else if (/#[0-9a-fA-F]{3,8}|rgba\(/.test(css.slice(marker))) errors.push('PH05 styles contain hard-coded colors instead of centralized branding variables');
const branding = fs.readFileSync(path.join(root, 'website/src/branding/index.ts'), 'utf8');
if (/#[0-9a-fA-F]{3,8}/.test(branding)) errors.push('Website branding adapter contains hard-coded colors');

if (errors.length) {
  console.error('[FAIL] VC-WEB-PH05 source check');
  errors.forEach((error) => console.error(` - ${error}`));
  process.exit(1);
}
console.log('[PASS] VC-WEB-PH05 source check');
console.log(' - protected PH04-R03 parent recorded');
console.log(' - room detail/access is backed by canonical room + RTC join authority');
console.log(' - listener runtime uses RTC join/rejoin/leave and authenticated /realtime presence');
console.log(' - participants use canonical RTC presence with bounded refresh/realtime invalidation');
console.log(' - room chat/messages/reactions use canonical chat APIs and current room participation authority');
console.log(' - floating room reactions use canonical authenticated realtime reaction events');
console.log(' - reconnect restores server-derived RTC token/role and realtime presence');
console.log(' - Start Broadcast authenticates against the tested active LiveKit provider before a room can become LIVE');
console.log(' - blocking live-room corrections cover host microphone publication, listener counts, stage controls and consumer speaker flow');
console.log(' - listener counts exclude only currently-present speaker participants, preventing false zero counts');
console.log(' - ended broadcasts restart in-place without duplicate room creation');
console.log(' - Creator room cards retain Start Speaking/Mute + Manage Live Room without forced redirect');
console.log(' - Creator live console exposes audience/stage/chat/reactions with authoritative RTC state');
console.log(' - LiveKit browser audio attaches subscribed audio and publishes microphone only under server-authoritative roles');
console.log(' - browser media inline-playback typing narrows HTMLVideoElement safely');
console.log(' - Creator/Admin MUI v9 compatibility and all four app TypeScript gates are protected');
console.log(' - backend test constructors are audited repository-wide and WP08-02 RoomsService uses current authority dependencies');
console.log(' - PH05 runtime acceptance includes focused, WP08-02, and R11 RTC regression suites');
console.log(' - LiveKit Admin test/runtime configuration, realtime identity payloads, and no-UUID room chat are protected');
console.log(' - centralized Royal Sapphire branding remains the only PH05 presentation authority');
