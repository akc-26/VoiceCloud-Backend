import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const p = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(p) : [p];
});
const rel = (p) => path.relative(root, p).replaceAll('\\', '/');
const text = (p) => fs.readFileSync(p, 'utf8');
const normalize = (route) => {
  let v = route.split('?')[0].replace(/\$\{[^}]+\}/g, ':param').replace(/:[^/]+/g, ':param');
  v = v.replace(/\/+/g, '/');
  return v.length > 1 ? v.replace(/\/$/, '') : v;
};

const backend = new Set();
for (const file of walk(path.join(root, 'src')).filter((f) => f.endsWith('controller.ts'))) {
  const src = text(file);
  const controllerMatch = src.match(/@Controller\(([^)]*)\)/s);
  if (!controllerMatch) continue;
  const prefixes = [...controllerMatch[1].matchAll(/['"]([^'"]*)['"]/g)].map((m) => m[1]);
  if (!prefixes.length) prefixes.push('');
  for (const match of src.matchAll(/@(Get|Post|Put|Patch|Delete)\s*\(([^)]*)\)/gs)) {
    const method = match[1].toUpperCase();
    const routes = [...match[2].matchAll(/['"]([^'"]*)['"]/g)].map((m) => m[1]);
    if (!routes.length) routes.push('');
    for (const prefix of prefixes) for (const route of routes) {
      const combined = '/' + [prefix, route].map((v) => v.replace(/^\/+|\/+$/g, '')).filter(Boolean).join('/');
      backend.add(`${method} ${normalize(combined || '/')}`);
    }
  }
}

const frontend = [];
for (const base of ['admin/src', 'creator/src', 'website/src']) {
  for (const file of walk(path.join(root, base)).filter((f) => /\.tsx?$/.test(f))) {
    const src = text(file);
    for (const match of src.matchAll(/\bapi\.(get|post|put|patch|delete)\s*\(\s*([`'"])(.*?)\2/gs)) {
      const method = match[1].toUpperCase();
      let route = match[3];
      if (route.startsWith('/api/v1')) route = route.slice(7);
      frontend.push({ method, route, file: rel(file) });
    }
    for (const match of src.matchAll(/\bthis\.request(?:<[^;\n]*?>)?\s*\(\s*([`'"])(.*?)\1\s*(?:,\s*\{(.*?)\})?/gs)) {
      const options = match[3] || '';
      const mm = options.match(/method\s*:\s*['"](GET|POST|PUT|PATCH|DELETE)['"]/i);
      frontend.push({ method: mm ? mm[1].toUpperCase() : 'GET', route: match[2], file: rel(file) });
    }
  }
}
const missing = frontend.filter(({ method, route }) => route.startsWith('/') && !backend.has(`${method} ${normalize(route)}`));
if (missing.length) {
  console.error(`R11 API parity FAILED: ${missing.length} frontend calls have no matching backend route/method.`);
  for (const item of missing) console.error(`${item.method} ${item.route} (${item.file})`);
  process.exit(1);
}
console.log(`R11 API parity PASS: ${frontend.length} frontend calls mapped to backend routes; ${backend.size} backend route/method operations inventoried.`);
