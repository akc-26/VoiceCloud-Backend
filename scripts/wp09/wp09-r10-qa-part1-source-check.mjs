import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const has = (p, re) => re.test(read(p));
const lacks = (p, re) => !re.test(read(p));

const checks = [
  ['QA01-admin-real-data-no-known-mocks', () => {
    const files = ['admin/src/pages/RoomsPage.tsx','admin/src/pages/ReferralPage.tsx','admin/src/pages/AnnouncementsPage.tsx','admin/src/pages/ReportsPage.tsx','admin/src/pages/ModerationPage.tsx','admin/src/pages/AuditLogsPage.tsx','admin/src/pages/FeatureFlagsPage.tsx','admin/src/pages/AppVersionsPage.tsx','admin/src/pages/CmsPage.tsx','admin/src/pages/AnalyticsPage.tsx'];
    const banned = /(Late Night Chill|Summer Referral Festival|Scheduled Platform System Upgrade v2\.0|Room #102|vip_mike|act-1|rep-1|ann-1|cmp-101|12400|19500|SVGA Luxury Cars)/;
    return files.every((f)=>lacks(f,banned)) && has('admin/src/pages/RoomsPage.tsx',/roomsService\.getRooms/);
  }],
  ['QA02-admin-rooms-real-list-and-detail', () => has('src/modules/admin/admin.controller.ts',/@Get\('rooms'\)[\s\S]*findAllAdmin/) && has('src/modules/admin/admin.controller.ts',/@Get\('rooms\/:id'\)[\s\S]*findOneAdmin/) && has('admin/src/routes/AppRoutes.tsx',/path="\/rooms\/:id"/) ],
  ['QA03-room-public-private-authority', () => has('src/modules/rooms/dto/create-room.dto.ts',/isPrivate/) && has('src/modules/rooms/rooms.service.ts',/room\.isInviteOnly = isPrivate|isInviteOnly:\s*isPrivate/) && has('creator/src/pages/LiveRoomsPage.tsx',/isPrivate/) ],
  ['QA04-admin-rooms-pagination', () => has('admin/src/pages/RoomsPage.tsx',/<Pagination/) && has('src/modules/rooms/rooms.service.ts',/skip\(skip\)\.take\(limit\)/) ],
  ['QA05-global-badge-edit-delete', () => has('src/modules/admin/admin.controller.ts',/@Patch\('badges\/:id'\)/) && has('src/modules/admin/admin.controller.ts',/@Delete\('badges\/:id'\)/) && has('admin/src/pages/UsersPage.tsx',/handleSaveBadge/) && has('admin/src/pages/UsersPage.tsx',/handleDeleteBadge/) ],
  ['QA06-admin-create-user-standard-creator', () => has('src/modules/users/dto/admin-user-management.dto.ts',/class AdminCreateUserDto/) && has('src/modules/admin/admin.controller.ts',/@Post\('users'\)/) && has('admin/src/pages/UsersPage.tsx',/createUserOpen/) && has('admin/src/pages/UsersPage.tsx',/'CREATOR'/) ],
  ['QA07-super-admin-hidden', () => has('src/modules/admin/admin-users.service.ts',/role != :superAdminRole/) && has('src/modules/admin/admin-users.service.ts',/UserRole\.SUPER_ADMIN/) ],
  ['QA08-user-full-detail-page', () => fs.existsSync(path.join(root,'admin/src/pages/UserDetailPage.tsx')) && has('admin/src/routes/AppRoutes.tsx',/path="\/users\/:id"/) ],
  ['QA09-user-role-filter', () => has('src/modules/admin/dto/query-admin-users.dto.ts',/role\?: string/) && has('src/modules/admin/admin-users.service.ts',/query\.role/) && has('admin/src/pages/UsersPage.tsx',/roleFilter/) ],
  ['QA10-admin-password-reset', () => has('src/modules/admin/admin.controller.ts',/@Post\('users\/:id\/reset-password'\)/) && has('src/modules/admin/admin-users.service.ts',/bcrypt\.hash\(dto\.password, 12\)/) && has('admin/src/pages/UserDetailPage.tsx',/resetPassword/) ],
  ['QA11-guest-users-hidden', () => has('src/modules/admin/admin-users.service.ts',/user\.isGuest = :isGuest/) ],
  ['QA12-visitor-human-names', () => has('src/modules/users/visitors.service.ts',/targetUserName/) && has('src/modules/users/visitors.service.ts',/visitorUserName/) && has('admin/src/pages/UsersPage.tsx',/targetUserName/) ],
  ['QA13-host-bonus-wallet-settlement', () => has('src/modules/hosts/hosts.service.ts',/hostRewardAuthorityService\.claim/) && has('src/modules/hosts/hosts.service.ts',/REWARD_GRANTED_AND_SETTLED/) ],
  ['QA14-host-human-names-and-view', () => has('src/modules/hosts/hosts.service.ts',/userName:/) && has('admin/src/pages/HostsPage.tsx',/navigate\(`\/users\/\$\{row\.userId\}`\)/) ],
  ['QA15-host-search-pagination', () => has('admin/src/pages/HostsPage.tsx',/<SearchBar/) && has('admin/src/pages/HostsPage.tsx',/<Pagination/) ],
  ['QA16-auth-settings-patch-and-single-save', () => has('admin/src/services/admin.service.ts',/api\.patch\(`\/admin\/settings\/\$\{key\}`/) && lacks('admin/src/pages/AuthManagementPage.tsx',/api\.put\(`\/admin\/settings/) && has('admin/src/pages/AuthManagementPage.tsx',/Promise\.all/) ],
  ['QA17-auth-human-history-and-user-view', () => has('src/modules/admin/admin.controller.ts',/@Get\('auth\/history'\)/) && has('src/modules/admin/admin-users.service.ts',/getAuthenticationHistory/) && has('admin/src/pages/AuthManagementPage.tsx',/userName/) && has('admin/src/pages/AuthManagementPage.tsx',/navigate\(`\/users\//) ],
  ['QA18-wallet-detail-pages', () => fs.existsSync(path.join(root,'admin/src/pages/WalletTransactionDetailPage.tsx')) && fs.existsSync(path.join(root,'admin/src/pages/WalletPayoutDetailPage.tsx')) && has('admin/src/routes/AppRoutes.tsx',/wallet\/transactions\/:id/) && has('admin/src/routes/AppRoutes.tsx',/wallet\/payouts\/:id/) ],
  ['QA19-wallet-human-list-ids-detail-only', () => has('admin/src/pages/WalletPage.tsx',/userName|creatorName/) && has('admin/src/pages/WalletTransactionDetailPage.tsx',/Transaction ID/) && has('admin/src/pages/WalletPayoutDetailPage.tsx',/Request ID|Payout ID/) ],
  ['QA20-wallet-search-method-filter', () => has('admin/src/pages/WalletPage.tsx',/const \[method, setMethod\]/) && has('admin/src/pages/WalletPage.tsx',/PAYPAL/) && has('src/modules/wallet/dto/ledger-query.dto.ts',/method\?: string/) && has('src/modules/wallet/creator-payout-lifecycle.service.ts',/payoutMethod/) ],
  ['QA21-creator-room-privacy-ui', () => has('creator/src/pages/LiveRoomsPage.tsx',/Public|PRIVATE|Private/) && has('creator/src/services/creator-api.service.ts',/isPrivate/) ],
  ['QA22-ended-room-restart-new-session', () => has('src/modules/rooms/rooms.service.ts',/RoomLifecycleStatus\.ENDED/) && has('src/modules/rooms/rooms.service.ts',/this\.roomRepository\.create\(/) && has('src/modules/rooms/rooms.service.ts',/return this\.startRoom\(savedRestart\.id, userId\)/) ],
];

let passed = 0;
for (const [name, fn] of checks) {
  let ok = false;
  try { ok = Boolean(fn()); } catch { ok = false; }
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (ok) passed++;
}
console.log(`WP09 R10 QA Part 1 source check: ${passed}/${checks.length}`);
if (passed !== checks.length) process.exit(1);
