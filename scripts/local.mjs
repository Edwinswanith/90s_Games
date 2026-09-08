import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
process.chdir(root);
const runtime = resolve(
  root,
  '.runtime/node',
  process.platform === 'win32' ? 'node.exe' : 'bin/node',
);
if (process.execPath !== runtime && existsSync(runtime)) {
  const child = spawn(runtime, [import.meta.filename], { stdio: 'inherit' });
  child.on('exit', (code) => process.exit(code ?? 1));
} else if (process.versions.node.split('.')[0] !== '24') {
  console.error('Use Node 24 or run node scripts/setup.mjs to install the project runtime.');
  process.exit(1);
} else if (!existsSync('apps/web/dist/index.html') || !existsSync('apps/server/dist/index.mjs')) {
  console.error('Build files are missing. Run node scripts/setup.mjs once before starting.');
  process.exit(1);
} else {
  const child = spawn(process.execPath, ['apps/server/dist/index.mjs'], {
    stdio: 'inherit',
    env: process.env,
  });
  child.on('exit', (code) => process.exit(code ?? 1));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
  console.log(
    `Open http://localhost:${process.env.GAME_SERVER_PORT || 2567} in Chrome. The server terminal must remain open.`,
  );
}
