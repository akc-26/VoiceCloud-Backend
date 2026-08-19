import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const baselineBranch = 'VoiceCloud-Backend-VC-PH08-WP08-03-03-R02';
const baselineCommit = '3a34b62e99189ee637819fbc2ab11f239eb0dde3';
const acceptedPackageLockSha256 = '17bd8cd3c6832e438a51eb0a91bee6b261ed663113c66d328fbf1c0a00dc211a';

const acceptedMigrationHashes = new Map([
  ['1700000000000-Phase1ACoreDomainFoundation.ts', '9cf5d5efa3febe39dc8ea2555991378cc9f26a644dd65ae6da73f85d1884cb07'],
  ['1700000000001-Phase1BWalletFoundation.ts', 'f129c07a9861dd5da207d5386db716ee0b8d9aa257db1a3700e88e767da84674'],
  ['1700000000002-Phase1CCreatorEconomyFoundation.ts', '2d875581a51147e0ecdf56cd1f67522f2e9b6419bb8dcccc70e51fc18065db85'],
  ['1700000000003-Phase16AuthenticationIdentityPlatform.ts', 'd237ce666a68dff4b6decaa93f6811bfbaa671d7ed13cd6d66c22f21de4d84fc'],
  ['1700000000004-Phase17UserProfileSocialIdentity.ts', '65ce2e592bbde425d8d1b693b8a813d67d6be48b0ee732950020ab79cc82b8ad'],
  ['1700000000005-Phase17SocialIdentityAndVisitors.ts', 'd28707e5e5399e01e6418991c744b71192e8c429c75388cbf5695941d1e7729b'],
  ['1700000000006-Phase08HostVerificationPrivateAssetStorage.ts', 'b8de2d7bacf5dea764ddbf44221e3563bb2ec368250c350ea8850494f8607f13'],
  ['1700000000007-Phase08HostVerificationLegacyMigrationTracking.ts', '9fbdd88c0683af9dcb9da135207fa82964a8c7110548d79d5a7b8fb5ae836a29'],
  ['1700000000008-Phase08RoomLifecycleAuthority.ts', 'c1a55e070551d6c57e6be7eab36456c2aa5bf93917b04018b7095af2775b496a'],
  ['1700000000009-Phase08EconomyWalletAuthority.ts', 'e0e0e543b6b5f13f9facfff671c8626d99fdac249972649c33490e3dc2494837'],
  ['1700000000010-Phase08AuthoritativeGiftSettlement.ts', 'd358528d69bb90f7973074278dc86292456dcd821d78759b8a956488c3393c72'],
  ['1700000000011-Phase08CreatorPayoutLifecycle.ts', '7c70ef5ed5059a7fce51c97b878639691bad59e2b949be6f52d9224b8af15748'],
  ['1700000000012-Phase08HostFinancialAuthority.ts', '5fdea6283fd69c95c4890351f486b00a4d1117a83d467e19856c2c797c7e03af'],
  ['1700000000013-Phase08RewardsVipNotificationRecovery.ts', 'fdd97f389cb1e576cd159ed8a06a316c09a294ae52ee9d9cfdb8336105d3a734'],
]);

function fail(message) {
  throw new Error(`WP08-03-04 self-check failed: ${message}`);
}
function read(path) {
  const absolute = join(root, path);
  if (!existsSync(absolute)) fail(`required file is missing: ${path}`);
  return readFileSync(absolute, 'utf8');
}
function expectText(path, ...needles) {
  const text = read(path);
  for (const needle of needles) {
    if (!text.includes(needle)) fail(`${path} is missing required contract text: ${needle}`);
  }
  return text;
}
function rejectText(path, ...needles) {
  const text = read(path);
  for (const needle of needles) {
    if (text.includes(needle)) fail(`${path} contains forbidden/stale contract text: ${needle}`);
  }
}

const lockHash = createHash('sha256').update(readFileSync(join(root, 'package-lock.json'))).digest('hex');
if (lockHash !== acceptedPackageLockSha256) {
  fail(`package-lock.json changed from accepted WP08 baseline (${lockHash})`);
}

for (const [name, expectedHash] of acceptedMigrationHashes) {
  const migrationPath = join(root, 'src/database/migrations', name);
  if (!existsSync(migrationPath)) fail(`accepted migration is missing: ${name}`);
  const actualHash = createHash('sha256').update(readFileSync(migrationPath)).digest('hex');
  if (actualHash !== expectedHash) fail(`accepted migration changed: ${name}`);
}

expectText(
  'creator/src/services/creator-api.service.ts',
  "'/wallet/summary'",
  '/wallet/transactions',
  "'/creator/earnings'",
  "'/creator/payout-requests'",
  "'/notifications/unread-count'",
  "'/notifications/read-all'",
);
expectText('creator/src/pages/WalletPage.tsx', 'PAYOUT_USD_PER_DIAMOND = 0.005', 'MINIMUM_PAYOUT_DIAMONDS = 100');
expectText('creator/src/pages/PayoutRequestsPage.tsx', 'PAYOUT_USD_PER_DIAMOND = 0.005', 'MINIMUM_PAYOUT_DIAMONDS = 100');
rejectText('creator/src/pages/WalletPage.tsx', '10000', '0.01');
rejectText('creator/src/pages/PayoutRequestsPage.tsx', '10000', '0.01');
expectText(
  'creator/src/pages/NotificationsPage.tsx',
  'value="system"',
  'value="gift"',
  'value="vip"',
  'value="announcement"',
  'value="room_invitation"',
);
rejectText(
  'creator/src/pages/NotificationsPage.tsx',
  'value="subscription"',
  'value="payout"',
);
const creatorWalletPage = read('creator/src/pages/WalletPage.tsx');
const statusHeaderCount = (creatorWalletPage.match(/<TableCell>Status<\/TableCell>/g) || []).length;
if (statusHeaderCount !== 1) {
  fail(`creator Wallet ledger must contain exactly one Status column header; found ${statusHeaderCount}`);
}
expectText(
  'creator/src/pages/DashboardPage.tsx',
  'walletData?.wallet?.diamondBalance',
  'walletData?.wallet?.coinBalance',
  'walletData?.wallet?.withdrawableBalance',
  'dashboardData?.earningsSummary?.pendingPayouts',
  'dashboardData?.earningsSummary?.lifetimeEarnings',
);
rejectText(
  'creator/src/pages/DashboardPage.tsx',
  'walletData?.balance?',
  'walletData?.availableBalanceUsd',
  'walletData?.pendingPayoutsUsd',
  'walletData?.lifetimeEarningsUsd',
);
expectText(
  'creator/src/store/notification.store.ts',
  'const initialNotifications: CreatorNotification[] = [];',
  'state.unreadCount - (target && !target.read ? 1 : 0)',
);
rejectText(
  'creator/src/store/notification.store.ts',
  'notif-1',
  'New VIP Subscription',
  'Dragon Castle',
);
expectText(
  'creator/src/components/layout/CreatorTopBar.tsx',
  'useCreatorNotifications();',
  'creatorApi.markAllNotificationsRead()',
  'creatorApi.markNotificationRead(notificationId)',
  "queryKey: ['creator', 'notifications']",
);
rejectText(
  'creator/src/components/layout/CreatorTopBar.tsx',
  'onClick={markAllAsRead}',
);
expectText(
  'creator/src/hooks/useCreatorDashboard.ts',
  "type: (n.type as CreatorNotification['type']) || 'SYSTEM'",
);

expectText(
  'admin/src/services/economy.service.ts',
  "'/admin/wallet/overview'",
  "'/admin/wallet/transactions'",
  "'/admin/wallet/creator/payouts'",
);
expectText(
  'admin/src/services/gifts.service.ts',
  "'/gifts/admin/catalog'",
  "'/gifts/admin/categories'",
  "'/gifts/analytics/revenue'",
);
expectText(
  'admin/src/services/notifications-admin.service.ts',
  "'/notifications/admin/delivery-log'",
  "'/notifications/admin'",
);
rejectText('admin/src/pages/VipPage.tsx', '.catch(() =>', '/* ignore */');
rejectText('admin/src/pages/GiftsPage.tsx', 'gift-1', 'cat-1', 'Save Combo Rules');

expectText(
  'src/modules/gifts/gifts.controller.ts',
  "@Get('admin/catalog')",
  "@Get('admin/categories')",
  '@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)',
);
expectText(
  'src/modules/gifts/gifts.service.ts',
  'async getAdminCatalog()',
  'async getAdminCategories()',
);
expectText(
  'src/modules/notifications/notifications.controller.ts',
  "@Get('admin/delivery-log')",
  '@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)',
);
expectText('src/modules/notifications/notifications.service.ts', 'async getAdminNotifications(');
expectText(
  'src/common/events/events.gateway.ts',
  'this.server?.to(`user:${userId}`).emit(event, payload);',
);
read('src/common/events/notification-realtime-isolation.spec.ts');
expectText(
  'scripts/wp08/wp08-03-04-real-infrastructure.mjs',
  "expectNoEvent(adminSocket, 'notification:new')",
  'non-target Admin socket received nothing',
);

expectText(
  'src/database/data-source.ts',
  "migrations: [path.join(__dirname, 'migrations/[0-9]*{.ts,.js}')],",
);
rejectText(
  'src/database/data-source.ts',
  "migrations: [path.join(__dirname, 'migrations/*{.ts,.js}')],",
);
read('src/database/typeorm-migration-discovery.spec.ts');

for (const test of [
  'src/modules/gifts/admin-gift-catalog.spec.ts',
  'src/modules/notifications/admin-notification-delivery.spec.ts',
]) read(test);
for (const script of [
  'scripts/wp08/wp08-03-04-real-infrastructure.mjs',
  'scripts/wp08/wp08-03-04-real-check.ps1',
  'scripts/wp08/wp08-03-04-schema-bootstrap.mjs',
]) read(script);
expectText(
  'scripts/wp08/wp08-03-04-schema-bootstrap.mjs',
  "^voicecloud_wp08_03_04_\\d{17}$",
  'await dataSource.synchronize(false);',
  'Phase08RoomLifecycleAuthority1700000000008',
  'Ready for migrations 1700000000009 through 1700000000013.',
);
expectText(
  'scripts/wp08/wp08-03-04-real-check.ps1',
  "wp08-03-04-schema-bootstrap.mjs",
  'applying compiled WP08 authority migrations',
);
rejectText(
  'scripts/wp08/wp08-03-04-real-check.ps1',
  'schema will be created only through migrations',
);

const migrations = readdirSync(join(root, 'src/database/migrations'));
if (migrations.some((name) => /^1700000000014-/.test(name))) {
  fail('WP08-03-04 unexpectedly introduced a schema migration; this package is UI/read integration only');
}

console.log('WP08-03-04 consolidated UI/real-infrastructure self-check passed.');
console.log(`Baseline branch: ${baselineBranch}`);
console.log(`Baseline commit: ${baselineCommit}`);
console.log('Creator/Admin economy surfaces use real persisted APIs and accepted payout constants.');
console.log('Admin gift/notification visibility is additive and read-only; no schema migration was introduced.');
console.log('Real acceptance uses an isolated current-schema bootstrap, then replays WP08 authority migrations 0009-0013 before PostgreSQL/Redis/BullMQ/Socket.IO runtime checks.');
console.log('All 14 accepted historical migration source files remain byte-identical.');
console.log('package-lock.json remains byte-identical to the accepted WP08 baseline.');
