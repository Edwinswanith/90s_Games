import { readdir, readFile, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
const dir = 'apps/web/dist/assets';
for (const file of await readdir(dir)) {
  if (/\.(js|css)$/.test(file))
    await writeFile(`${dir}/${file}.gz`, gzipSync(await readFile(`${dir}/${file}`), { level: 9 }));
}
