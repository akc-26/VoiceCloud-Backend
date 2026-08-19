import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const EXCLUDED_DIRS = new Set(['.git','node_modules','dist','coverage','.cache','.release','uploads','private_uploads','private-storage','backups','release-smoke-staging','white-label-smoke-staging']);
const IGNORED_FILES = new Set(['scripts/wp09/wp09-r10-baseline-manifest.json']);

const normalizedHash = (file) => {
  const bytes = readFileSync(file);
  try {
    const text = bytes.toString('utf8').replace(/\r\n/g, '\n');
    return createHash('sha256').update(text, 'utf8').digest('hex');
  } catch {
    return createHash('sha256').update(bytes).digest('hex');
  }
};

const enumerate = (root) => {
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      if (EXCLUDED_DIRS.has(name)) continue;
      const absolute = join(dir, name);
      const info = statSync(absolute);
      if (info.isDirectory()) walk(absolute);
      else {
        const rel = relative(root, absolute).replaceAll('\\', '/');
        if (rel === '.env' || rel.endsWith('.log') || rel.endsWith('.tsbuildinfo') || rel.endsWith('.zip')) continue;
        out.push(rel);
      }
    }
  };
  walk(root);
  return out.sort();
};

export function verifyR10BaselineIntegrity(root, label = 'R10 protected baseline') {
  const manifestPath = join(root, 'scripts/wp09/wp09-r10-baseline-manifest.json');
  if (!existsSync(manifestPath)) return null;
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const baseline = manifest.baselineFiles || {};
  const approved = manifest.approvedChanges || {};
  const current = enumerate(root);
  const currentSet = new Set(current);

  let checkedBaseline = 0;
  let checkedChanges = 0;
  for (const [rel, expected] of Object.entries(baseline)) {
    if (approved[rel]) continue;
    if (!currentSet.has(rel)) throw new Error(`${label} failed: baseline file missing: ${rel}`);
    const actual = normalizedHash(join(root, rel));
    if (actual !== expected) throw new Error(`${label} failed: R09 baseline file changed outside approved R10 delta: ${rel}`);
    checkedBaseline++;
  }
  for (const [rel, expected] of Object.entries(approved)) {
    if (!currentSet.has(rel)) throw new Error(`${label} failed: approved R10 file missing: ${rel}`);
    const actual = normalizedHash(join(root, rel));
    if (actual !== expected) throw new Error(`${label} failed: approved R10 file changed after reconciliation: ${rel}`);
    checkedChanges++;
  }
  for (const rel of current) {
    if (IGNORED_FILES.has(rel)) continue;
    if (!(rel in baseline) && !(rel in approved)) throw new Error(`${label} failed: unexpected source/configuration file added: ${rel}`);
  }
  console.log(`${label} passed: ${checkedBaseline} R09 baseline files preserved after LF/CRLF normalization; ${checkedChanges} approved R10 files exact.`);
  console.log(`R10 baseline archive: ${manifest.baselineArchive || 'R09 Git export'} (${manifest.baselineArchiveSha256 || 'unknown SHA-256'})`);
  return { checkedBaseline, checkedChanges };
}
