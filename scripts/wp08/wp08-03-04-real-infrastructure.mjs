import process from 'node:process';
import Redis from 'ioredis';
import { Queue } from 'bullmq';
import { io } from 'socket.io-client';

const baseUrl = (process.env.WP08_BASE_URL ?? 'http://127.0.0.1:3000').replace(
  /\/$/,
  '',
);
const requestTimeoutMs = Number(process.env.WP08_REQUEST_TIMEOUT_MS ?? 15000);
const socketTimeoutMs = Number(process.env.WP08_SOCKET_TIMEOUT_MS ?? 10000);
const adminEmail = process.env.DEV_ADMIN_EMAIL ?? 'admin@voicecloud.com';
const adminPassword = process.env.DEV_ADMIN_PASSWORD ?? 'AdminPass123!';
const creatorEmail = process.env.DEV_CREATOR_EMAIL ?? 'creator@voicecloud.com';
const creatorPassword = process.env.DEV_CREATOR_PASSWORD ?? 'CreatorPass123!';
const redisHost = process.env.REDIS_HOST ?? 'localhost';
const redisPort = Number(process.env.REDIS_PORT ?? 6379);

let completed = 0;
const sockets = new Set();
let redis;
let notificationQueue;
let notificationJob;

function begin(name) {
  console.log(`[RUN ${String(completed + 1).padStart(2, '0')}] ${name}`);
}
function pass(message) {
  completed += 1;
  console.log(`[PASS ${String(completed).padStart(2, '0')}] ${message}`);
}
function fail(message) {
  throw new Error(message);
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), requestTimeoutMs);
  timer.unref?.();
  try {
    const headers = new Headers(options.headers ?? {});
    if (options.token) headers.set('Authorization', `Bearer ${options.token}`);
    if (options.json !== undefined)
      headers.set('Content-Type', 'application/json');
    const response = await fetch(`${baseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body:
        options.json === undefined ? undefined : JSON.stringify(options.json),
      signal: controller.signal,
    });
    const contentType = response.headers.get('content-type') ?? '';
    const payload = contentType.includes('application/json')
      ? await response.json()
      : await response.text();
    const expected = Array.isArray(options.expected)
      ? options.expected
      : [options.expected ?? 200];
    if (!expected.includes(response.status)) {
      fail(
        `${options.method ?? 'GET'} ${path} returned ${response.status}; expected ${expected.join(' or ')}. ${JSON.stringify(payload).slice(0, 1200)}`,
      );
    }
    return payload;
  } finally {
    clearTimeout(timer);
  }
}

async function login(email, password) {
  const payload = await request('/api/v1/auth/login', {
    method: 'POST',
    json: { email, password },
  });
  if (!payload?.accessToken || !payload?.user?.id) {
    fail(`Login for ${email} returned an incomplete session`);
  }
  return payload;
}

async function connectRealtime(token) {
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
    socket.connect();
  });
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

function expectNoEvent(socket, event, durationMs = 1200) {
  return new Promise((resolve, reject) => {
    const handler = () => {
      clearTimeout(timer);
      reject(
        new Error(`Unexpected ${event} event reached a non-target socket`),
      );
    };
    const timer = setTimeout(() => {
      socket.off(event, handler);
      resolve();
    }, durationMs);
    timer.unref?.();
    socket.once(event, handler);
  });
}

async function run() {
  console.log('============================================================');
  console.log(
    'VoiceCloud WP08-03-04 - REAL UI/API + PostgreSQL/Redis/BullMQ/Socket.IO acceptance',
  );
  console.log(`Base URL: ${baseUrl}`);
  console.log('============================================================');

  begin('Real infrastructure health is authoritative');
  const health = await request('/health');
  if (
    health?.status !== 'ok' ||
    health?.database !== 'connected' ||
    health?.redis !== 'connected' ||
    health?.infrastructure?.realInfrastructure !== true
  ) {
    fail(
      `Health does not prove real infrastructure: ${JSON.stringify(health)}`,
    );
  }
  pass('PostgreSQL and Redis are connected in real infrastructure mode');

  begin('Admin and Creator sessions authenticate');
  const [admin, creator] = await Promise.all([
    login(adminEmail, adminPassword),
    login(creatorEmail, creatorPassword),
  ]);
  pass('Seeded Admin and Creator sessions authenticated');

  begin(
    'Creator Studio financial and notification APIs return persisted shapes',
  );
  const [wallet, transactions, earnings, payouts, notifications, unread] =
    await Promise.all([
      request('/api/v1/wallet/summary', { token: creator.accessToken }),
      request('/api/v1/wallet/transactions?page=1&limit=20', {
        token: creator.accessToken,
      }),
      request('/api/v1/creator/earnings', { token: creator.accessToken }),
      request('/api/v1/creator/payout-requests?page=1&limit=20', {
        token: creator.accessToken,
      }),
      request('/api/v1/notifications?page=1&limit=20', {
        token: creator.accessToken,
      }),
      request('/api/v1/notifications/unread-count', {
        token: creator.accessToken,
      }),
    ]);
  if (!wallet?.wallet || typeof wallet.wallet.withdrawableBalance !== 'number')
    fail('Creator wallet summary shape is invalid');
  if (!Array.isArray(transactions?.data))
    fail('Creator wallet transactions shape is invalid');
  if (typeof earnings?.pendingPayoutsAmount !== 'number')
    fail('Creator earnings shape is invalid');
  if (!Array.isArray(payouts?.data)) fail('Creator payouts shape is invalid');
  if (
    !Array.isArray(notifications?.data) ||
    typeof unread?.unreadCount !== 'number'
  )
    fail('Creator notifications shape is invalid');
  pass(
    'Creator Wallet/Earnings/Payouts/Notifications APIs returned real persisted response shapes',
  );

  begin(
    'Admin economy, Gifts, VIP, Tasks and notification APIs return persisted shapes',
  );
  const [
    economy,
    ledger,
    creatorPayouts,
    gifts,
    categories,
    giftRevenue,
    vipDashboard,
    vipTiers,
    taskAnalytics,
    deliveryLog,
  ] = await Promise.all([
    request('/api/v1/admin/wallet/overview', { token: admin.accessToken }),
    request('/api/v1/admin/wallet/transactions?page=1&limit=20', {
      token: admin.accessToken,
    }),
    request('/api/v1/admin/wallet/creator/payouts', {
      token: admin.accessToken,
    }),
    request('/api/v1/gifts/admin/catalog', { token: admin.accessToken }),
    request('/api/v1/gifts/admin/categories', { token: admin.accessToken }),
    request('/api/v1/gifts/analytics/revenue?timeframe=daily', {
      token: admin.accessToken,
    }),
    request('/api/v1/vip/admin/dashboard', { token: admin.accessToken }),
    request('/api/v1/vip/admin/tiers', { token: admin.accessToken }),
    request('/api/v1/admin/tasks-achievements/analytics', {
      token: admin.accessToken,
    }),
    request('/api/v1/notifications/admin/delivery-log?page=1&limit=100', {
      token: admin.accessToken,
    }),
  ]);
  if (typeof economy?.totalRevenueUsd !== 'number')
    fail('Admin wallet overview shape is invalid');
  if (!Array.isArray(ledger?.data) || !Array.isArray(creatorPayouts))
    fail('Admin economy read shapes are invalid');
  if (!Array.isArray(gifts) || !Array.isArray(categories))
    fail('Admin gift catalog/category shapes are invalid');
  if (typeof giftRevenue?.totalTransactions !== 'number')
    fail('Gift revenue shape is invalid');
  if (
    typeof vipDashboard?.activeMembers !== 'number' ||
    !Array.isArray(vipTiers)
  )
    fail('VIP Admin shapes are invalid');
  if (!taskAnalytics || typeof taskAnalytics !== 'object')
    fail('Task analytics shape is invalid');
  if (!Array.isArray(deliveryLog?.data))
    fail('Admin notification delivery log shape is invalid');
  pass(
    'Admin Wallet/Gifts/VIP/Tasks/Notifications APIs returned persisted response shapes',
  );

  begin(
    'Authenticated Socket.IO isolates the persisted notification to its target user',
  );
  const [creatorSocket, adminSocket] = await Promise.all([
    connectRealtime(creator.accessToken),
    connectRealtime(admin.accessToken),
  ]);
  const realtimeEvent = waitForEvent(creatorSocket, 'notification:new');
  const adminIsolation = expectNoEvent(adminSocket, 'notification:new');
  const operationKey = `wp08-03-04:${Date.now()}:${creator.user.id}`;
  const created = await request('/api/v1/notifications/admin', {
    method: 'POST',
    expected: 201,
    token: admin.accessToken,
    json: {
      userId: creator.user.id,
      type: 'SYSTEM',
      title: 'WP08-03-04 real delivery acceptance',
      message:
        'Persisted notification used to verify Socket.IO and BullMQ recovery.',
      operationKey,
    },
  });
  const eventPayload = await realtimeEvent;
  await adminIsolation;
  if (!created?.id || eventPayload?.notification?.id !== created.id) {
    fail(
      `Socket.IO notification event did not match persisted record ${created?.id}`,
    );
  }
  pass(
    'Creator socket observed the persisted notification and the non-target Admin socket received nothing',
  );

  begin('Real Redis and BullMQ process the persisted notification identity');
  redis = new Redis({
    host: redisHost,
    port: redisPort,
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });
  await redis.connect();
  if ((await redis.ping()) !== 'PONG') fail('Redis PING did not return PONG');
  notificationQueue = new Queue('notification-queue', {
    connection: {
      host: redisHost,
      port: redisPort,
      maxRetriesPerRequest: null,
    },
  });
  notificationJob = await notificationQueue.add(
    'send-push',
    {
      notificationId: created.id,
      operationKey,
      userId: creator.user.id,
      title: created.title,
      body: created.message,
      type: created.type,
    },
    {
      jobId: `wp08-03-04-${created.id}`,
      attempts: 1,
      removeOnComplete: false,
      removeOnFail: false,
    },
  );
  let jobState = 'unknown';
  for (let attempt = 0; attempt < 60; attempt += 1) {
    jobState = await notificationJob.getState();
    if (jobState === 'completed' || jobState === 'failed') break;
    await sleep(250);
  }
  if (jobState !== 'completed')
    fail(`Notification BullMQ job did not complete; state=${jobState}`);
  pass('BullMQ worker completed the real Redis-backed notification job');

  begin('Delivery retry updates one PostgreSQL record without duplication');
  let finalLog;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    finalLog = await request(
      '/api/v1/notifications/admin/delivery-log?page=1&limit=100',
      {
        token: admin.accessToken,
      },
    );
    const row = finalLog.data.find((item) => item.id === created.id);
    if (
      row &&
      Number(row.deliveryAttemptCount) >= 1 &&
      !['PENDING', 'SENDING'].includes(row.deliveryStatus)
    )
      break;
    await sleep(250);
  }
  const matching = finalLog.data.filter((item) => item.id === created.id);
  if (matching.length !== 1)
    fail(
      `Expected exactly one persisted notification row, found ${matching.length}`,
    );
  const delivered = matching[0];
  if (Number(delivered.deliveryAttemptCount) < 1)
    fail('Notification delivery attempt was not persisted');
  if (['PENDING', 'SENDING'].includes(delivered.deliveryStatus))
    fail(`Notification remained in ${delivered.deliveryStatus}`);
  pass(
    `PostgreSQL retained one notification record with deliveryStatus=${delivered.deliveryStatus} and attempts=${delivered.deliveryAttemptCount}`,
  );

  begin('Creator notification read APIs operate on the same persisted data');
  const creatorList = await request('/api/v1/notifications?page=1&limit=100', {
    token: creator.accessToken,
  });
  if (!creatorList.data.some((item) => item.id === created.id))
    fail(
      'Creator notification list does not contain the persisted Admin notification',
    );
  await request(`/api/v1/notifications/${created.id}/read`, {
    method: 'PATCH',
    token: creator.accessToken,
  });
  const readBack = await request(`/api/v1/notifications/${created.id}`, {
    token: creator.accessToken,
  });
  if (readBack?.isRead !== true)
    fail('Creator notification read state was not persisted');
  pass('Creator read action persisted against the same notification identity');

  console.log('');
  console.log(`WP08-03-04_REAL_CHECKS=${completed}`);
  console.log('WP08-03-04 REAL INFRASTRUCTURE ACCEPTANCE PASSED');
}

try {
  await run();
} finally {
  for (const socket of sockets) socket.disconnect();
  if (notificationJob) await notificationJob.remove().catch(() => undefined);
  if (notificationQueue) await notificationQueue.close().catch(() => undefined);
  if (redis) await redis.quit().catch(() => undefined);
}
