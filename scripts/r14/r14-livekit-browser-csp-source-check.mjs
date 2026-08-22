import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const hardening = read('src/common/http/production-http-hardening.ts');
const browserRtc = read('shared/rtc/livekit-browser.ts');

const checks = [
  [
    'Production CSP explicitly allows the pinned LiveKit CDN origin',
    hardening.includes("script-src 'self' https://cdn.jsdelivr.net"),
  ],
  [
    'Production CSP is not weakened with wildcard script sources',
    !/script-src[^\n]*\*/.test(hardening),
  ],
  [
    'LiveKit browser loader remains pinned to an explicit SDK version',
    browserRtc.includes('https://cdn.jsdelivr.net/npm/livekit-client@2.22.0/dist/livekit-client.umd.min.js'),
  ],
  [
    'LiveKit browser loader does not use an unversioned latest URL',
    !/npm\/livekit-client(?:\/|@latest\/)/.test(browserRtc),
  ],
  [
    'LiveKit browser SDK error path remains visible to the room UI',
    browserRtc.includes('Unable to load LiveKit browser SDK from ${url}'),
  ],
];

let failed = 0;
for (const [name, ok] of checks) {
  if (ok) console.log(`PASS - ${name}`);
  else {
    failed += 1;
    console.error(`FAIL - ${name}`);
  }
}
console.log(`R14 LiveKit browser/CSP source check: ${checks.length - failed}/${checks.length}`);
if (failed) process.exit(1);
