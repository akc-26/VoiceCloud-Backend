import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const staging = join(root, 'white-label-smoke-staging');
const viteBin = join(root, 'node_modules', 'vite', 'bin', 'vite.js');
const fail = (message) => {
  throw new Error(`White-label propagation check failed: ${message}`);
};

if (!existsSync(viteBin))
  fail('Vite is unavailable; run npm ci --include=dev before this check');

const synthetic = {
  brandName: 'Northstar Live',
  brandSlug: 'northstar-live',
  adminShortName: 'Operations Hub',
  adminWorkspaceLabel: 'Operations Workspace',
  creatorShortName: 'Creator Lounge',
  creatorWorkspaceLabel: 'Creator Network',
  websiteShortName: 'Broadcast Network',
  adminNavigation: '#5b21b6',
  creatorNavigation: '#7c2d12',
  websitePrimary: '#db2777',
  assetMarker: 'WP08-04-06-SYNTHETIC-BRAND',
};

const replaceRequired = (text, from, to, label) => {
  if (!text.includes(from))
    fail(`synthetic brand patch target missing: ${label}`);
  return text.replace(from, to);
};

const copyDirectory = (name) =>
  cpSync(join(root, name), join(staging, name), { recursive: true });

const walkFiles = (directory, extensionPattern) => {
  const files = [];
  const walk = (current) => {
    for (const name of readdirSync(current)) {
      const absolute = join(current, name);
      const info = statSync(absolute);
      if (info.isDirectory()) walk(absolute);
      else if (!extensionPattern || extensionPattern.test(name))
        files.push(absolute);
    }
  };
  walk(directory);
  return files;
};

const buildSurface = (surface) => {
  const config = join(staging, surface, 'vite.config.ts');
  const result = spawnSync(
    process.execPath,
    [viteBin, 'build', '--config', config],
    {
      cwd: staging,
      env: process.env,
      encoding: 'utf8',
      shell: false,
    },
  );
  if (result.status !== 0) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    fail(
      `${surface} synthetic build failed with exit code ${result.status ?? 'unknown'}`,
    );
  }
};

const readBuiltText = (surface) => {
  const out = join(staging, 'dist', surface);
  if (!existsSync(out)) fail(`${surface} synthetic build output is missing`);
  return walkFiles(out, /\.(?:js|html|css)$/i)
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n');
};

const assertContains = (text, value, label) => {
  if (!text.includes(value)) fail(`${label} did not propagate: ${value}`);
};

rmSync(staging, { recursive: true, force: true });
mkdirSync(staging, { recursive: true });

try {
  for (const directory of ['admin', 'creator', 'website', 'shared'])
    copyDirectory(directory);
  for (const file of ['tsconfig.json', 'tsconfig.build.json', 'package.json'])
    cpSync(join(root, file), join(staging, file));

  symlinkSync(
    join(root, 'node_modules'),
    join(staging, 'node_modules'),
    process.platform === 'win32' ? 'junction' : 'dir',
  );

  const brandingPath = join(staging, 'shared', 'branding', 'index.ts');
  let branding = readFileSync(brandingPath, 'utf8');
  branding = replaceRequired(
    branding,
    "const BRAND_NAME = 'VoiceCloud';",
    `const BRAND_NAME = '${synthetic.brandName}';`,
    'brand name',
  );
  branding = replaceRequired(
    branding,
    "const BRAND_SLUG = 'voicecloud';",
    `const BRAND_SLUG = '${synthetic.brandSlug}';`,
    'brand slug',
  );
  branding = replaceRequired(
    branding,
    "shortName: 'Admin Console',",
    `shortName: '${synthetic.adminShortName}',`,
    'Admin product label',
  );
  branding = replaceRequired(
    branding,
    "workspaceLabel: 'Administration Workspace',",
    `workspaceLabel: '${synthetic.adminWorkspaceLabel}',`,
    'Admin workspace label',
  );
  branding = replaceRequired(
    branding,
    "shortName: 'Creator Studio',",
    `shortName: '${synthetic.creatorShortName}',`,
    'Creator product label',
  );
  branding = replaceRequired(
    branding,
    "workspaceLabel: 'Creator Workspace',",
    `workspaceLabel: '${synthetic.creatorWorkspaceLabel}',`,
    'Creator workspace label',
  );
  branding = replaceRequired(
    branding,
    "shortName: 'Live Audio Platform',",
    `shortName: '${synthetic.websiteShortName}',`,
    'Website product label',
  );
  branding = replaceRequired(
    branding,
    "navigationBackground: '#0f5ea8',",
    `navigationBackground: '${synthetic.adminNavigation}',`,
    'Admin navigation color',
  );
  branding = replaceRequired(
    branding,
    "navigationBackground: '#123a32',",
    `navigationBackground: '${synthetic.creatorNavigation}',`,
    'Creator navigation color',
  );
  const brandingEol = branding.includes('\r\n') ? '\r\n' : '\n';
  branding = replaceRequired(
    branding,
    `website: {${brandingEol}      primary: '#2563eb',`,
    `website: {${brandingEol}      primary: '${synthetic.websitePrimary}',`,
    'Website primary color',
  );
  writeFileSync(brandingPath, branding, 'utf8');

  const brandDir = join(staging, 'shared', 'branding', 'public', 'brand');
  for (const name of [
    'logo-mark.svg',
    'logo-horizontal.svg',
    'favicon.svg',
    'app-icon.svg',
  ]) {
    writeFileSync(
      join(brandDir, name),
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" data-brand="${synthetic.assetMarker}" data-asset="${name}"><rect width="64" height="64" rx="12" fill="${synthetic.websitePrimary}"/><title>${synthetic.brandName} ${name}</title></svg>\n`,
      'utf8',
    );
  }

  for (const surface of ['website', 'admin', 'creator']) buildSurface(surface);

  const expectations = {
    admin: [
      synthetic.brandName,
      synthetic.adminShortName,
      synthetic.adminWorkspaceLabel,
      synthetic.adminNavigation,
    ],
    creator: [
      synthetic.brandName,
      synthetic.creatorShortName,
      synthetic.creatorWorkspaceLabel,
      synthetic.creatorNavigation,
    ],
    website: [
      synthetic.brandName,
      synthetic.websiteShortName,
      synthetic.websitePrimary,
    ],
  };

  for (const [surface, values] of Object.entries(expectations)) {
    const builtText = readBuiltText(surface);
    for (const value of values)
      assertContains(builtText, value, `${surface} build`);
    if (builtText.includes('VoiceCloud'))
      fail(`${surface} build retained the original customer-facing brand name`);

    for (const asset of [
      'logo-mark.svg',
      'logo-horizontal.svg',
      'favicon.svg',
      'app-icon.svg',
    ]) {
      const source = readFileSync(join(brandDir, asset));
      const built = join(staging, 'dist', surface, 'brand', asset);
      if (!existsSync(built))
        fail(`${surface} build is missing brand/${asset}`);
      if (!source.equals(readFileSync(built)))
        fail(
          `${surface} brand/${asset} is not byte-identical to centralized asset`,
        );
    }
  }

  console.log('Synthetic white-label propagation check passed.');
  console.log(
    'Admin, Creator and Website consumed alternate identity/product labels/colors and all four centralized brand assets.',
  );
  console.log('The authoritative source tree was not modified.');
} finally {
  rmSync(staging, { recursive: true, force: true });
}
