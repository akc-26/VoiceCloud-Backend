import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const checks = [];
const add = (label, pass) => checks.push([label, Boolean(pass)]);

const auth = read('src/common/events/services/realtime-socket-auth.service.ts');
add('Production realtime auth has no obsolete synchronous accessor', !/getAuthenticatedUser\s*\(/.test(auth));
add('Legacy Authenticated socket user required runtime text is removed', !/Authenticated socket user required/.test(auth));
add('Realtime auth shares an in-flight verification promise', /authPromise[\s\S]*verifyAndAttach[\s\S]*await authPromise/.test(auth));

const phase3a = read('src/common/events/phase3a-realtime.spec.ts');
add('Phase3A heartbeat regression awaits async handler', /should respond to heartbeat\/ping', async \(\) =>[\s\S]*await presenceGateway\.handlePing/.test(phase3a));

const wp08 = read('src/wp08/wp08-02-realtime-security.spec.ts');
add('WP08 private-count regression mocks awaited authentication contract', /does not disclose private room participant counts[\s\S]*ensureAuthenticatedUser: jest\.fn\(\)\.mockResolvedValue/.test(wp08));

for (const [label, file, arg] of [
  ['Creator rooms Pause survives local microphone cleanup failure', 'creator/src/pages/LiveRoomsPage.tsx', 'id'],
  ['Creator console Pause survives local microphone cleanup failure', 'creator/src/pages/LiveRoomConsolePage.tsx', 'roomId'],
  ['Creator schedule Pause survives local microphone cleanup failure', 'creator/src/pages/SchedulePage.tsx', 'roomId'],
]) {
  const text = read(file);
  const escaped = arg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  add(label, new RegExp(`stopSpeaking\\(${escaped}\\)\\.catch\\(\\(\\) => undefined\\)[\\s\\S]*creatorApi\\.pauseRoom\\(${escaped}\\)`).test(text));
}

const runtimeSpec = read('src/common/events/realtime-socket-auth.r13.spec.ts');
add('R13 runtime regression exercises handler during in-flight connection authentication', /connectionAuth = auth\.authenticate\(client\)[\s\S]*handlerResult = presence\.handlePing[\s\S]*toHaveBeenCalledTimes\(1\)/.test(runtimeSpec));

let failures = 0;
for (const [label, pass] of checks) {
  if (pass) console.log(`PASS - ${label}`);
  else {
    failures += 1;
    console.error(`FAIL - ${label}`);
  }
}

console.log(`R13 live-room corrections source check: ${checks.length - failures}/${checks.length}`);
if (failures) process.exit(1);
