import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDirectory, '..');
const requiredFiles = [
  'dist/src/main.js',
  'dist/website/index.html',
  'dist/admin/index.html',
  'dist/creator/index.html',
];

const missingFiles = requiredFiles.filter((relativePath) => {
  return !existsSync(join(root, relativePath));
});

if (missingFiles.length > 0) {
  console.error('VoiceCloud full application build is incomplete.');
  console.error(`Missing: ${missingFiles.join(', ')}`);
  console.error('Run "npm run build" and start again.');
  process.exit(1);
}

process.chdir(root);
process.env.NODE_ENV = 'development';
process.env.INFRASTRUCTURE_MODE = 'memory';
process.env.ENABLE_SWAGGER = 'true';
process.env.DEV_SEED_ACCOUNTS = 'true';
process.env.PORT = process.env.VOICECLOUD_LOCAL_PORT || '3000';
process.env.FRONTEND_DIST_ROOT = join(root, 'dist');

console.log(
  `Starting the complete VoiceCloud application on port ${process.env.PORT}...`,
);
console.log(`Frontend build root: ${process.env.FRONTEND_DIST_ROOT}`);

await import(pathToFileURL(join(root, 'dist/src/main.js')).href);
