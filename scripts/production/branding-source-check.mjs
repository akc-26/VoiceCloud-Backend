import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const acceptedCommit = 'f8c4ff1219797d490d35fd909128367abeceeb38';
const acceptedPackageLockSha256 =
  '17bd8cd3c6832e438a51eb0a91bee6b261ed663113c66d328fbf1c0a00dc211a';
const acceptedMigrationHashes = new Map([
  [
    '1700000000000-Phase1ACoreDomainFoundation.ts',
    '9cf5d5efa3febe39dc8ea2555991378cc9f26a644dd65ae6da73f85d1884cb07',
  ],
  [
    '1700000000001-Phase1BWalletFoundation.ts',
    'f129c07a9861dd5da207d5386db716ee0b8d9aa257db1a3700e88e767da84674',
  ],
  [
    '1700000000002-Phase1CCreatorEconomyFoundation.ts',
    '2d875581a51147e0ecdf56cd1f67522f2e9b6419bb8dcccc70e51fc18065db85',
  ],
  [
    '1700000000003-Phase16AuthenticationIdentityPlatform.ts',
    'd237ce666a68dff4b6decaa93f6811bfbaa671d7ed13cd6d66c22f21de4d84fc',
  ],
  [
    '1700000000004-Phase17UserProfileSocialIdentity.ts',
    '65ce2e592bbde425d8d1b693b8a813d67d6be48b0ee732950020ab79cc82b8ad',
  ],
  [
    '1700000000005-Phase17SocialIdentityAndVisitors.ts',
    'd28707e5e5399e01e6418991c744b71192e8c429c75388cbf5695941d1e7729b',
  ],
  [
    '1700000000006-Phase08HostVerificationPrivateAssetStorage.ts',
    'b8de2d7bacf5dea764ddbf44221e3563bb2ec368250c350ea8850494f8607f13',
  ],
  [
    '1700000000007-Phase08HostVerificationLegacyMigrationTracking.ts',
    '9fbdd88c0683af9dcb9da135207fa82964a8c7110548d79d5a7b8fb5ae836a29',
  ],
  [
    '1700000000008-Phase08RoomLifecycleAuthority.ts',
    'c1a55e070551d6c57e6be7eab36456c2aa5bf93917b04018b7095af2775b496a',
  ],
  [
    '1700000000009-Phase08EconomyWalletAuthority.ts',
    'e0e0e543b6b5f13f9facfff671c8626d99fdac249972649c33490e3dc2494837',
  ],
  [
    '1700000000010-Phase08AuthoritativeGiftSettlement.ts',
    'd358528d69bb90f7973074278dc86292456dcd821d78759b8a956488c3393c72',
  ],
  [
    '1700000000011-Phase08CreatorPayoutLifecycle.ts',
    '7c70ef5ed5059a7fce51c97b878639691bad59e2b949be6f52d9224b8af15748',
  ],
  [
    '1700000000012-Phase08HostFinancialAuthority.ts',
    '5fdea6283fd69c95c4890351f486b00a4d1117a83d467e19856c2c797c7e03af',
  ],
  [
    '1700000000013-Phase08RewardsVipNotificationRecovery.ts',
    'fdd97f389cb1e576cd159ed8a06a316c09a294ae52ee9d9cfdb8336105d3a734',
  ],
]);
const protectedFunctionalHashes = new Map([
  [
    'admin/src/routes/AppRoutes.tsx',
    'ea30115d641f0caf486d048730fda489eaf7f1164a2ee1d3970dd60e7b8128a8',
  ],
  [
    'creator/src/routes/AppRoutes.tsx',
    'f8e14dbddc36144bea7e39f8a99d95d28d2207a120debb5c6dae235e982ab00d',
  ],
  [
    'src/hosting/frontend-hosting.ts',
    'c81e542375e11ec98962f320618c125ac6ec5409a6e69f0afdb3e82adc58bf51',
  ],
  [
    'src/modules/auth/auth.service.ts',
    '1bb4811ab1699f911b73000e404d6239f1aef7de5d6991d9a67d16e5afe6841b',
  ],
  [
    'src/modules/wallet/wallet-mutation.service.ts',
    '861dd5459262a00f7925f428937820f577f605e98600f3d6d7b1fccaad30056f',
  ],
  [
    'src/modules/wallet/creator-payout-lifecycle.service.ts',
    '9367db197e84271d4b7200a9ce6f23ac94834fd805390ed34532963839b0ede3',
  ],
  [
    'src/modules/gifts/gift-settlement.service.ts',
    '4a22f44b3bc6ef79fe31c72e71a5d42eba7c41f9194e8db4567afbb347e8623b',
  ],
  [
    'src/modules/hosts/host-financial-authority.service.ts',
    'de8ed556389971009fbe2f5514399a2560a6d29a4e83b22559339fc193e76d76',
  ],
  [
    'src/modules/hosts/host-reward-authority.service.ts',
    'f7771a2137ef0687c3a37f6e09f587b0e73c4fcbdad220773dcf0abc01b6ebfd',
  ],
  [
    'src/modules/vip/vip-financial-authority.service.ts',
    '4569f500b8aa10e299db01583bad3706686877835d1b6b17f63c2ee4dc6c7f8e',
  ],
  [
    'src/modules/tasks-achievements/services/reward-engine.service.ts',
    '26f337f16951ff0e21cc31725871a836491a0ccec9d9048639799ea0db72be34',
  ],
  [
    'src/modules/notifications/notifications.service.ts',
    '4849479de67d0029c22139d2d2a4bf26dfd4d91c061ba8fd768bf19d25f51e00',
  ],
  [
    'src/queue/processors/notification.processor.ts',
    'c40a65a053bc5dbc35bd9cc79bdc35bf5e2dda2188b12d188df7b6b063d14705',
  ],
  [
    'src/queue/processors/gift.processor.ts',
    'ea2176dd82c090e54679ea631cd1d98842c3f60d8a1cee1286530402b31c892e',
  ],
  [
    'src/queue/processors/payout.processor.ts',
    '311fd82a119d1ef9957fef51cfe64de0b473e0a488c69d48d4614cafae8220a4',
  ],
  [
    'src/queue/processors/vip.processor.ts',
    'b1c375fd8c86eeab16e2423dad4513de9ea91c9860d98eaedbe9fb2b1c772ea4',
  ],
  [
    'src/queue/processors/host-reward.processor.ts',
    '62edd098735c7924b5bdaf8070ec5dd7bc261135be57936c064aa2238d8379a3',
  ],
  [
    'src/queue/processors/host-earnings.processor.ts',
    'fca6c21e97b9989bee7f9d447289ee684fb288aa7673989a2fb5dff2ec511629',
  ],
  [
    'src/queue/processors/tasks.processor.ts',
    '87bad8ca38769e05f43e0821a15820859718d2a422bd8e223ec2af796b439f9c',
  ],
  [
    'src/queue/scheduler/queue-scheduler.service.ts',
    '5fec9036052990ec56223c610995e7d868271f63b6634c476a00d5622eda00a1',
  ],
]);

function fail(message) {
  throw new Error(`Production branding/source check failed: ${message}`);
}
function read(relativePath) {
  const absolute = join(root, relativePath);
  if (!existsSync(absolute)) fail(`missing required file: ${relativePath}`);
  return readFileSync(absolute, 'utf8');
}
function sha256(relativePath) {
  return createHash('sha256')
    .update(readFileSync(join(root, relativePath)))
    .digest('hex');
}

if (sha256('package-lock.json') !== acceptedPackageLockSha256) {
  fail('package-lock.json changed from the accepted baseline');
}
for (const [file, expected] of acceptedMigrationHashes) {
  const relativePath = `src/database/migrations/${file}`;
  if (sha256(relativePath) !== expected)
    fail(`accepted migration changed: ${file}`);
}
for (const [relativePath, expected] of protectedFunctionalHashes) {
  if (sha256(relativePath) !== expected)
    fail(`protected functional surface changed: ${relativePath}`);
}

for (const required of [
  'scripts/production/ui-foundation-typecheck.mjs',
  'shared/branding/index.ts',
  'shared/branding/README.md',
  'shared/branding/public/brand/logo-mark.svg',
  'shared/branding/public/brand/logo-horizontal.svg',
  'shared/branding/public/brand/favicon.svg',
  'shared/branding/public/brand/app-icon.svg',
  'docs/production/PRODUCTION-SOURCE-BRANDING-AUDIT.md',
  'docs/production/WHITE-LABEL-GUIDE.md',
])
  read(required);

const typecheckRunner = read('scripts/production/ui-foundation-typecheck.mjs');
if (typecheckRunner.includes('tsc.cmd')) {
  fail('frontend typecheck runner directly spawns tsc.cmd');
}
if (!typecheckRunner.includes('process.execPath')) {
  fail('frontend typecheck runner does not use the current Node executable');
}
if (!typecheckRunner.includes('node_modules/typescript/bin/tsc')) {
  fail(
    'frontend typecheck runner does not use the repository-local TypeScript CLI',
  );
}

const creatorTsconfig = read('creator/tsconfig.json');
if (!creatorTsconfig.includes('"vite/client"')) {
  fail('Creator TypeScript configuration does not include Vite client types');
}

for (const app of ['admin', 'creator', 'website']) {
  const vite = read(`${app}/vite.config.ts`);
  if (
    !vite.includes(
      "publicDir: path.resolve(__dirname, '../shared/branding/public')",
    )
  ) {
    fail(`${app} does not consume the shared brand asset directory`);
  }
  if (!vite.includes("'@shared/branding'")) {
    fail(`${app} is missing the shared branding Vite alias`);
  }
  const tsconfig = read(`${app}/tsconfig.json`);
  if (!tsconfig.includes('"@shared/branding"')) {
    fail(`${app} is missing the shared branding TypeScript alias`);
  }
  const html = read(`${app}/index.html`);
  if (!html.includes('href="./brand/favicon.svg"')) {
    fail(`${app} does not use the centrally managed favicon`);
  }
  const main = read(`${app}/src/main.tsx`);
  if (!main.includes('document.title = BRAND_CONFIG.products.')) {
    fail(`${app} does not apply its configured document title`);
  }
}

const discardedDevelopmentToolLabel = new RegExp(
  ['AI', 'Studio'].join('\\s+'),
  'i',
);
const forbiddenUiPatterns = [
  /VC-PH/i,
  /WP08/i,
  /Phase\s+\d+/i,
  /Authentication Entry/i,
  /Foundation Ready/i,
  discardedDevelopmentToolLabel,
];
for (const appRoot of ['admin/src', 'creator/src', 'website/src']) {
  const walk = (directory) => {
    for (const name of readdirSync(directory)) {
      const absolute = join(directory, name);
      const info = statSync(absolute);
      if (info.isDirectory()) {
        walk(absolute);
        continue;
      }
      if (!/\.(ts|tsx|css)$/.test(name)) continue;
      const text = readFileSync(absolute, 'utf8');
      for (const pattern of forbiddenUiPatterns) {
        if (pattern.test(text)) {
          fail(
            `${relative(root, absolute)} contains production-facing development text (${pattern})`,
          );
        }
      }
    }
  };
  walk(join(root, appRoot));
}

const legacyCreatorGridBreakpoint = /<Grid\b[^>]*\s(?:xs|sm|md|lg|xl)=/;
{
  const walk = (directory) => {
    for (const name of readdirSync(directory)) {
      const absolute = join(directory, name);
      const info = statSync(absolute);
      if (info.isDirectory()) {
        walk(absolute);
        continue;
      }
      if (!/\.tsx$/.test(name)) continue;
      if (legacyCreatorGridBreakpoint.test(readFileSync(absolute, 'utf8'))) {
        fail(
          `${relative(root, absolute)} still uses removed MUI Grid breakpoint props`,
        );
      }
    }
  };
  walk(join(root, 'creator/src'));
}

for (const file of ['README.md', '.gitignore']) {
  if (discardedDevelopmentToolLabel.test(read(file)))
    fail(`${file} still contains discarded vendor scaffold wording`);
}

const adminRoutes = read('admin/src/routes/AppRoutes.tsx');
for (const route of [
  '/dashboard',
  '/users',
  '/rooms',
  '/wallet',
  '/gifts',
  '/vip',
  '/hosts',
  '/rankings',
  '/tasks-achievements',
  '/store',
  '/referrals',
  '/reports',
  '/moderation',
  '/announcements',
  '/notifications',
  '/messaging',
  '/rtc',
  '/cms',
  '/feature-flags',
  '/provider-configs',
  '/providers',
  '/backups',
  '/auth-management',
  '/system-settings',
  '/app-versions',
  '/audit-logs',
  '/analytics',
  '/support',
  '/profile',
]) {
  if (!adminRoutes.includes(`path="${route}"`))
    fail(`Admin route disappeared: ${route}`);
}
const creatorRoutes = read('creator/src/routes/AppRoutes.tsx');
for (const route of [
  '/dashboard',
  '/analytics',
  '/rooms',
  '/schedule',
  '/audience',
  '/followers',
  '/subscribers',
  '/wallet',
  '/earnings',
  '/gifts',
  '/payout-requests',
  '/notifications',
  '/profile',
  '/verification',
  '/settings',
  '/help',
]) {
  if (!creatorRoutes.includes(`path="${route}"`))
    fail(`Creator route disappeared: ${route}`);
}

console.log('Production source & white-label foundation check passed.');
console.log(`Accepted baseline commit: ${acceptedCommit}`);
console.log('All 14 accepted migration files remain byte-identical.');
console.log(
  `${protectedFunctionalHashes.size} protected functional surfaces remain byte-identical.`,
);
console.log('package-lock.json remains byte-identical.');
console.log(
  'Admin/Creator/Website share one brand configuration and asset directory.',
);
console.log(
  'Customer-facing web source contains no roadmap/phase/vendor-scaffold labels.',
);
console.log(
  'Creator TypeScript source uses MUI v9 Grid sizing and Vite client typing.',
);
console.log('Accepted Admin and Creator route surfaces are preserved.');
