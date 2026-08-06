import { File } from 'node:buffer';
import process from 'node:process';

const baseUrl = (process.env.WP08_BASE_URL ?? 'http://127.0.0.1:3000').replace(
  /\/$/,
  '',
);
const requireRealInfrastructure = !['false', '0', 'no'].includes(
  (process.env.WP08_REQUIRE_REAL_INFRASTRUCTURE ?? 'true').toLowerCase(),
);
const requestTimeoutMs = Number(process.env.WP08_REQUEST_TIMEOUT_MS ?? 15000);
if (!Number.isSafeInteger(requestTimeoutMs) || requestTimeoutMs <= 0) {
  throw new Error('WP08_REQUEST_TIMEOUT_MS must be a positive integer');
}
const adminEmail = process.env.DEV_ADMIN_EMAIL ?? 'admin@voicecloud.com';
const adminPassword = process.env.DEV_ADMIN_PASSWORD ?? 'AdminPass123!';
const creatorEmail = process.env.DEV_CREATOR_EMAIL ?? 'creator@voicecloud.com';
const creatorPassword = process.env.DEV_CREATOR_PASSWORD ?? 'CreatorPass123!';
const acceptanceHostEmail = process.env.WP08_ACCEPTANCE_HOST_EMAIL;
const acceptanceHostUsername = process.env.WP08_ACCEPTANCE_HOST_USERNAME;
const acceptanceHostPassword =
  process.env.WP08_ACCEPTANCE_HOST_PASSWORD ?? 'Wp08Acceptance123!';

let completedChecks = 0;
let adminAccessToken;
let originalHostSettings;
let activeCheck;
let lastRequest;

function beginCheck(name) {
  activeCheck = {
    number: completedChecks + 1,
    name,
  };
  console.log(
    `[RUN ${String(activeCheck.number).padStart(2, '0')}] ${activeCheck.name}`,
  );
}

function logStep(message) {
  completedChecks += 1;
  console.log(`[PASS ${String(completedChecks).padStart(2, '0')}] ${message}`);
  activeCheck = undefined;
}

function checkPrefix() {
  if (!activeCheck) return '';
  const number = String(activeCheck.number).padStart(2, '0');
  return `[CHECK ${number} - ${activeCheck.name}] `;
}

function fail(message) {
  throw new Error(`${checkPrefix()}${message}`);
}

function redactDiagnostic(value) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(redactDiagnostic);
  if (typeof value !== 'object') return value;

  const redacted = {};
  for (const [key, entry] of Object.entries(value)) {
    if (/password|token|secret|authorization|cookie/i.test(key)) {
      redacted[key] = '[REDACTED]';
    } else {
      redacted[key] = redactDiagnostic(entry);
    }
  }
  return redacted;
}

function bodyPreview(payload) {
  const safePayload = redactDiagnostic(payload);
  const value =
    typeof safePayload === 'string'
      ? safePayload
      : JSON.stringify(safePayload, null, 2);
  return String(value ?? '').slice(0, 1600);
}

async function request(path, options = {}) {
  const method = options.method ?? 'GET';
  const url = `${baseUrl}${path}`;
  const headers = new Headers(options.headers ?? {});
  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }
  if (options.json !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), requestTimeoutMs);
  timer.unref?.();

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body:
        options.json !== undefined
          ? JSON.stringify(options.json)
          : options.body,
      redirect: options.redirect ?? 'follow',
      signal: controller.signal,
    });
  } catch (error) {
    lastRequest = {
      method,
      url,
      status: 'NO_RESPONSE',
      contentType: '',
      body: '',
    };
    const reason = error instanceof Error ? error.message : String(error);
    fail(`${method} ${url} failed before receiving a response: ${reason}`);
  } finally {
    clearTimeout(timer);
  }

  const contentType = response.headers.get('content-type') ?? '';
  let payload;
  if (contentType.includes('application/json')) {
    payload = await response.json();
  } else if (options.binary) {
    payload = Buffer.from(await response.arrayBuffer());
  } else {
    payload = await response.text();
  }

  lastRequest = {
    method,
    url,
    status: response.status,
    contentType,
    body: options.binary
      ? `[binary payload: ${payload.length} bytes]`
      : bodyPreview(payload),
  };

  const expected = Array.isArray(options.expected)
    ? options.expected
    : [options.expected ?? 200];
  if (!expected.includes(response.status)) {
    fail(
      `${method} ${url} returned ${response.status}; expected ${expected.join(
        ' or ',
      )}. Content-Type: ${contentType || '(none)'}. Response: ${
        lastRequest.body
      }`,
    );
  }

  return { response, payload };
}

async function login(email, password) {
  const { payload } = await request('/api/v1/auth/login', {
    method: 'POST',
    expected: 200,
    json: { email, password },
  });
  if (!payload.accessToken || !payload.refreshToken || !payload.user?.id) {
    fail(
      `Login response for ${email} did not contain the required token/user data`,
    );
  }
  return payload;
}

function jpegFile(name) {
  const bytes = Uint8Array.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0xff, 0xd9,
  ]);
  return new File([bytes], name, { type: 'image/jpeg' });
}

async function upload(path, token, filename) {
  const form = new FormData();
  form.append('file', jpegFile(filename));
  const { payload } = await request(path, {
    method: 'POST',
    token,
    body: form,
    expected: 201,
  });
  if (!payload.assetId || payload.linkedToApplication !== false) {
    fail(`${path} did not return safe unlinked private-asset metadata`);
  }
  const forbiddenFields = ['storageKey', 'storageProvider', 'ownerUserId'];
  for (const field of forbiddenFields) {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      fail(`${path} leaked private field '${field}'`);
    }
  }
  return payload;
}

function pickHostSettings(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Host business settings response must be an object');
  }

  const requiredFields = [
    'applicationsEnabled',
    'minFollowers',
    'minCompletedRooms',
    'requireGoodStanding',
    'levels',
  ];
  for (const field of requiredFields) {
    if (!Object.prototype.hasOwnProperty.call(payload, field)) {
      throw new Error(
        `Host business settings response is missing required field '${field}'`,
      );
    }
  }
  if (!Array.isArray(payload.levels) || payload.levels.length === 0) {
    throw new Error(
      'Host business settings response must include at least one Host level',
    );
  }

  return {
    applicationsEnabled: payload.applicationsEnabled,
    minFollowers: payload.minFollowers,
    minCompletedRooms: payload.minCompletedRooms,
    requireGoodStanding: payload.requireGoodStanding,
    levels: payload.levels,
  };
}

function runSelfCheck() {
  const settings = pickHostSettings({
    applicationsEnabled: true,
    minFollowers: 10,
    minCompletedRooms: 2,
    requireGoodStanding: true,
    levels: [
      {
        level: 1,
        name: 'Starter Host',
        minimumXp: 0,
        benefits: [],
      },
    ],
    updatedAt: 'ignored',
  });

  if (
    settings.minFollowers !== 10 ||
    settings.levels.length !== 1 ||
    Object.prototype.hasOwnProperty.call(settings, 'updatedAt')
  ) {
    throw new Error('Host business settings snapshot self-check failed');
  }

  const redacted = redactDiagnostic({
    password: 'hidden',
    nested: { accessToken: 'hidden', safe: 'visible' },
  });
  if (
    redacted.password !== '[REDACTED]' ||
    redacted.nested.accessToken !== '[REDACTED]' ||
    redacted.nested.safe !== 'visible'
  ) {
    throw new Error('Acceptance diagnostic redaction self-check failed');
  }

  console.log('WP08-01 acceptance self-check passed.');
}

async function restoreSettings() {
  if (!adminAccessToken || !originalHostSettings) {
    return;
  }
  await request('/api/v1/admin/settings/host-business', {
    method: 'PUT',
    token: adminAccessToken,
    expected: 200,
    json: originalHostSettings,
  });
  console.log('[RESTORED] Original Host business settings');
}

async function run() {
  console.log('============================================================');
  console.log('VoiceCloud WP08-01 Real HTTP Acceptance');
  console.log(`Target: ${baseUrl}`);
  console.log('============================================================');

  beginCheck('Health endpoint confirms connected infrastructure');
  const health = await request('/health');
  if (health.payload.status !== 'ok') {
    fail(`Health endpoint is not healthy: ${JSON.stringify(health.payload)}`);
  }
  if (
    requireRealInfrastructure &&
    health.payload.infrastructure?.realInfrastructure !== true
  ) {
    fail(
      `WP08 requires real PostgreSQL and Redis. Health reported: ${JSON.stringify(
        health.payload.infrastructure,
      )}`,
    );
  }
  logStep('Health endpoint confirms connected infrastructure');

  beginCheck('API metadata and locked health route are correct');
  const apiInfo = await request('/api');
  if (
    apiInfo.payload.status !== 'online' ||
    apiInfo.payload.health !== '/health'
  ) {
    fail(
      'API metadata is online but does not advertise the locked /health route',
    );
  }
  logStep('API metadata and locked health route are correct');

  beginCheck('Landing, Admin, Creator and Swagger routes are served');
  for (const [path, marker] of [
    ['/', '<html'],
    ['/admin', '<html'],
    ['/creator', '<html'],
    ['/api/docs', 'swagger'],
  ]) {
    const result = await request(path);
    if (!String(result.payload).toLowerCase().includes(marker)) {
      fail(`${path} did not return the expected application content`);
    }
  }
  logStep('Landing, Admin, Creator and Swagger routes are served');

  beginCheck('Unknown random login is rejected');
  await request('/api/v1/auth/login', {
    method: 'POST',
    expected: [400, 401],
    json: {
      username: `wp08_unknown_${Date.now()}`,
      password: 'NotARealPassword123!',
    },
  });
  logStep('Unknown random login is rejected');

  beginCheck('Real Admin authentication succeeded with backend role');
  const admin = await login(adminEmail, adminPassword);
  if (admin.user.role !== 'SUPER_ADMIN' && admin.user.role !== 'ADMIN') {
    fail(`Acceptance admin has unexpected role ${admin.user.role}`);
  }
  adminAccessToken = admin.accessToken;
  logStep('Real Admin authentication succeeded with backend role');

  beginCheck('Creator is denied Admin settings and Host-review APIs');
  const creator = await login(creatorEmail, creatorPassword);
  if (creator.user.role !== 'CREATOR') {
    fail(`Acceptance creator has unexpected role ${creator.user.role}`);
  }
  await request('/api/v1/admin/settings', {
    token: creator.accessToken,
    expected: 403,
  });
  await request('/api/v1/hosts/admin/applications', {
    token: creator.accessToken,
    expected: 403,
  });
  logStep('Creator is denied Admin settings and Host-review APIs');

  beginCheck('Register a real acceptance user');
  const stamp = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const email = acceptanceHostEmail ?? `wp08_${stamp}@voicecloud.test`;
  const username = (acceptanceHostUsername ?? `wp08_${stamp}`).slice(0, 48);
  const password = acceptanceHostPassword;
  const registration = await request('/api/v1/auth/register', {
    method: 'POST',
    expected: 201,
    json: {
      email,
      username,
      displayName: 'WP08 Acceptance User',
      password,
    },
  });
  const userId = registration.payload.user?.id;
  let userAccessToken = registration.payload.accessToken;
  const initialRefreshToken = registration.payload.refreshToken;
  if (!userId || !userAccessToken || !initialRefreshToken) {
    fail('Registration did not return a complete authenticated user session');
  }
  logStep(`Registered real acceptance user ${email}`);

  beginCheck('Refresh-token rotation and Redis-backed replay rejection');
  const me = await request('/api/v1/auth/me', {
    token: userAccessToken,
  });
  if (me.payload.id !== userId || me.payload.email !== email) {
    fail('Authenticated profile does not match the registered user');
  }

  const refresh = await request('/api/v1/auth/refresh', {
    method: 'POST',
    expected: 200,
    json: { refreshToken: initialRefreshToken },
  });
  userAccessToken = refresh.payload.accessToken;
  await request('/api/v1/auth/refresh', {
    method: 'POST',
    expected: 401,
    json: { refreshToken: initialRefreshToken },
  });
  logStep('Refresh-token rotation and Redis-backed replay rejection passed');

  beginCheck('Creator profile update persisted');
  const profile = await request('/api/v1/users/profile', {
    method: 'PATCH',
    token: userAccessToken,
    expected: 200,
    json: {
      displayName: 'WP08 Verified Creator Candidate',
      bio: 'Real HTTP workflow acceptance profile',
      country: 'IN',
      preferredLanguage: 'en',
      interests: ['voice', 'community'],
    },
  });
  if (profile.payload.bio !== 'Real HTTP workflow acceptance profile') {
    fail('Creator profile update was not persisted');
  }
  logStep('Creator profile update persisted');

  beginCheck(
    'Backend-authoritative Host eligibility was configured and verified',
  );
  const currentSettings = await request(
    '/api/v1/admin/settings/host-business',
    { token: adminAccessToken },
  );
  originalHostSettings = pickHostSettings(currentSettings.payload);
  await request('/api/v1/admin/settings/host-business', {
    method: 'PUT',
    token: adminAccessToken,
    expected: 200,
    json: {
      ...originalHostSettings,
      applicationsEnabled: true,
      minFollowers: 0,
      minCompletedRooms: 0,
    },
  });
  const eligibility = await request('/api/v1/hosts/eligibility', {
    token: userAccessToken,
  });
  if (eligibility.payload.eligible !== true) {
    fail(
      `Acceptance user is not Host-eligible: ${JSON.stringify(eligibility.payload)}`,
    );
  }
  logStep('Backend-authoritative Host eligibility was configured and verified');

  beginCheck('Private Government ID, selfie and supporting document uploaded');
  const governmentId = await upload(
    '/api/v1/hosts/verification/government-id',
    userAccessToken,
    'wp08-government-id.jpg',
  );
  const selfie = await upload(
    '/api/v1/hosts/verification/profile-photo',
    userAccessToken,
    'wp08-selfie.jpg',
  );
  const supporting = await upload(
    '/api/v1/hosts/verification/documents',
    userAccessToken,
    'wp08-supporting.jpg',
  );
  logStep('Private Government ID, selfie and supporting document uploaded');

  beginCheck('Private asset owner access and cross-user protections passed');
  const ownerContent = await request(
    `/api/v1/hosts/verification/assets/${governmentId.assetId}/content`,
    { token: userAccessToken, binary: true },
  );
  if (
    ownerContent.payload.length === 0 ||
    ownerContent.response.headers.get('cache-control')?.includes('no-store') !==
      true
  ) {
    fail('Private asset owner access or secure response headers are invalid');
  }
  await request(
    `/api/v1/hosts/verification/assets/${governmentId.assetId}/content`,
    { token: creator.accessToken, expected: 403, binary: true },
  );
  await request(
    `/api/v1/hosts/verification/assets/${governmentId.assetId}/content`,
    { token: adminAccessToken, expected: 403, binary: true },
  );
  logStep('Private asset owner access and cross-user protections passed');

  beginCheck('Private asset IDs linked to a pending Host application');
  const application = await request('/api/v1/hosts/apply', {
    method: 'POST',
    token: userAccessToken,
    expected: 201,
    json: {
      realName: 'WP08 Acceptance Applicant',
      idNumber: `WP08-${stamp}`,
      governmentIdAssetId: governmentId.assetId,
      selfieAssetId: selfie.assetId,
      supportingDocumentAssetIds: [supporting.assetId],
      bio: 'Host application created by the WP08 real workflow',
      languages: ['English', 'Tamil'],
      categories: ['Talk Show'],
      country: 'India',
      experience: 'Acceptance verification',
    },
  });
  const hostId = application.payload.id;
  if (!hostId || application.payload.status !== 'PENDING') {
    fail('Host application did not enter PENDING state');
  }
  await request('/api/v1/hosts/apply', {
    method: 'POST',
    token: userAccessToken,
    expected: 409,
    json: { realName: 'Duplicate Pending Application' },
  });
  logStep('Private asset IDs linked to a pending Host application');

  beginCheck('Admin reviewed linked private document metadata and content');
  const adminApplications = await request(
    '/api/v1/hosts/admin/applications?status=PENDING',
    { token: adminAccessToken },
  );
  if (
    !Array.isArray(adminApplications.payload) ||
    !adminApplications.payload.some(
      (item) => item.id === hostId && item.userId === userId,
    )
  ) {
    fail('Admin could not find the real pending Host application');
  }
  const adminAssets = await request(
    `/api/v1/hosts/admin/applications/${hostId}/verification-assets`,
    { token: adminAccessToken },
  );
  if (!Array.isArray(adminAssets.payload) || adminAssets.payload.length !== 3) {
    fail('Admin did not receive the three safe linked asset records');
  }
  await request(
    `/api/v1/hosts/verification/assets/${governmentId.assetId}/content`,
    { token: adminAccessToken, expected: 200, binary: true },
  );
  logStep('Admin reviewed linked private document metadata and content');

  beginCheck('Admin rejection and applicant status visibility passed');
  const rejected = await request(`/api/v1/hosts/admin/reject/${hostId}`, {
    method: 'POST',
    token: adminAccessToken,
    expected: 201,
    json: { reason: 'WP08 controlled rejection and resubmission check' },
  });
  if (rejected.payload.status !== 'REJECTED') {
    fail('Host application did not enter REJECTED state');
  }
  const rejectedOwnerProfile = await request('/api/v1/hosts/profile', {
    token: userAccessToken,
  });
  if (
    rejectedOwnerProfile.payload.status !== 'REJECTED' ||
    !rejectedOwnerProfile.payload.rejectionReason
  ) {
    fail('Rejected state and reason were not visible to the applicant');
  }
  logStep('Admin rejection and applicant status visibility passed');

  beginCheck('Rejected applicant reused existing private assets and reapplied');
  const reapplied = await request('/api/v1/hosts/apply', {
    method: 'POST',
    token: userAccessToken,
    expected: 201,
    json: {
      realName: 'WP08 Acceptance Applicant',
      bio: 'Reapplied using securely retained private assets',
    },
  });
  if (reapplied.payload.status !== 'PENDING') {
    fail(
      'Rejected Host application did not return to PENDING on reapplication',
    );
  }
  logStep('Rejected applicant reused existing private assets and reapplied');

  beginCheck('Admin approval and privacy-safe public Host discovery passed');
  const approved = await request(`/api/v1/hosts/admin/approve/${hostId}`, {
    method: 'POST',
    token: adminAccessToken,
    expected: 201,
  });
  if (approved.payload.status !== 'APPROVED') {
    fail('Host application did not enter APPROVED state');
  }
  const publicHost = await request(`/api/v1/hosts/profile/${userId}`, {
    token: creator.accessToken,
  });
  if (
    publicHost.payload.status !== 'APPROVED' ||
    Object.prototype.hasOwnProperty.call(publicHost.payload, 'idNumber') ||
    Object.prototype.hasOwnProperty.call(publicHost.payload, 'documentUrl')
  ) {
    fail(
      'Approved public Host profile is unavailable or leaks private identity',
    );
  }
  logStep('Admin approval and privacy-safe public Host discovery passed');

  beginCheck('Host application lifecycle audit history is present');
  const auditHistory = await request(
    `/api/v1/hosts/admin/audit-history/${hostId}`,
    { token: adminAccessToken },
  );
  if (!Array.isArray(auditHistory.payload) || auditHistory.payload.length < 4) {
    fail('Host audit history did not record the application lifecycle');
  }
  logStep('Host application lifecycle audit history is present');

  await restoreSettings();
  originalHostSettings = undefined;

  console.log('============================================================');
  console.log(
    `WP08-01 REAL HTTP ACCEPTANCE PASSED (${completedChecks} checks)`,
  );
  console.log(`Acceptance user created successfully: ${email}`);
  console.log(`WP08_ACCEPTANCE_HOST_READY=${email}`);
  console.log('============================================================');
}

if (process.argv.includes('--self-check')) {
  try {
    runSelfCheck();
  } catch (error) {
    console.error(
      'WP08-01 acceptance self-check failed:',
      error instanceof Error ? error.stack : error,
    );
    process.exitCode = 1;
  }
} else {
  try {
    await run();
  } catch (error) {
    console.error(
      '============================================================',
    );
    console.error('WP08-01 REAL HTTP ACCEPTANCE FAILED');
    if (activeCheck) {
      console.error(
        `Failed check: ${String(activeCheck.number).padStart(2, '0')} - ${
          activeCheck.name
        }`,
      );
    }
    console.error(`Base URL: ${baseUrl}`);
    console.error(`PORT: ${process.env.PORT ?? '(not set)'}`);
    console.error(`NODE_ENV: ${process.env.NODE_ENV ?? '(not set)'}`);
    console.error(
      `INFRASTRUCTURE_MODE: ${process.env.INFRASTRUCTURE_MODE ?? '(not set)'}`,
    );
    console.error(`Require real infrastructure: ${requireRealInfrastructure}`);
    if (lastRequest) {
      console.error(
        `Last request: ${lastRequest.method} ${lastRequest.url} -> ${
          lastRequest.status
        }`,
      );
      console.error(`Content-Type: ${lastRequest.contentType || '(none)'}`);
      console.error(`Response preview: ${lastRequest.body || '(empty)'}`);
    }
    console.error(error instanceof Error ? error.stack : error);
    console.error(
      '============================================================',
    );
    try {
      await restoreSettings();
    } catch (restoreError) {
      console.error('Failed to restore Host business settings:', restoreError);
    }
    process.exitCode = 1;
  }
}
