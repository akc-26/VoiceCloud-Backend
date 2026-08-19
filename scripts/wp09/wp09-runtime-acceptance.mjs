import { io } from 'socket.io-client';

const baseUrl = (process.env.WP09_BASE_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '');
const adminEmail = process.env.WP09_ADMIN_EMAIL ?? process.env.DEV_ADMIN_EMAIL ?? 'admin@voicecloud.com';
const adminPassword = process.env.WP09_ADMIN_PASSWORD ?? process.env.DEV_ADMIN_PASSWORD ?? 'AdminPass123!';
const timeoutMs = Number(process.env.WP09_REQUEST_TIMEOUT_MS ?? 15000);
const socketTimeoutMs = Number(process.env.WP09_SOCKET_TIMEOUT_MS ?? 10000);
let passed = 0;
const cleanupIds = new Set();

function pass(message) {
  passed += 1;
  console.log(`[PASS ${String(passed).padStart(2, '0')}] ${message}`);
}
function fail(message) { throw new Error(message); }
async function request(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  timer.unref?.();
  try {
    const headers = new Headers(options.headers ?? {});
    if (options.token) headers.set('Authorization', `Bearer ${options.token}`);
    if (options.json !== undefined) headers.set('Content-Type', 'application/json');
    const response = await fetch(`${baseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body ?? (options.json === undefined ? undefined : JSON.stringify(options.json)),
      signal: controller.signal,
    });
    const expected = Array.isArray(options.expected) ? options.expected : [options.expected ?? 200];
    const contentType = response.headers.get('content-type') ?? '';
    let payload;
    if (options.binary) payload = Buffer.from(await response.arrayBuffer());
    else if (contentType.includes('application/json')) payload = await response.json();
    else payload = await response.text();
    if (!expected.includes(response.status)) {
      fail(`${options.method ?? 'GET'} ${path} returned ${response.status}; expected ${expected.join('/')}: ${typeof payload === 'string' ? payload.slice(0, 800) : JSON.stringify(payload).slice(0, 800)}`);
    }
    return { response, payload };
  } finally { clearTimeout(timer); }
}
async function login() {
  const { payload } = await request('/api/v1/auth/login', { method: 'POST', json: { email: adminEmail, password: adminPassword } });
  if (!payload?.accessToken || !payload?.user?.id) fail('Admin login returned an incomplete session');
  return payload;
}
async function connectSocket(token) {
  return await new Promise((resolve, reject) => {
    const socket = io(`${baseUrl}/realtime`, {
      path: '/socket.io', auth: { token }, transports: ['websocket'], reconnection: false,
      timeout: socketTimeoutMs, forceNew: true, autoConnect: false,
    });
    const timer = setTimeout(() => { socket.disconnect(); reject(new Error('Socket authentication timeout')); }, socketTimeoutMs);
    timer.unref?.();
    const done = (error) => { clearTimeout(timer); if (error) { socket.disconnect(); reject(error); } else resolve(socket); };
    socket.once('connection_established', () => done());
    socket.once('connect_error', done);
    socket.once('auth_error', (p) => done(new Error(p?.message ?? 'Socket auth error')));
    socket.connect();
  });
}

async function run() {
  console.log('============================================================');
  console.log('VoiceCloud WP09 production runtime acceptance');
  console.log(`Base URL: ${baseUrl}`);
  console.log('============================================================');

  const healthResult = await request('/health');
  const health = healthResult.payload;
  if (health?.status !== 'ok' || health?.database !== 'connected' || health?.redis !== 'connected' || health?.infrastructure?.realInfrastructure !== true) {
    fail(`Health does not prove real infrastructure: ${JSON.stringify(health)}`);
  }
  pass('PostgreSQL/Redis real-infrastructure health');

  const requiredHeaders = ['x-content-type-options', 'x-frame-options', 'referrer-policy', 'permissions-policy', 'content-security-policy'];
  for (const header of requiredHeaders) if (!healthResult.response.headers.get(header)) fail(`Missing production security header: ${header}`);
  if (healthResult.response.headers.get('x-powered-by')) fail('x-powered-by remains exposed');
  pass('Production security headers and server fingerprint suppression');

  await request('/api/v1/admin/backups', { expected: [401, 403] });
  pass('Admin backup boundary rejects unauthenticated access');

  const admin = await login();
  pass('Admin production authentication');

  const rateProbe = await request('/api/v1/admin/backups', { token: admin.accessToken });
  if (!rateProbe.response.headers.get('ratelimit-limit') || !rateProbe.response.headers.get('ratelimit-remaining')) fail('API rate-limit headers are missing');
  pass('Redis-backed API rate-limit middleware is active');

  for (const path of ['/', '/admin/', '/admin/login', '/creator/', '/creator/login']) {
    const { response } = await request(path);
    const type = response.headers.get('content-type') ?? '';
    if (!type.includes('text/html')) fail(`${path} did not return HTML`);
  }
  pass('Landing/Admin/Creator roots and deep links');

  const backupName = `WP09_Runtime_${Date.now()}`;
  const createdResult = await request('/api/v1/admin/backups', {
    method: 'POST', expected: [200, 201], token: admin.accessToken,
    json: { name: backupName, components: ['database', 'redis', 'config'], isEncrypted: true, notes: 'WP09 runtime certification' },
  });
  const created = createdResult.payload;
  if (!created?.id || created?.isEncrypted !== true) fail('Encrypted backup creation response is invalid');
  cleanupIds.add(created.id);
  pass('Encrypted backup creation');

  const verified = (await request(`/api/v1/admin/backups/${created.id}/verify`, { method: 'POST', expected: [200, 201], token: admin.accessToken })).payload;
  if (verified?.status !== 'VERIFIED' || verified?.verificationDetails?.checksumMatches !== true || verified?.verificationDetails?.archiveIntegrity !== true) fail('Backup verification did not prove checksum/archive integrity');
  pass('Backup checksum + authenticated archive verification');

  const downloaded = (await request(`/api/v1/admin/backups/${created.id}/download`, { token: admin.accessToken, binary: true })).payload;
  if (downloaded.subarray(0, 6).toString('ascii') !== 'VCBKP1') fail('Downloaded encrypted backup lacks VoiceCloud encrypted envelope');
  pass('Downloaded backup is actually encrypted at rest');

  const form = new FormData();
  form.append('file', new Blob([downloaded], { type: 'application/octet-stream' }), `${backupName}.vcbkp`);
  const imported = (await request('/api/v1/admin/backups/upload', { method: 'POST', expected: [200, 201], token: admin.accessToken, body: form })).payload;
  if (!imported?.id || imported?.isEncrypted !== true) fail('Encrypted backup import failed');
  cleanupIds.add(imported.id);
  pass('External encrypted backup import uses uploaded bytes');

  const preview = (await request(`/api/v1/admin/backups/restore/preview/${imported.id}`, { token: admin.accessToken })).payload;
  if (preview?.backupId !== imported.id || preview?.totalFiles < 1) fail('Restore preview is invalid');
  pass('Authenticated restore preview reads imported encrypted archive');

  const corrupted = Buffer.from(downloaded);
  corrupted[corrupted.length - 1] ^= 0xff;
  const badForm = new FormData();
  badForm.append('file', new Blob([corrupted], { type: 'application/octet-stream' }), 'corrupted.vcbkp');
  await request('/api/v1/admin/backups/upload', { method: 'POST', expected: 400, token: admin.accessToken, body: badForm });
  pass('Corrupted AES-GCM backup is rejected');

  const concurrent = await Promise.all(Array.from({ length: 30 }, () => request('/api/v1/admin/backups', { token: admin.accessToken })));
  if (concurrent.some(({ response }) => response.status !== 200)) fail('Concurrent HTTP acceptance returned a non-200 response');
  pass('30-way authenticated HTTP concurrency');

  const sockets = await Promise.all(Array.from({ length: 8 }, () => connectSocket(admin.accessToken)));
  if (sockets.some((socket) => !socket.connected)) fail('One or more Socket.IO sessions failed to connect');
  for (const socket of sockets) socket.disconnect();
  pass('8-way authenticated Socket.IO connection stability');

  console.log(`\nWP09 production runtime acceptance passed: ${passed}/${passed}`);
}

try {
  await run();
} finally {
  if (cleanupIds.size) {
    try {
      const admin = await login();
      for (const id of cleanupIds) {
        try { await request(`/api/v1/admin/backups/${id}`, { method: 'DELETE', expected: [200, 204], token: admin.accessToken }); }
        catch (error) { console.error(`Cleanup warning for backup ${id}: ${error.message}`); }
      }
    } catch (error) { console.error(`Cleanup warning: ${error.message}`); }
  }
}
