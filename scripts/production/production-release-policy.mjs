export const RELEASE_ID = 'VC-PH08-WP08-04-05';
export const ACCEPTED_PARENT_BRANCH =
  'VoiceCloud-Backend-VC-PH08-WP08-04-04-R03';
export const ACCEPTED_PARENT_COMMIT =
  '9f64631803be9f6ec70cf66a48e353998a2e6fbf';
export const PROTECTED_PACKAGE_LOCK_SHA256 =
  '17bd8cd3c6832e438a51eb0a91bee6b261ed663113c66d328fbf1c0a00dc211a';

export const RELEASE_ROOT = '.release/wp08-04-05';
export const SOURCE_FOLDER_NAME = 'VoiceCloud-Production-Source';
export const RUNTIME_FOLDER_NAME = 'VoiceCloud-Production-Runtime';
export const SOURCE_ZIP_NAME = `${SOURCE_FOLDER_NAME}.zip`;
export const RUNTIME_ZIP_NAME = `${RUNTIME_FOLDER_NAME}.zip`;

export const SOURCE_ROOT_FILES = [
  '.env.example',
  '.gitattributes',
  'nest-cli.json',
  'package-lock.json',
  'tsconfig.build.json',
  'tsconfig.json',
];

export const SOURCE_ROOT_DIRECTORIES = [
  'admin',
  'creator',
  'shared',
  'src',
  'website',
];

export const SOURCE_OPERATIONAL_SCRIPTS = ['scripts/start-production.mjs'];

export const RELEASE_DOCUMENTS = [
  'docs/production/WHITE-LABEL-GUIDE.md',
  'docs/production/PRODUCTION-DEPLOYMENT-GUIDE.md',
];

export const SOURCE_EXCLUDED_PATH_PATTERNS = [
  /(^|\/)\.git(?:\/|$)/i,
  /(^|\/)node_modules(?:\/|$)/i,
  /(^|\/)dist(?:\/|$)/i,
  /(^|\/)build(?:\/|$)/i,
  /(^|\/)coverage(?:\/|$)/i,
  /(^|\/)uploads(?:\/|$)/i,
  /(^|\/)private[_-]?uploads(?:\/|$)/i,
  /(^|\/)\.cache(?:\/|$)/i,
  /(^|\/)\.release(?:\/|$)/i,
  /(^|\/)\.idea(?:\/|$)/i,
  /(^|\/)\.vscode(?:\/|$)/i,
  /(^|\/)docs\/wp08(?:\/|$)/i,
  /(^|\/)scripts\/wp08(?:\/|$)/i,
  /(^|\/)src\/wp08(?:\/|$)/i,
  /(^|\/)test(?:\/|$)/i,
  /\.spec\.[cm]?[jt]sx?$/i,
  /\.test\.[cm]?[jt]sx?$/i,
  /(^|\/)README-backup\.md$/i,
  /(^|\/)[^/]*\.zip$/i,
  /(^|\/)[^/]*\.7z$/i,
  /(^|\/)[^/]*\.tar(?:\.gz)?$/i,
  /(^|\/)[^/]*\.log$/i,
  /(^|\/)[^/]*\.tsbuildinfo$/i,
  /(^|\/)\.env$/i,
  /(^|\/)\.env\.(?!example$)[^/]+$/i,
];

export const RUNTIME_EXCLUDED_PATH_PATTERNS = [
  ...SOURCE_EXCLUDED_PATH_PATTERNS,
  /\.map$/i,
  /\.d\.[cm]?ts$/i,
];

export const ALWAYS_FORBIDDEN_PACKAGE_PATTERNS = [
  /(^|\/)\.git(?:\/|$)/i,
  /(^|\/)node_modules(?:\/|$)/i,
  /(^|\/)coverage(?:\/|$)/i,
  /(^|\/)uploads(?:\/|$)/i,
  /(^|\/)private[_-]?uploads(?:\/|$)/i,
  /(^|\/)\.cache(?:\/|$)/i,
  /(^|\/)\.release(?:\/|$)/i,
  /(^|\/)\.idea(?:\/|$)/i,
  /(^|\/)\.vscode(?:\/|$)/i,
  /(^|\/)\.env$/i,
  /(^|\/)\.env\.(?!example$)[^/]+$/i,
  /(^|\/)[^/]*\.log$/i,
  /(^|\/)[^/]*\.zip$/i,
  /(^|\/)[^/]*\.7z$/i,
  /(^|\/)[^/]*\.tar(?:\.gz)?$/i,
  /(^|\/)[^/]*\.sql$/i,
  /(^|\/)[^/]*\.dump$/i,
  /(^|\/)(?:id_rsa|id_ed25519)(?:\.|$)/i,
  /(^|\/)[^/]*(?:service-account|credentials)[^/]*\.json$/i,
  /(^|\/)[^/]*\.(?:pem|key|p12|pfx)$/i,
];

export const SOURCE_PACKAGE_FORBIDDEN_PATTERNS = [
  ...ALWAYS_FORBIDDEN_PACKAGE_PATTERNS,
  /(^|\/)docs\/wp08(?:\/|$)/i,
  /(^|\/)scripts\/wp08(?:\/|$)/i,
  /(^|\/)src\/wp08(?:\/|$)/i,
  /(^|\/)test(?:\/|$)/i,
  /\.spec\.[cm]?[jt]sx?$/i,
  /\.test\.[cm]?[jt]sx?$/i,
  /(^|\/)README-backup\.md$/i,
];

export const RUNTIME_PACKAGE_FORBIDDEN_PATTERNS = [
  ...ALWAYS_FORBIDDEN_PACKAGE_PATTERNS,
  /^src(?:\/|$)/i,
  /^admin(?:\/|$)/i,
  /^creator(?:\/|$)/i,
  /^website(?:\/|$)/i,
  /^shared(?:\/|$)/i,
  /^test(?:\/|$)/i,
  /\.spec\.[cm]?[jt]sx?$/i,
  /\.test\.[cm]?[jt]sx?$/i,
  /\.map$/i,
  /\.d\.[cm]?ts$/i,
  /\.ts$/i,
  /\.tsx$/i,
];

export const SOURCE_REQUIRED_PATHS = [
  'package.json',
  'package-lock.json',
  '.env.example',
  '.gitattributes',
  'nest-cli.json',
  'tsconfig.json',
  'tsconfig.build.json',
  'src/main.ts',
  'src/database/typeorm-cli.data-source.ts',
  'admin/vite.config.ts',
  'creator/vite.config.ts',
  'website/vite.config.ts',
  'shared/branding/index.ts',
  'shared/branding/public/brand/logo-mark.svg',
  'shared/branding/public/brand/logo-horizontal.svg',
  'shared/branding/public/brand/favicon.svg',
  'shared/branding/public/brand/app-icon.svg',
  'scripts/start-production.mjs',
  'docs/production/WHITE-LABEL-GUIDE.md',
  'docs/production/PRODUCTION-DEPLOYMENT-GUIDE.md',
  'README-PRODUCTION.md',
  'RELEASE-MANIFEST.json',
  'SHA256SUMS.txt',
];

export const RUNTIME_REQUIRED_PATHS = [
  'package.json',
  'package-lock.json',
  '.env.example',
  'scripts/start-production.mjs',
  'dist/src/main.js',
  'dist/website/index.html',
  'dist/admin/index.html',
  'dist/creator/index.html',
  'README-PRODUCTION.md',
  'RELEASE-MANIFEST.json',
  'SHA256SUMS.txt',
];

export const SOURCE_PRODUCTION_SCRIPTS = [
  'build:admin',
  'build:creator',
  'build:website',
  'build',
  'start:prod',
  'typeorm',
  'database:bootstrap',
  'database:bootstrap:prod',
  'migration:status',
  'migration:run',
  'migration:revert',
  'migration:status:prod',
  'migration:run:prod',
  'host-verification:migration:preview',
  'host-verification:migration:run',
  'host-verification:migration:report',
];

export const RUNTIME_PRODUCTION_SCRIPTS = [
  'start:prod',
  'database:bootstrap:prod',
  'migration:status:prod',
  'migration:run:prod',
];

export const SECRET_ASSIGNMENT_KEYS = [
  'JWT_SECRET',
  'ENCRYPTION_KEY',
  'DATABASE_PASSWORD',
  'FIREBASE_SERVICE_ACCOUNT',
  'GEMINI_API_KEY',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
];
