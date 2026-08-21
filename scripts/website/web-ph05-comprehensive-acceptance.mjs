import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const node = process.execPath;

const entries = {
  tsc: 'node_modules/typescript/bin/tsc',
  jest: 'node_modules/jest/bin/jest.js',
  vite: 'node_modules/vite/bin/vite.js',
  nest: 'node_modules/@nestjs/cli/bin/nest.js',
};

const wp08RoomTests = [
  'src/modules/rooms/room-lifecycle.service.spec.ts',
  'src/modules/rooms/rooms.service.wp08-02.spec.ts',
  'src/modules/rooms/scheduled-rooms.service.spec.ts',
  'src/common/events/realtime-room-access.wp08-02.spec.ts',
  'src/common/events/phase3a-realtime.spec.ts',
  'src/common/events/phase3b-redis.spec.ts',
  'src/wp08/wp08-02-realtime-security.spec.ts',
  'src/modules/moderation/moderation-rbac.wp08-02.spec.ts',
  'src/database/migrations/phase08-room-lifecycle-authority.spec.ts',
  'src/database/migrations/scheduled-room-timezone-authority.spec.ts',
];

const focusedRoomTests = [
  'src/modules/rtc/livekit-provider.runtime.spec.ts',
  'src/modules/admin/provider-test-connection.livekit.spec.ts',
  'src/modules/rooms/room-lifecycle.service.spec.ts',
  'src/modules/rooms/rooms.service.wp08-02.spec.ts',
  'src/common/events/realtime-room-access.wp08-02.spec.ts',
  'src/common/events/realtime-socket-auth.r12.spec.ts',
  'src/common/events/realtime-socket-auth.r13.spec.ts',
];

const rtcAuthorityTests = [
  'src/modules/rtc/r11-rtc-role-authority.spec.ts',
  'src/modules/rtc/phase20-rtc.spec.ts',
];

const gates = [
  ['PH01 protected foundation source check', [step('scripts/website/web-ph01-source-check.mjs')]],
  ['PH02 protected authentication source check', [step('scripts/website/web-ph02-source-check.mjs')]],
  ['PH03 protected discovery/social source check', [step('scripts/website/web-ph03-source-check.mjs')]],
  ['PH04 protected communities/messaging source check', [step('scripts/website/web-ph04-source-check.mjs')]],
  ['PH05 live-room source check', [step('scripts/website/web-ph05-source-check.mjs')]],
  ['Backend constructor-contract audit', [step('scripts/website/backend-constructor-contract-check.mjs')]],
  ['R12 live-room/runtime correction source regression', [step('scripts/r12/r12-live-room-corrections-source-check.mjs')]],
  ['R13 acceptance/runtime correction source regression', [step('scripts/r13/r13-live-room-corrections-source-check.mjs')]],
  ['Website TypeScript', [step(entries.tsc, ['-p', 'website/tsconfig.json', '--noEmit'], true)]],
  ['Creator TypeScript', [step(entries.tsc, ['-p', 'creator/tsconfig.json', '--noEmit'], true)]],
  ['Admin TypeScript', [step(entries.tsc, ['-p', 'admin/tsconfig.json', '--noEmit'], true)]],
  ['Backend/shared TypeScript', [step(entries.tsc, ['-p', 'tsconfig.json', '--noEmit'], true)]],
  ['PH05 focused live-room runtime tests', [step(entries.jest, ['--runInBand', '--runTestsByPath', ...focusedRoomTests], true)]],
  ['WP08-02 complete room/realtime/security tests', [step(entries.jest, ['--runInBand', '--runTestsByPath', ...wp08RoomTests], true)]],
  ['R13/Phase20 RTC authority tests', [step(entries.jest, ['--runInBand', '--runTestsByPath', ...rtcAuthorityTests], true)]],
  ['Website build', [step(entries.vite, ['build', '--config', 'website/vite.config.ts'], true)]],
  ['Creator Studio build', [step(entries.vite, ['build', '--config', 'creator/vite.config.ts'], true)]],
  ['Admin build', [step(entries.vite, ['build', '--config', 'admin/vite.config.ts'], true)]],
  ['R11 Admin source regression', [step('scripts/r11/r11-admin-qa-source-check.mjs')]],
  ['R11 Creator source regression', [step('scripts/r11/r11-creator-qa-source-check.mjs')]],
  ['R11 Backend source regression', [step('scripts/r11/r11-backend-authority-source-check.mjs')]],
  ['R11 RTC/Security source regression', [step('scripts/r11/r11-rtc-security-source-check.mjs')]],
  ['R11 API parity source regression', [step('scripts/r11/r11-api-parity-source-check.mjs')]],
  ['Nest backend build', [step(entries.nest, ['build'], true)]],
  ['Full integrated monolith build', [
    step(entries.nest, ['build'], true),
    step(entries.vite, ['build', '--config', 'website/vite.config.ts'], true),
    step(entries.vite, ['build', '--config', 'admin/vite.config.ts'], true),
    step(entries.vite, ['build', '--config', 'creator/vite.config.ts'], true),
  ]],
];

function step(entry, args = [], dependency = false) {
  return { entry, args, dependency };
}

function runNodeStep(item) {
  const absolute = path.resolve(root, item.entry);
  if (!fs.existsSync(absolute)) {
    const kind = item.dependency ? 'dependency entry point' : 'script';
    console.error(`[SPAWN-ERROR] Missing ${kind}: ${item.entry}`);
    return 127;
  }

  console.log(`> ${node} ${item.entry}${item.args.length ? ` ${item.args.join(' ')}` : ''}`);
  const result = spawnSync(node, [absolute, ...item.args], {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
    shell: false,
    windowsHide: false,
  });

  if (result.error) {
    console.error(
      `[SPAWN-ERROR] ${item.entry}: ${result.error.code ?? 'UNKNOWN'} ${result.error.message}`,
    );
    return typeof result.status === 'number' ? result.status : 126;
  }
  if (typeof result.status !== 'number') {
    console.error(`[SPAWN-ERROR] ${item.entry}: child process returned no exit status`);
    return 126;
  }
  return result.status;
}

// Verify the same direct Node dispatch mechanism used for every gate before doing any work.
const probe = spawnSync(node, ['-e', 'process.exit(0)'], {
  cwd: root,
  env: process.env,
  stdio: 'inherit',
  shell: false,
  windowsHide: false,
});
if (probe.error || probe.status !== 0) {
  console.error(
    `[FATAL] Node child-process dispatch probe failed: ${probe.error?.message ?? `exit ${probe.status}`}`,
  );
  process.exit(1);
}
console.log('[PASS] Cross-platform Node command-dispatch probe');

const failures = [];
for (let index = 0; index < gates.length; index += 1) {
  const [name, steps] = gates[index];
  console.log(`\n[VC-WEB-PH05-R13][${index + 1}/${gates.length}] ${name}...`);
  let gateFailed = false;
  const stepFailures = [];

  for (const item of steps) {
    const status = runNodeStep(item);
    if (status !== 0) {
      gateFailed = true;
      stepFailures.push(`${item.entry} (exit ${status})`);
    }
  }

  if (!gateFailed) {
    console.log(`[PASS] ${name}`);
  } else {
    console.error(`[FAIL] ${name}`);
    for (const failure of stepFailures) console.error(`  - ${failure}`);
    failures.push({ name, stepFailures });
  }
}

console.log('\n============================================================');
console.log('VC-WEB-PH05-R13 COMPREHENSIVE ACCEPTANCE SUMMARY');
console.log('============================================================');
if (failures.length) {
  console.error(`${failures.length} gate(s) failed:`);
  for (const failure of failures) {
    console.error(` - ${failure.name}`);
    for (const stepFailure of failure.stepFailures) {
      console.error(`    * ${stepFailure}`);
    }
  }
  console.error('\n[FAIL] VC-WEB-PH05-R13 comprehensive acceptance failed.');
  process.exit(1);
}

console.log(`All ${gates.length} post-install acceptance gates passed.`);
console.log('[PASS] VC-WEB-PH05-R13 acceptance commands completed successfully.');
