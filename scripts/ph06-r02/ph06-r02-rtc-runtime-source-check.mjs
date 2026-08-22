import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const providerTest = read('src/modules/admin/provider-test-connection.service.ts');
const providerService = read('src/modules/admin/admin-providers.service.ts');
const providerUi = read('admin/src/pages/ProviderConfigsPage.tsx');
const rtcUi = read('admin/src/pages/RtcPage.tsx');
const adminService = read('admin/src/services/admin.service.ts');
const rtcService = read('src/modules/rtc/rtc.service.ts');
const liveKit = read('src/modules/rtc/providers/livekit.provider.ts');
const agora = read('src/modules/rtc/providers/agora.provider.ts');
const zego = read('src/modules/rtc/providers/zegocloud.provider.ts');
const browserRtc = read('shared/rtc/livekit-browser.ts');
const hardening = read('src/common/http/production-http-hardening.ts');
const main = read('src/main.ts');
const controller = read('src/modules/rtc/rtc.controller.ts');
const creatorMedia = read('creator/src/services/creator-live-media.service.ts');
const websiteRoom = read('website/src/pages/RoomExperiencePage.tsx');
const realStart = read('scripts/start-local-full-real.mjs');

const checks = [
  ['Admin RTC test no longer reports unsupported Agora as healthy',
    /providerType === 'agora'[\s\S]*success:\s*false[\s\S]*runtimeAdapterAvailable:\s*false/.test(providerTest)],
  ['Admin RTC test no longer reports unsupported ZEGOCLOUD as healthy',
    /providerType === 'zegocloud'[\s\S]*success:\s*false[\s\S]*runtimeAdapterAvailable:\s*false/.test(providerTest)],
  ['RTC activation rejects non-operational providers instead of creating a guaranteed runtime failure',
    /RTC provider '\$\{selectedProvider\.providerType\}' is not operational/.test(providerService) && /RtcProviderType\.LIVEKIT/.test(providerService)],
  ['RTC provider configuration defaults to the operational LiveKit profile',
    /rtc:\s*'livekit'/.test(providerUi) && /LIVEKIT_CONFIG_TEMPLATE/.test(providerUi)],
  ['Admin provider UI visibly disables RTC profiles without a runtime adapter',
    /RUNTIME ADAPTER NOT AVAILABLE/.test(providerUi) && /disabled=\{!isOperationalRtcProvider\(p\)\}/.test(providerUi)],
  ['Admin RTC monitoring contains no fabricated room/channel examples',
    !/VIP-Voice-Lounge-01|Music-Jam-Session|User_9921|Artist_007|RTT 32ms|RTT 45ms/.test(rtcUi)],
  ['Admin RTC UI consumes real active sessions and no-data telemetry',
    /stats\.activeSessions\.map/.test(rtcUi) && /No quality samples yet/.test(rtcUi) && /RtcMonitoringActiveSession/.test(adminService)],
  ['Admin RTC monitoring loads safely before a provider is configured',
    /activeProvider:\s*config\?\.activeProvider \?\? 'unconfigured'/.test(rtcService) && /providerStatus:\s*config \? 'configured' : 'not_configured'/.test(rtcService)],
  ['Legacy RTC config API cannot bypass the operational LiveKit provider restriction',
    /dto\.activeProvider !== RtcProviderType\.LIVEKIT/.test(rtcService) && /no operational VoiceCloud browser runtime adapter/.test(rtcService)],
  ['Browser LiveKit loader has pinned multi-origin fallback and browser capability validation',
    /cdn\.jsdelivr\.net\/npm\/livekit-client@2\.22\.0/.test(browserRtc) && /unpkg\.com\/livekit-client@2\.22\.0/.test(browserRtc) && /isBrowserSupported/.test(browserRtc)],
  ['Production CSP authorizes only the explicit LiveKit SDK fallback origins, not wildcard scripts',
    /script-src 'self' https:\/\/cdn\.jsdelivr\.net https:\/\/unpkg\.com/.test(hardening) && !/script-src[^\n]*\*/.test(hardening)],
  ['LiveKit webhook verification uses the exact raw body and signed SHA-256 claim',
    /rawBody:\s*true/.test(main) && /request\.rawBody/.test(controller) && /claims\.sha256/.test(liveKit) && /createHash\('sha256'\)\.update\(rawBody\)/.test(liveKit)],
  ['Operational LiveKit runtime covers token, connectivity, moderation and participant state without fabricated success',
    /verifyConnectivity/.test(liveKit) && /RemoveParticipant/.test(liveKit) && /MutePublishedTrack/.test(liveKit) && /ListParticipants/.test(liveKit)],
  ['Unsupported Agora and ZEGOCLOUD adapters remain fail-closed',
    /will not fabricate provider success/.test(agora) && /will not fabricate provider success/.test(zego)],
  ['Creator Studio and website both enforce the same LiveKit browser-runtime authority',
    /active LiveKit provider/.test(creatorMedia) && /active LiveKit provider/.test(websiteRoom)],
  ['Real local startup preflights schema and gives deterministic fresh-database bootstrap guidance',
    /to_regclass\('public\.users'\)/.test(realStart) && /npm run database:bootstrap/.test(realStart) && /restore that database/.test(realStart)],
  ['Recording capability is reported as unavailable until authoritative LiveKit Egress output is configured',
    /egress_adapter_required/.test(rtcService) && /Egress output\/storage adapter/.test(rtcUi) && /Egress recording is not configured/.test(liveKit)],
];

let passed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} - ${name}`);
  if (ok) passed += 1;
}
console.log(`PH06-R02 RTC runtime source check: ${passed}/${checks.length}`);
if (passed !== checks.length) process.exit(1);
