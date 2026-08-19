import process from 'node:process';

const baseUrl = (process.env.WP08_BASE_URL ?? 'http://127.0.0.1:3000').replace(
  /\/$/,
  '',
);
const requestTimeoutMs = Number(process.env.WP08_REQUEST_TIMEOUT_MS ?? 15000);
const socketTimeoutMs = Number(process.env.WP08_SOCKET_TIMEOUT_MS ?? 10000);
const hostEmail =
  process.env.WP08_HOST_EMAIL ?? process.env.WP08_ACCEPTANCE_HOST_EMAIL;
const hostPassword =
  process.env.WP08_HOST_PASSWORD ?? process.env.WP08_ACCEPTANCE_HOST_PASSWORD;
const adminEmail = process.env.DEV_ADMIN_EMAIL ?? 'admin@voicecloud.com';
const adminPassword = process.env.DEV_ADMIN_PASSWORD ?? 'AdminPass123!';

if (!Number.isSafeInteger(requestTimeoutMs) || requestTimeoutMs <= 0) {
  throw new Error('WP08_REQUEST_TIMEOUT_MS must be a positive integer');
}
if (!Number.isSafeInteger(socketTimeoutMs) || socketTimeoutMs <= 0) {
  throw new Error('WP08_SOCKET_TIMEOUT_MS must be a positive integer');
}

let completedChecks = 0;
let activeCheck;
let lastRequest;
const sockets = new Set();

function beginCheck(name) {
  activeCheck = { number: completedChecks + 1, name };
  console.log(
    `[RUN ${String(activeCheck.number).padStart(2, '0')}] ${activeCheck.name}`,
  );
}

function pass(message) {
  completedChecks += 1;
  console.log(`[PASS ${String(completedChecks).padStart(2, '0')}] ${message}`);
  activeCheck = undefined;
}

function fail(message) {
  const prefix = activeCheck
    ? `[CHECK ${String(activeCheck.number).padStart(2, '0')} - ${activeCheck.name}] `
    : '';
  throw new Error(`${prefix}${message}`);
}

function redact(value) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(redact);
  if (typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      /password|token|secret|authorization|cookie/i.test(key)
        ? '[REDACTED]'
        : redact(entry),
    ]),
  );
}

async function request(path, options = {}) {
  const method = options.method ?? 'GET';
  const url = `${baseUrl}${path}`;
  const headers = new Headers(options.headers ?? {});
  if (options.token) headers.set('Authorization', `Bearer ${options.token}`);
  if (options.json !== undefined) headers.set('Content-Type', 'application/json');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  timeout.unref?.();

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: options.json === undefined ? options.body : JSON.stringify(options.json),
      signal: controller.signal,
    });
  } catch (error) {
    lastRequest = { method, url, status: 'NO_RESPONSE' };
    fail(`${method} ${url} failed: ${error instanceof Error ? error.message : error}`);
  } finally {
    clearTimeout(timeout);
  }

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();
  lastRequest = {
    method,
    url,
    status: response.status,
    body: JSON.stringify(redact(payload)).slice(0, 1600),
  };

  const expected = Array.isArray(options.expected)
    ? options.expected
    : [options.expected ?? 200];
  if (!expected.includes(response.status)) {
    fail(
      `${method} ${url} returned ${response.status}; expected ${expected.join(
        ' or ',
      )}. Response: ${lastRequest.body}`,
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
  if (!payload.accessToken || !payload.user?.id) {
    fail(`Login for ${email} did not return accessToken and user.id`);
  }
  return payload;
}

async function registerListener(label) {
  const stamp = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const password = 'Wp08RoomAcceptance123!';
  const email = `wp08_${label}_${stamp}@voicecloud.test`;
  const { payload } = await request('/api/v1/auth/register', {
    method: 'POST',
    expected: 201,
    json: {
      email,
      username: `wp08_${label}_${stamp}`.slice(0, 48),
      displayName: `WP08 ${label} Listener`,
      password,
    },
  });
  if (!payload.accessToken || !payload.user?.id) {
    fail(`Registration for ${label} listener returned an incomplete session`);
  }
  return {
    accessToken: payload.accessToken,
    userId: payload.user.id,
    email,
    password,
  };
}

async function connectRealtime(token) {
  const { io } = await import('socket.io-client');
  return new Promise((resolve, reject) => {
    const socket = io(`${baseUrl}/realtime`, {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket'],
      reconnection: false,
      timeout: socketTimeoutMs,
      forceNew: true,
      autoConnect: false,
    });
    sockets.add(socket);
    const timer = setTimeout(() => {
      socket.disconnect();
      reject(new Error('Timed out authenticating with /realtime'));
    }, socketTimeoutMs);
    timer.unref?.();

    socket.once('connection_established', () => {
      clearTimeout(timer);
      resolve(socket);
    });
    socket.once('connect_error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    socket.once('auth_error', (payload) => {
      clearTimeout(timer);
      reject(new Error(payload?.message ?? 'Realtime authentication failed'));
    });
    socket.once('disconnect', (reason) => {
      if (socket.connected) return;
      clearTimeout(timer);
      reject(
        new Error(
          `Realtime socket disconnected before authentication completed: ${reason}`,
        ),
      );
    });
    socket.connect();
  });
}

async function emitAck(socket, event, payload) {
  try {
    return await socket.timeout(socketTimeoutMs).emitWithAck(event, payload);
  } catch (error) {
    fail(
      `Socket event ${event} timed out or failed: ${
        error instanceof Error ? error.message : error
      }`,
    );
  }
}

function expectSocketSuccess(result, event) {
  if (!result || result.success !== true) {
    fail(`${event} failed: ${JSON.stringify(redact(result))}`);
  }
  return result;
}

function expectSocketFailure(result, expectedCode, event) {
  if (!result || result.success !== false || result.error !== expectedCode) {
    fail(
      `${event} should fail with ${expectedCode}, received ${JSON.stringify(
        redact(result),
      )}`,
    );
  }
  return result;
}

function waitForEvent(socket, event) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timed out waiting for ${event}`)),
      socketTimeoutMs,
    );
    timer.unref?.();
    socket.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

async function closeSockets() {
  await Promise.all(
    Array.from(sockets).map(
      (socket) =>
        new Promise((resolve) => {
          if (!socket.connected) return resolve();
          socket.once('disconnect', resolve);
          socket.disconnect();
          setTimeout(resolve, 250).unref?.();
        }),
    ),
  );
  sockets.clear();
}

function selfCheck() {
  if (!baseUrl.startsWith('http')) fail('WP08_BASE_URL must be an HTTP URL');
  if (Boolean(hostEmail) !== Boolean(hostPassword)) {
    fail('WP08 Host email and password must be configured together');
  }
  console.log('WP08-02 acceptance script self-check passed');
}

async function run() {
  console.log('============================================================');
  console.log('WP08-02 REAL ROOM + SOCKET.IO ACCEPTANCE');
  console.log(`Base URL: ${baseUrl}`);
  console.log('============================================================');

  beginCheck('Approved Host and Admin sessions are available');
  if (
    !process.env.WP08_HOST_ACCESS_TOKEN &&
    (!hostEmail || !hostPassword)
  ) {
    fail(
      'WP08-02 requires the approved Host produced by WP08-01. The combined checker did not provide the Host handoff.',
    );
  }
  const host = process.env.WP08_HOST_ACCESS_TOKEN
    ? {
        accessToken: process.env.WP08_HOST_ACCESS_TOKEN,
        user: (
          await request('/api/v1/auth/me', {
            token: process.env.WP08_HOST_ACCESS_TOKEN,
          })
        ).payload,
      }
    : await login(hostEmail, hostPassword);
  const admin = await login(adminEmail, adminPassword);
  const hostProfile = await request('/api/v1/hosts/profile', {
    token: host.accessToken,
    expected: [200, 404],
  });
  if (hostProfile.response.status !== 200 || hostProfile.payload.status !== 'APPROVED') {
    fail(
      `WP08-02 requires the approved Host produced by WP08-01. The configured Host identity is missing or not approved.`,
    );
  }
  const hostUserId = host.user.id ?? host.user.userId;
  if (!hostUserId) fail('Approved Host session is missing its user ID');
  pass('Approved Host and Admin sessions are available');

  beginCheck('Two real audience users were registered');
  const listener = await registerListener('ticketed');
  const blockedListener = await registerListener('blocked');
  pass('Two real audience users were registered');

  beginCheck('Approved Host scheduled a protected paid room');
  const scheduledStartTime = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const scheduled = await request('/api/v1/scheduled-rooms', {
    method: 'POST',
    token: host.accessToken,
    expected: 201,
    json: {
      title: `WP08-02 Protected Room ${Date.now()}`,
      description: 'Real room lifecycle, audience and moderation acceptance',
      category: 'Acceptance',
      language: 'en',
      scheduledStartTime,
      durationMinutes: 30,
      visibility: 'PRIVATE',
      isInviteOnly: true,
      maxParticipants: 20,
      isPremium: true,
      ticketPriceAmount: 1,
      currency: 'USD',
    },
  });
  if (scheduled.payload.status !== 'SCHEDULED') {
    fail('Scheduled room did not enter SCHEDULED state');
  }
  pass('Approved Host scheduled a protected paid room');

  beginCheck('Ticket purchase and offline live-room creation succeeded');
  await request(`/api/v1/scheduled-rooms/${scheduled.payload.id}/buy-ticket`, {
    method: 'POST',
    token: listener.accessToken,
    expected: 201,
    json: {},
  });
  const room = await request('/api/v1/rooms', {
    method: 'POST',
    token: host.accessToken,
    expected: 201,
    json: {
      title: scheduled.payload.title,
      scheduledRoomId: scheduled.payload.id,
    },
  });
  if (room.payload.status !== 'offline' || room.payload.isLive !== false) {
    fail('New live-room record must begin offline');
  }
  const publicDiscovery = await request(
    `/api/v1/rooms?search=${encodeURIComponent(scheduled.payload.title)}`,
  );
  if (
    Array.isArray(publicDiscovery.payload.data) &&
    publicDiscovery.payload.data.some((entry) => entry.id === room.payload.id)
  ) {
    fail('Restricted room leaked into the public room catalogue');
  }
  pass('Ticket purchase and offline live-room creation succeeded');

  beginCheck('Authenticated sockets cannot join an offline room');
  const hostSocket = await connectRealtime(host.accessToken);
  const listenerSocket = await connectRealtime(listener.accessToken);
  const blockedSocket = await connectRealtime(blockedListener.accessToken);
  expectSocketFailure(
    await emitAck(listenerSocket, 'presence:join', {
      roomId: room.payload.id,
      userId: hostUserId,
      username: 'Spoofed Host',
    }),
    'INVALID_ROOM_STATE',
    'presence:join before start',
  );
  pass('Authenticated sockets cannot join an offline room');

  beginCheck('Room start transition atomically activated the scheduled room');
  const started = await request(`/api/v1/rooms/${room.payload.id}/start`, {
    method: 'POST',
    token: host.accessToken,
    expected: [200, 201],
  });
  if (started.payload.status !== 'live' || started.payload.isLive !== true) {
    fail('Room did not enter live state');
  }
  const liveScheduled = await request(
    `/api/v1/scheduled-rooms/${scheduled.payload.id}`,
  );
  if (liveScheduled.payload.status !== 'LIVE') {
    fail('Linked scheduled room did not enter LIVE state');
  }
  await request(`/api/v1/rooms/${room.payload.id}/start`, {
    method: 'POST',
    token: host.accessToken,
    expected: 400,
  });
  pass('Room start transition atomically activated the scheduled room');

  beginCheck('Host joined; ticket and invitation requirements were enforced');
  expectSocketSuccess(
    await emitAck(hostSocket, 'presence:join', { roomId: room.payload.id }),
    'Host presence:join',
  );
  expectSocketFailure(
    await emitAck(listenerSocket, 'presence:join', { roomId: room.payload.id }),
    'INVITATION_REQUIRED',
    'ticketed listener before invitation',
  );
  expectSocketSuccess(
    await emitAck(hostSocket, 'room:invite_participant', {
      roomId: room.payload.id,
      targetUserId: listener.userId,
    }),
    'Host invite ticketed listener',
  );
  const joinedEvent = waitForEvent(hostSocket, 'user_joined');
  expectSocketSuccess(
    await emitAck(listenerSocket, 'presence:join', {
      roomId: room.payload.id,
      userId: hostUserId,
      username: 'Ticketed Listener',
    }),
    'ticketed listener presence:join',
  );
  const joinedPayload = await joinedEvent;
  if (joinedPayload.userId !== listener.userId) {
    fail('Realtime server trusted a spoofed payload userId');
  }
  expectSocketSuccess(
    await emitAck(hostSocket, 'room:invite_participant', {
      roomId: room.payload.id,
      targetUserId: blockedListener.userId,
    }),
    'Host invite non-ticketed listener',
  );
  expectSocketFailure(
    await emitAck(blockedSocket, 'presence:join', { roomId: room.payload.id }),
    'TICKET_REQUIRED',
    'invited listener without ticket',
  );
  pass('Host joined; ticket and invitation requirements were enforced');

  beginCheck('Speaker queue, promotion, mute, unmute and demotion worked');
  expectSocketSuccess(
    await emitAck(listenerSocket, 'queue:join', { roomId: room.payload.id }),
    'queue:join',
  );
  expectSocketSuccess(
    await emitAck(hostSocket, 'stage:promote', {
      roomId: room.payload.id,
      targetUserId: listener.userId,
    }),
    'stage:promote',
  );
  expectSocketSuccess(
    await emitAck(hostSocket, 'stage:mute', {
      roomId: room.payload.id,
      targetUserId: listener.userId,
    }),
    'stage:mute',
  );
  expectSocketSuccess(
    await emitAck(hostSocket, 'stage:unmute', {
      roomId: room.payload.id,
      targetUserId: listener.userId,
    }),
    'stage:unmute',
  );
  expectSocketSuccess(
    await emitAck(hostSocket, 'stage:demote', {
      roomId: room.payload.id,
      targetUserId: listener.userId,
    }),
    'stage:demote',
  );
  pass('Speaker queue, promotion, mute, unmute and demotion worked');

  beginCheck('Kick, rejoin, ban and unban controls were enforced');
  expectSocketSuccess(
    await emitAck(hostSocket, 'room:kick_participant', {
      roomId: room.payload.id,
      targetUserId: listener.userId,
      reason: 'WP08-02 kick acceptance',
    }),
    'room:kick_participant',
  );
  expectSocketFailure(
    await emitAck(listenerSocket, 'reaction:send', {
      roomId: room.payload.id,
      emoji: '🔥',
    }),
    'NOT_IN_ROOM',
    'reaction after kick',
  );
  expectSocketSuccess(
    await emitAck(listenerSocket, 'presence:join', { roomId: room.payload.id }),
    'presence:join after kick',
  );
  expectSocketSuccess(
    await emitAck(hostSocket, 'room:ban_participant', {
      roomId: room.payload.id,
      targetUserId: listener.userId,
      reason: 'WP08-02 ban acceptance',
    }),
    'room:ban_participant',
  );
  expectSocketFailure(
    await emitAck(listenerSocket, 'presence:join', { roomId: room.payload.id }),
    'ROOM_BANNED',
    'presence:join while banned',
  );
  expectSocketSuccess(
    await emitAck(hostSocket, 'room:unban_participant', {
      roomId: room.payload.id,
      targetUserId: listener.userId,
    }),
    'room:unban_participant',
  );
  expectSocketSuccess(
    await emitAck(listenerSocket, 'presence:join', { roomId: room.payload.id }),
    'presence:join after unban',
  );
  pass('Kick, rejoin, ban and unban controls were enforced');

  beginCheck('Pause, resume and terminal end transitions were enforced');
  const paused = await request(`/api/v1/rooms/${room.payload.id}/pause`, {
    method: 'POST',
    token: host.accessToken,
    expected: [200, 201],
  });
  if (paused.payload.status !== 'paused' || paused.payload.isLive !== false) {
    fail('Room pause state is invalid');
  }
  expectSocketSuccess(
    await emitAck(listenerSocket, 'reaction:send', {
      roomId: room.payload.id,
      emoji: '👏',
    }),
    'reaction while paused',
  );
  const resumed = await request(`/api/v1/rooms/${room.payload.id}/resume`, {
    method: 'POST',
    token: host.accessToken,
    expected: [200, 201],
  });
  if (resumed.payload.status !== 'live' || resumed.payload.isLive !== true) {
    fail('Room resume state is invalid');
  }
  const ended = await request(`/api/v1/rooms/${room.payload.id}/end`, {
    method: 'POST',
    token: host.accessToken,
    expected: [200, 201],
  });
  if (ended.payload.status !== 'ended' || ended.payload.isLive !== false) {
    fail('Room end state is invalid');
  }
  await request(`/api/v1/rooms/${room.payload.id}/end`, {
    method: 'POST',
    token: host.accessToken,
    expected: 400,
  });
  await request(`/api/v1/rooms/${room.payload.id}/start`, {
    method: 'POST',
    token: host.accessToken,
    expected: 400,
  });
  expectSocketFailure(
    await emitAck(listenerSocket, 'reaction:send', {
      roomId: room.payload.id,
      emoji: '🔥',
    }),
    'INVALID_ROOM_STATE',
    'reaction after room ended',
  );
  const completedScheduled = await request(
    `/api/v1/scheduled-rooms/${scheduled.payload.id}`,
  );
  if (completedScheduled.payload.status !== 'COMPLETED') {
    fail('Linked scheduled room did not enter COMPLETED state');
  }
  pass('Pause, resume and terminal end transitions were enforced');

  beginCheck('Audience reporting and Admin moderation review were persisted');
  const report = await request('/api/v1/reports', {
    method: 'POST',
    token: listener.accessToken,
    expected: 201,
    json: {
      targetType: 'ROOM',
      targetId: room.payload.id,
      reason: 'ABUSE',
      description: 'WP08-02 real moderation workflow acceptance',
    },
  });
  if (!report.payload.id || report.payload.status !== 'PENDING') {
    fail('Audience report was not persisted in PENDING status');
  }
  const myReports = await request('/api/v1/reports/my-reports', {
    token: listener.accessToken,
    expected: 200,
  });
  if (
    !Array.isArray(myReports.payload) ||
    !myReports.payload.some((entry) => entry.id === report.payload.id)
  ) {
    fail('Submitted report was not visible to its reporter');
  }
  await request('/api/v1/moderation/reports', {
    token: listener.accessToken,
    expected: 403,
  });
  const adminReports = await request('/api/v1/moderation/reports', {
    token: admin.accessToken,
    expected: 200,
  });
  if (
    !Array.isArray(adminReports.payload.data) ||
    !adminReports.payload.data.some((entry) => entry.id === report.payload.id)
  ) {
    fail('Admin moderation queue did not contain the submitted room report');
  }
  const approvedReport = await request(
    `/api/v1/moderation/reports/${report.payload.id}/approve`,
    {
      method: 'PATCH',
      token: admin.accessToken,
      expected: 200,
      json: { resolutionNotes: 'Approved by WP08-02 acceptance' },
    },
  );
  if (approvedReport.payload.status !== 'APPROVED') {
    fail('Admin moderation did not approve the persisted report');
  }
  pass('Audience reporting and Admin moderation review were persisted');

  await closeSockets();
  console.log('============================================================');
  console.log(`WP08-02 REAL ACCEPTANCE PASSED (${completedChecks} checks)`);
  console.log('============================================================');
}

if (process.argv.includes('--self-check')) {
  try {
    selfCheck();
  } catch (error) {
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  }
} else {
  try {
    await run();
  } catch (error) {
    console.error('============================================================');
    console.error('WP08-02 REAL ACCEPTANCE FAILED');
    if (activeCheck) {
      console.error(
        `Failed check: ${String(activeCheck.number).padStart(2, '0')} - ${activeCheck.name}`,
      );
    }
    if (lastRequest) {
      console.error(
        `Last request: ${lastRequest.method} ${lastRequest.url} -> ${lastRequest.status}`,
      );
      console.error(`Response: ${lastRequest.body ?? '(empty)'}`);
    }
    console.error(error instanceof Error ? error.stack : error);
    console.error('============================================================');
    process.exitCode = 1;
  } finally {
    await closeSockets();
  }
}
