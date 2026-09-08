import { existsSync } from 'node:fs';
import { mkdir, writeFile, rename, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
const version = '24.20.0',
  pnpmVersion = '10.29.2',
  root = resolve(import.meta.dirname, '..'),
  base = resolve(root, '.runtime');
const platform = process.platform,
  arch = process.arch;
if (!['darwin', 'win32', 'linux'].includes(platform) || !['x64', 'arm64'].includes(arch))
  throw new Error('Install Node 24.20.0 and pnpm 10.29.2 manually on this platform.');
const folder = `node-v${version}-${platform === 'win32' ? 'win' : platform}-${arch}`,
  archive = folder + (platform === 'win32' ? '.zip' : '.tar.gz'),
  runtime = resolve(base, 'node'),
  node = resolve(runtime, platform === 'win32' ? 'node.exe' : 'bin/node');
await mkdir(base, { recursive: true });
async function fetchBytes(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed: ${response.status} ${url}`);
  return Buffer.from(await response.arrayBuffer());
}
if (!existsSync(node)) {
  console.log(`Installing project-local Node ${version}…`);
  const url = `https://nodejs.org/dist/v${version}/`;
  const bytes = await fetchBytes(url + archive),
    checksums = (await fetchBytes(url + 'SHASUMS256.txt')).toString();
  const expected = checksums
    .split('\n')
    .find((line) => line.trim().endsWith(' ' + archive))
    ?.trim()
    .split(/\s+/)[0];
  if (createHash('sha256').update(bytes).digest('hex') !== expected)
    throw new Error('Node download checksum did not match.');
  const file = resolve(base, archive);
  await writeFile(file, bytes);
  if (platform === 'win32')
    execFileSync('powershell.exe', [
      '-NoProfile',
      '-Command',
      `Expand-Archive -LiteralPath '${file.replaceAll("'", "''")}' -DestinationPath '${base.replaceAll("'", "''")}' -Force`,
    ]);
  else execFileSync('tar', ['-xzf', file, '-C', base]);
  await rename(resolve(base, folder), runtime);
  await rm(file);
}
if (execFileSync(node, ['--version'], { encoding: 'utf8' }).trim() !== `v${version}`)
  throw new Error(`Expected project runtime ${version}. Move .runtime/node aside and rerun setup.`);
const env = {
    ...process.env,
    PATH:
      resolve(runtime, platform === 'win32' ? '' : 'bin') +
      (platform === 'win32' ? ';' : ':') +
      process.env.PATH,
  },
  tools = resolve(base, 'tools'),
  pnpm = resolve(tools, 'node_modules/pnpm/bin/pnpm.cjs');
function run(args) {
  const result = spawnSync(node, args, { cwd: root, env, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
if (!existsSync(pnpm)) {
  await mkdir(tools, { recursive: true });
  const npm = resolve(
    runtime,
    platform === 'win32'
      ? 'node_modules/npm/bin/npm-cli.js'
      : 'lib/node_modules/npm/bin/npm-cli.js',
  );
  run([
    npm,
    'install',
    '--prefix',
    tools,
    `pnpm@${pnpmVersion}`,
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
  ]);
}
run([pnpm, 'install', '--frozen-lockfile']);
run([pnpm, 'build']);
console.log(
  'Installed and built. Start with ./start.command (macOS), start.cmd (Windows), or npm run local.',
);
