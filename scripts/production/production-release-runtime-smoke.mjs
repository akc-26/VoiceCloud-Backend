import AdmZip from 'adm-zip';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  RELEASE_ROOT,
  RUNTIME_FOLDER_NAME,
  RUNTIME_ZIP_NAME,
} from './production-release-policy.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const releaseFlag = args.indexOf('--release-root');
const releaseRoot = resolve(
  root,
  releaseFlag >= 0 && args[releaseFlag + 1]
    ? args[releaseFlag + 1]
    : RELEASE_ROOT,
);
const runtimeZip = join(releaseRoot, RUNTIME_ZIP_NAME);
if (!existsSync(runtimeZip))
  throw new Error(`Sanitized runtime ZIP is missing: ${runtimeZip}`);

// Smoke the distributable ZIP after extraction into a non-hidden staging directory.
// Express sendFile/static behavior is therefore exercised in the same shape used by
// a deployment operator, rather than from inside the repository's hidden .release tree.
const smokeRoot = join(root, 'release-smoke-staging');
rmSync(smokeRoot, { recursive: true, force: true });
new AdmZip(runtimeZip).extractAllTo(smokeRoot, true);
const runtimeRoot = join(smokeRoot, RUNTIME_FOLDER_NAME);

const required = [
  'dist/src/main.js',
  'dist/website/index.html',
  'dist/admin/index.html',
  'dist/creator/index.html',
];
for (const relativePath of required) {
  if (!existsSync(join(runtimeRoot, relativePath)))
    throw new Error(`Sanitized runtime is incomplete: ${relativePath}`);
}

const port = await new Promise((resolvePort, reject) => {
  const server = createServer();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    const selected = typeof address === 'object' && address ? address.port : 0;
    server.close((error) => (error ? reject(error) : resolvePort(selected)));
  });
});
const baseUrl = `http://127.0.0.1:${port}`;
const output = [];
const mainUrl = pathToFileURL(join(runtimeRoot, 'dist/src/main.js')).href;
const child = spawn(
  process.execPath,
  ['-e', `import(${JSON.stringify(mainUrl)})`],
  {
    cwd: runtimeRoot,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      INFRASTRUCTURE_MODE: 'memory',
      ENABLE_SWAGGER: 'true',
      DEV_SEED_ACCOUNTS: 'true',
      PORT: String(port),
      FRONTEND_DIST_ROOT: join(runtimeRoot, 'dist'),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  },
);
child.stdout.on('data', (chunk) => output.push(chunk.toString()));
child.stderr.on('data', (chunk) => output.push(chunk.toString()));

const stop = () => {
  if (child.exitCode !== null) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
    });
  } else child.kill('SIGTERM');
};
const diagnostics = (body = '') => {
  const serverOutput = output.join('').trim();
  const parts = [];
  if (body.trim()) parts.push(`Response body:\n${body.slice(0, 2000)}`);
  if (serverOutput) parts.push(`Runtime output:\n${serverOutput.slice(-8000)}`);
  return parts.length ? `\n${parts.join('\n\n')}` : '';
};
const waitReady = async () => {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null)
      throw new Error(`Sanitized runtime exited early.${diagnostics()}`);
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch {
      // Startup still in progress.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  throw new Error(`Timed out waiting for sanitized runtime.${diagnostics()}`);
};
const assertHtml = async (route, label) => {
  const response = await fetch(`${baseUrl}${route}`);
  const contentType = response.headers.get('content-type') || '';
  const body = await response.text();
  if (!response.ok || !contentType.includes('text/html'))
    throw new Error(
      `${label} failed: ${response.status} ${contentType}${diagnostics(body)}`,
    );
  const asset = body.match(/(?:src|href)=["']([^"']+\.(?:js|css))["']/i)?.[1];
  if (!asset) throw new Error(`${label} HTML has no compiled asset reference.`);
  const assetResponse = await fetch(new URL(asset, `${baseUrl}${route}`));
  if (!assetResponse.ok)
    throw new Error(
      `${label} asset failed to load: ${assetResponse.status}${diagnostics()}`,
    );
  console.log(`${label}: ${route} -> ${response.status}`);
};

try {
  await waitReady();
  await assertHtml('/', 'Landing');
  await assertHtml('/admin/', 'Admin root');
  await assertHtml('/admin/login', 'Admin deep link');
  await assertHtml('/creator/', 'Creator root');
  await assertHtml('/creator/login', 'Creator deep link');
  const apiResponse = await fetch(`${baseUrl}/api/v1/nonexistent-route`);
  if (apiResponse.status !== 404)
    throw new Error(`API isolation expected 404, got ${apiResponse.status}`);
  const healthResponse = await fetch(`${baseUrl}/health`);
  if (!healthResponse.ok) throw new Error('Health endpoint failed.');
  console.log('Sanitized production runtime ZIP smoke passed.');
} finally {
  stop();
  rmSync(smokeRoot, { recursive: true, force: true });
}
