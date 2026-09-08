import { chromium } from 'playwright';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, cp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';
const root = process.cwd(),
  temporary = await mkdtemp(join(tmpdir(), 'theru-clean-')),
  pnpm = resolve('.runtime/tools/node_modules/pnpm/bin/pnpm.cjs'),
  env = { ...process.env, PATH: resolve('.runtime/node/bin') + ':' + process.env.PATH };
await mkdir('artifacts/distribution', { recursive: true });
let server, browser;
const logs = [];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  for (const name of [
    'apps',
    'packages',
    'scripts',
    'package.json',
    'pnpm-lock.yaml',
    'pnpm-workspace.yaml',
    'tsconfig.json',
  ])
    await cp(name, join(temporary, name), {
      recursive: true,
      filter: (source) =>
        !source.split('/').some((part) => ['node_modules', 'dist'].includes(part)),
    });
  for (const args of [['install', '--offline', '--frozen-lockfile'], ['build']]) {
    const result = spawnSync(process.execPath, [pnpm, ...args], {
      cwd: temporary,
      env,
      encoding: 'utf8',
      timeout: 120000,
    });
    logs.push({
      command: args.join(' '),
      status: result.status,
      output: result.stdout + result.stderr,
    });
    assert.equal(result.status, 0, result.stdout + result.stderr);
  }
  server = spawn(process.execPath, ['apps/server/dist/index.mjs'], {
    cwd: temporary,
    env: { ...env, GAME_SERVER_PORT: '2589' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  server.stdout.on('data', (b) => (output += String(b)));
  server.stderr.on('data', (b) => (output += String(b)));
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch('http://localhost:2589/health')).ok) break;
    } catch {}
    await wait(100);
  }
  const duplicate = spawnSync(process.execPath, ['apps/server/dist/index.mjs'], {
    cwd: temporary,
    env: { ...env, GAME_SERVER_PORT: '2589' },
    encoding: 'utf8',
    timeout: 10000,
  });
  assert.notEqual(duplicate.status, 0);
  assert.match(duplicate.stderr, /2589|EADDRINUSE/);
  browser = await chromium.launch({ channel: 'chrome' });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } }),
    page = await context.newPage(),
    outside = [],
    errors = [],
    resources = [];
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (
      ['http:', 'https:'].includes(url.protocol) &&
      !['localhost', '127.0.0.1'].includes(url.hostname)
    ) {
      outside.push(url.href);
      return route.abort();
    }
    return route.continue();
  });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', (response) =>
    resources.push({
      url: response.url(),
      status: response.status(),
      encoding: response.headers()['content-encoding'],
    }),
  );
  await page.goto('http://localhost:2589');
  await page.getByRole('button', { name: 'Practise a game with CPUs' }).click();
  await page.getByLabel('Practice game').selectOption('eripandhu');
  await page.getByRole('button', { name: 'Open courtyard' }).click();
  await page.getByRole('button', { name: 'Ready to play' }).click();
  await page.getByRole('button', { name: 'Start match' }).click();
  await page
    .getByText('E / CLICK NEAR A BALL TO PICK UP', { exact: true })
    .waitFor({ timeout: 30000 });
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(500);
  await page.keyboard.up('KeyW');
  await page.keyboard.press('Space');
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(root, 'artifacts/distribution/built-offline.png') });
  assert.deepEqual(outside, []);
  assert.deepEqual(errors, []);
  assert.ok(resources.some((r) => r.url.endsWith('.js') && r.encoding === 'gzip'));
  assert.equal(await page.evaluate(() => typeof window.render_game_to_text), 'undefined');
  server.kill('SIGTERM');
  await page
    .getByRole('alert')
    .filter({ hasText: 'Connection closed' })
    .waitFor({ timeout: 12000 });
  await page.screenshot({ path: join(root, 'artifacts/distribution/server-stopped.png') });
  await writeFile(
    'artifacts/distribution/report.json',
    JSON.stringify(
      {
        pass: true,
        cleanDirectory: temporary,
        offlineInstall: true,
        noExternalGameRequests: true,
        logs,
        resources,
        errors,
        outside,
        strictPort: { status: duplicate.status, message: duplicate.stderr },
        serverOutput: output,
        browser: browser.version(),
      },
      null,
      2,
    ),
  );
  console.log(
    'PASS clean offline install, built same-origin Chrome play, compressed assets, occupied port, and server shutdown',
  );
} finally {
  server?.kill('SIGTERM');
  await browser?.close();
  await rm(temporary, { recursive: true, force: true });
}
