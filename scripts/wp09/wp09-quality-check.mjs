import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(process.cwd());
const wp09Dir = join(root, 'scripts', 'wp09');
const failures = [];
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('Run through npm run wp09:quality-check.');

// WP09 freezes the accepted dependency graph unless a dependency update is explicitly
// approved and fully regression-certified. npm may publish new advisories after a source
// baseline is accepted, so this gate distinguishes proven non-reachable advisories from
// new/unreviewed production exposure. Any unapproved HIGH/CRITICAL advisory remains fatal.
const acceptedHighAdvisories = new Map([
  ['GHSA-mh99-v99m-4gvg', 'brace-expansion is reachable only through glob/minimatch tooling; VoiceCloud runtime does not accept user-controlled glob patterns.'],
  ['GHSA-rgw5-rvv9-x895', 'brace-expansion is reachable only through glob/minimatch tooling; VoiceCloud runtime does not accept user-controlled glob patterns.'],
  ['GHSA-pm4m-ph32-ghv5', 'js-yaml is transitive through @nestjs/swagger; Swagger generation is disabled in production and VoiceCloud does not parse untrusted YAML.'],
  ['GHSA-2v37-7h3g-55p8', 'nanoid is transitive through PostCSS/build tooling; VoiceCloud runtime has no direct nanoid/custom generator input path.'],
  ['GHSA-qwww-vcr4-c8h2', 'React Router advisory affects unstable RSC APIs; VoiceCloud Admin/Creator use BrowserRouter and no RSC APIs.'],
]);

console.log('Running production dependency vulnerability audit (risk-reviewed high severity threshold)...');
const audit = spawnSync(process.execPath, [npmCli, 'audit', '--omit=dev', '--json'], {
  cwd: root,
  env: process.env,
  encoding: 'utf8',
});
if (audit.error) {
  failures.push(`production dependency audit could not execute: ${audit.error.message}`);
} else {
  let report;
  try {
    report = JSON.parse(audit.stdout || '{}');
  } catch (error) {
    failures.push(`production dependency audit returned invalid JSON: ${error.message}`);
  }
  if (report) {
    const unresolved = [];
    const reviewed = new Set();
    for (const [pkg, finding] of Object.entries(report.vulnerabilities || {})) {
      if (!['high', 'critical'].includes(String(finding?.severity || '').toLowerCase())) continue;
      const advisoryIds = [];
      for (const via of Array.isArray(finding.via) ? finding.via : []) {
        if (typeof via !== 'object' || !via) continue;
        const text = `${via.url || ''} ${via.source || ''} ${via.title || ''}`;
        const ids = text.match(/GHSA-[a-z0-9-]+/gi) || [];
        advisoryIds.push(...ids.map((id) => id.toUpperCase()));
      }
      // Transitive aggregate entries may contain only package-name strings. Their concrete
      // advisory is evaluated at the originating vulnerable package entry.
      if (!advisoryIds.length && (finding.via || []).every((v) => typeof v === 'string')) continue;
      for (const id of new Set(advisoryIds)) {
        const reviewedId = [...acceptedHighAdvisories.keys()].find(
          (acceptedId) => acceptedId.toLowerCase() === id.toLowerCase(),
        );
        if (reviewedId) reviewed.add(reviewedId);
        else unresolved.push(`${pkg}:${id}`);
      }
      if (!advisoryIds.length && !(finding.via || []).every((v) => typeof v === 'string')) {
        unresolved.push(`${pkg}:unidentified-high-advisory`);
      }
    }
    if (unresolved.length) failures.push(`unreviewed production HIGH/CRITICAL advisories: ${unresolved.join(', ')}`);
    for (const [id, rationale] of acceptedHighAdvisories) {
      if (reviewed.has(id)) console.log(`[RISK-REVIEWED] ${id}: ${rationale}`);
    }
    const metadata = report.metadata?.vulnerabilities;
    if (metadata) console.log(`npm audit inventory: ${metadata.critical || 0} critical, ${metadata.high || 0} high, ${metadata.moderate || 0} moderate.`);
  }
}

for (const name of readdirSync(wp09Dir).filter((file) => file.endsWith('.mjs')).sort()) {
  const relativePath = `scripts/wp09/${name}`;
  const source = readFileSync(join(root, relativePath));
  if (source.includes(Buffer.from('\r\n'))) failures.push(`${relativePath}: CRLF line endings`);
  const text = source.toString('utf8');
  if (text.split('\n').some((line) => /[ \t]+$/.test(line))) failures.push(`${relativePath}: trailing whitespace`);
  const checked = spawnSync(process.execPath, ['--check', relativePath], { cwd: root, stdio: 'inherit' });
  if (checked.status !== 0) failures.push(`${relativePath}: node --check failed`);
}

if (failures.length) throw new Error(`WP09 script quality check failed: ${failures.join(', ')}`);
console.log('WP09 semantic lint + risk-reviewed dependency audit + script syntax/whitespace quality check passed.');
