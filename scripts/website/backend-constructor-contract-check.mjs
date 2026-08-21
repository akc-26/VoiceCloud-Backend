import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');

const roots = ['src', 'test'].filter((root) => fs.existsSync(root));
const skipDirs = new Set(['node_modules', 'dist', 'coverage']);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!skipDirs.has(entry.name)) walk(file, out);
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      out.push(file);
    }
  }
  return out;
}

const files = roots.flatMap((root) => walk(root));
const classes = new Map();

for (const file of files) {
  const source = ts.createSourceFile(
    file,
    fs.readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
  const visit = (node) => {
    if (ts.isClassDeclaration(node) && node.name) {
      const ctor = node.members.find(ts.isConstructorDeclaration);
      if (ctor) {
        let required = 0;
        let maximum = 0;
        let hasRest = false;
        for (const parameter of ctor.parameters) {
          if (parameter.dotDotDotToken) {
            hasRest = true;
            continue;
          }
          maximum += 1;
          if (!parameter.questionToken && !parameter.initializer) required += 1;
        }
        const definitions = classes.get(node.name.text) ?? [];
        definitions.push({ file, required, maximum, hasRest });
        classes.set(node.name.text, definitions);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}

const failures = [];
for (const file of files.filter((item) => /\.(spec|test)\.ts$/.test(item))) {
  const source = ts.createSourceFile(
    file,
    fs.readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
  const visit = (node) => {
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression)) {
      const definitions = classes.get(node.expression.text);
      if (definitions?.length === 1) {
        const definition = definitions[0];
        const count = node.arguments?.length ?? 0;
        if (
          count < definition.required ||
          (!definition.hasRest && count > definition.maximum)
        ) {
          const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
          failures.push(
            `${file}:${line} new ${node.expression.text}(${count}) requires ${definition.required}` +
              (definition.required === definition.maximum
                ? ''
                : `..${definition.maximum}`) +
              ` arguments; constructor: ${definition.file}`,
          );
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}

if (failures.length) {
  console.error('[FAIL] Backend manual service-constructor contract drift detected:');
  failures.forEach((failure) => console.error(` - ${failure}`));
  process.exit(1);
}

console.log(
  `[PASS] Backend constructor contract check (${[...classes.values()].reduce((sum, value) => sum + value.length, 0)} constructors mapped; 0 manual-instantiation mismatches)`,
);
