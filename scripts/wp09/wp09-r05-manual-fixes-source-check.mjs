import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (path) => readFileSync(join(root, path), 'utf8');
const failures = [];
const assert = (condition, message) => {
  if (!condition) failures.push(message);
  else console.log(`PASS ${message}`);
};

const rtcPage = read('admin/src/pages/RtcPage.tsx');
assert(
  rtcPage.includes('adminService.getProviderConfigs()') &&
    rtcPage.includes('adminService.getRtcMonitoringStats()'),
  'rtc-page-loads-persisted-provider-and-monitoring',
);
assert(
  rtcPage.includes('adminService.setActiveProviderConfig(providerConfig.id)') &&
    !rtcPage.includes("setActiveProvider(provider);\n    setStats"),
  'rtc-page-switch-is-persisted-not-local-only',
);

const adminProviderService = read('src/modules/admin/admin-providers.service.ts');
assert(
  adminProviderService.includes('this.providerRepo.manager.transaction') &&
    adminProviderService.includes('manager.getRepository(RtcConfig)') &&
    adminProviderService.includes('rtcConfig.activeProvider = providerType'),
  'rtc-provider-activation-atomically-syncs-runtime-config',
);
assert(
  adminProviderService.includes('providerConfig.appCertificate') &&
    adminProviderService.includes('providerConfig.apiSecret') &&
    adminProviderService.includes('providerConfig.serverSecret'),
  'rtc-provider-activation-syncs-provider-credentials',
);

const liveRoomsPage = read('creator/src/pages/LiveRoomsPage.tsx');
const createBlock = liveRoomsPage.slice(
  liveRoomsPage.indexOf('const handleCreate = () =>'),
  liveRoomsPage.indexOf('if (roomsQuery.isLoading)'),
);
assert(
  createBlock.includes('title,') &&
    createBlock.includes('category: newCategory') &&
    createBlock.includes('audioQuality: newQuality') &&
    !createBlock.includes("status: 'offline'") &&
    !createBlock.includes('currentListeners:') &&
    !createBlock.includes('peakListeners:'),
  'creator-room-create-payload-matches-backend-dto',
);
assert(
  liveRoomsPage.includes('createMutation.isError') &&
    liveRoomsPage.includes('createMutation.error.message'),
  'creator-room-create-displays-backend-error',
);

const creatorApi = read('creator/src/services/creator-api.service.ts');
assert(
  creatorApi.includes('data: CreateLiveRoomInput') &&
    creatorApi.includes('r.listenerCount'),
  'creator-room-api-contract-and-listener-mapping-corrected',
);

if (failures.length) {
  throw new Error(`WP09 R05 manual fixes source check failed: ${failures.join(', ')}`);
}
console.log(`WP09 R05 manual fixes source check passed: 7/7`);
