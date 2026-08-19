import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'website/src/branding/index.ts',
  'website/src/api/client.ts',
  'website/src/api/query-client.ts',
  'website/src/auth/auth.store.ts',
  'website/src/realtime/socket.client.ts',
  'website/src/app/providers/AppProviders.tsx',
  'website/src/app/router/AppRouter.tsx',
  'website/src/components/layout/WebsiteHeader.tsx',
  'website/src/pages/HomeFoundationPage.tsx',
  'website/src/styles/global.css',
];

const errors = [];
for (const relative of required) {
  if (!fs.existsSync(path.join(root, relative))) errors.push(`Missing ${relative}`);
}

const branding = fs.readFileSync(path.join(root, 'website/src/branding/index.ts'), 'utf8');
for (const token of ['logoHorizontal','sapphire','gradients','radii','shadows','installWebsiteBrand']) {
  if (!branding.includes(token)) errors.push(`Website branding adapter missing ${token}`);
}
if (/#[0-9a-fA-F]{3,8}/.test(branding)) {
  errors.push('Website branding adapter contains hard-coded colour values; keep them in shared/branding/index.ts');
}

const css = fs.readFileSync(path.join(root, 'website/src/styles/global.css'), 'utf8');
if (!css.includes('var(--vc-sapphire)')) errors.push('Global CSS is not consuming central website CSS variables');
if (!css.includes('prefers-reduced-motion')) errors.push('Reduced-motion accessibility rule is missing');

const vite = fs.readFileSync(path.join(root, 'website/vite.config.ts'), 'utf8');
if (!vite.includes("'/socket.io'")) errors.push('Website dev proxy is missing /socket.io WebSocket forwarding');

const sharedBranding = fs.readFileSync(path.join(root, 'shared/branding/index.ts'), 'utf8');
if (!sharedBranding.includes("primary: '#536DFE'")) errors.push('Shared website presentation colour is not Royal Sapphire');
if (!sharedBranding.includes('presentation: {')) errors.push('Shared branding is missing centralized website presentation tokens');
if (!sharedBranding.includes('websiteDisplayFontFamily')) errors.push('Shared branding is missing website display typography');
if (!sharedBranding.includes("admin: {")) errors.push('Admin branding block must remain present');
if (!sharedBranding.includes("creator: {")) errors.push('Creator branding block must remain present');

if (errors.length) {
  console.error('[FAIL] VC-WEB-PH01 source check');
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}

console.log('[PASS] VC-WEB-PH01 source check');
console.log(' - centralized website branding present');
console.log(' - React providers/router/auth/API/realtime foundations present');
console.log(' - Royal Sapphire shell consumes brand variables');
console.log(' - /socket.io development proxy enabled');
console.log(' - Admin and Creator branding authorities preserved');
