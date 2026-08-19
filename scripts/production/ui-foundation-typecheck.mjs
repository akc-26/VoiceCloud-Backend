import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const tscEntry = resolve(root, 'node_modules/typescript/bin/tsc');
const targets = [
  ['Admin', 'admin/tsconfig.json'],
  ['Creator', 'creator/tsconfig.json'],
  ['Website', 'website/tsconfig.json'],
];

if (!existsSync(tscEntry)) {
  throw new Error(
    'Local TypeScript compiler is unavailable. Run npm ci --include=dev before typechecking.',
  );
}

const failures = [];
for (const [label, config] of targets) {
  console.log(`\n[TYPECHECK] ${label}: ${config}`);
  const result = spawnSync(
    process.execPath,
    [tscEntry, '-p', config, '--noEmit'],
    {
      cwd: root,
      env: process.env,
      stdio: 'inherit',
      shell: false,
    },
  );
  if (result.error) {
    failures.push(`${label}: ${result.error.message}`);
    continue;
  }
  if (result.status !== 0) {
    failures.push(`${label}: exit code ${result.status ?? 'unknown'}`);
  } else {
    console.log(`[TYPECHECK] ${label}: PASS`);
  }
}

if (failures.length) {
  console.error('\nFrontend TypeScript typecheck failures:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('\nAdmin, Creator and Website TypeScript typechecks passed.');
}
