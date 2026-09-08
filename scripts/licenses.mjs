import { createRequire } from 'node:module';
import { readFile, readdir, writeFile, realpath, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
const root = JSON.parse(await readFile('package.json', 'utf8')),
  seen = new Set(),
  parts = [],
  metadata = [];
async function visit(name, parent) {
  let file;
  const req = createRequire(parent);
  try {
    file = req.resolve(`${name}/package.json`);
  } catch {
    try {
      let dir = dirname(await realpath(req.resolve(name)));
      while (true) {
        try {
          const p = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'));
          if (p.name === name) {
            file = join(dir, 'package.json');
            break;
          }
        } catch {}
        const up = dirname(dir);
        if (up === dir) return;
        dir = up;
      }
    } catch {
      return;
    }
  }
  const pkg = JSON.parse(await readFile(file, 'utf8')),
    key = `${pkg.name}@${pkg.version}`;
  if (seen.has(key)) return;
  seen.add(key);
  metadata.push({ name: pkg.name, version: pkg.version, license: pkg.license });
  const dir = dirname(file),
    files = (await readdir(dir)).filter((f) => /^licen[cs]e(?:\.|$)|^copying(?:\.|$)/i.test(f));
  for (const license of files) {
    try {
      parts.push(
        `${key}\n${'='.repeat(key.length)}\n${await readFile(join(dir, license), 'utf8')}`,
      );
    } catch {}
  }
  for (const dep of Object.keys(pkg.dependencies || {})) await visit(dep, file);
}
for (const name of Object.keys(root.dependencies)) await visit(name, resolve('package.json'));
await mkdir('apps/web/public/licenses', { recursive: true });
await writeFile('apps/web/public/licenses/THIRD_PARTY_NOTICES.txt', parts.join('\n\n'));
await mkdir('docs/evidence', { recursive: true });
await writeFile(
  'docs/evidence/dependencies.json',
  JSON.stringify(
    metadata.sort((a, b) => a.name.localeCompare(b.name)),
    null,
    2,
  ),
);
console.log(
  `${metadata.length} installed production packages recorded; ${parts.length} license texts included.`,
);
