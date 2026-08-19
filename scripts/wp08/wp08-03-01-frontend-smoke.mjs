import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDirectory, '../..');

const getAvailablePort = async () => {
  return await new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolvePort(port);
      });
    });
  });
};

const port = await getAvailablePort();
const baseUrl = `http://127.0.0.1:${port}`;
const output = [];

const child = spawn(process.execPath, ['scripts/start-local-full.mjs'], {
  cwd: root,
  env: {
    ...process.env,
    VOICECLOUD_LOCAL_PORT: String(port),
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

child.stdout.on('data', (chunk) => {
  output.push(chunk.toString());
});

child.stderr.on('data', (chunk) => {
  output.push(chunk.toString());
});

const stopChild = () => {
  if (child.exitCode !== null) {
    return;
  }

  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
    });
    return;
  }

  child.kill('SIGTERM');
};

const waitForServer = async () => {
  const deadline = Date.now() + 60_000;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(
        `VoiceCloud exited before becoming ready.\n${output.join('')}`,
      );
    }

    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) {
        return;
      }
    } catch {
      // Startup is still in progress.
    }

    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }

  throw new Error(`Timed out waiting for VoiceCloud.\n${output.join('')}`);
};

const assertHtml = async (route, label) => {
  const response = await fetch(`${baseUrl}${route}`, { redirect: 'follow' });
  const contentType = response.headers.get('content-type') || '';
  const body = await response.text();

  if (!response.ok || !contentType.includes('text/html')) {
    throw new Error(
      `${label} did not return HTML. Status=${response.status}, Content-Type=${contentType}, Body=${body.slice(0, 300)}`,
    );
  }

  const lowerBody = body.toLowerCase();
  if (!lowerBody.includes('<!doctype html') && !lowerBody.includes('<html')) {
    throw new Error(`${label} response does not contain an HTML document.`);
  }

  const assetMatch = body.match(/(?:src|href)=["']([^"']+\.(?:js|css))["']/i);
  if (!assetMatch) {
    throw new Error(
      `${label} HTML does not reference a JavaScript or CSS asset.`,
    );
  }

  const assetUrl = new URL(assetMatch[1], `${baseUrl}${route}`);
  const assetResponse = await fetch(assetUrl);
  if (!assetResponse.ok) {
    throw new Error(
      `${label} asset failed to load: ${assetUrl.pathname} returned ${assetResponse.status}.`,
    );
  }

  console.log(`${label}: ${route} -> ${response.status} ${contentType}`);
  console.log(
    `${label} asset: ${assetUrl.pathname} -> ${assetResponse.status}`,
  );
};

const assertJsonRoute = async (route, expectedStatus, label) => {
  const response = await fetch(`${baseUrl}${route}`);
  const contentType = response.headers.get('content-type') || '';
  const body = await response.text();

  if (
    response.status !== expectedStatus ||
    !contentType.includes('application/json') ||
    body.toLowerCase().includes('<html')
  ) {
    throw new Error(
      `${label} did not remain JSON. Status=${response.status}, Content-Type=${contentType}, Body=${body.slice(0, 300)}`,
    );
  }

  console.log(`${label}: ${route} -> ${response.status} ${contentType}`);
};

try {
  await waitForServer();

  const healthResponse = await fetch(`${baseUrl}/health`);
  const healthContentType = healthResponse.headers.get('content-type') || '';
  if (!healthResponse.ok || !healthContentType.includes('application/json')) {
    throw new Error(
      `/health must return JSON. Status=${healthResponse.status}, Content-Type=${healthContentType}`,
    );
  }

  await assertHtml('/', 'Landing Website');
  await assertHtml('/pricing', 'Landing Website deep link');
  await assertHtml('/apiary', 'Landing route-boundary collision');
  await assertHtml('/admin/', 'Admin Portal');
  await assertHtml('/admin/index.html', 'Admin Portal index');
  await assertHtml('/admin/login', 'Admin Portal deep link');
  await assertHtml('/creator/', 'Creator Studio');
  await assertHtml('/creator/index.html', 'Creator Studio index');
  await assertHtml('/creator/login', 'Creator Studio deep link');
  await assertJsonRoute(
    '/api/v1/nonexistent-route',
    404,
    'API fallback isolation',
  );

  console.log(
    `Health API: /health -> ${healthResponse.status} ${healthContentType}`,
  );
  console.log('WP08-03-01 frontend runtime smoke test passed.');
} finally {
  stopChild();
}
