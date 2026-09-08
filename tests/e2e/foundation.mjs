import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
await fs.mkdir('artifacts/foundation', { recursive: true });
const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
});
const a = await browser.newContext({ viewport: { width: 1440, height: 900 } }),
  b = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const one = await a.newPage(),
  two = await b.newPage();
const errors = [];
for (const p of [one, two]) p.on('pageerror', (e) => errors.push(e.message));
const inspect = (p) => p.evaluate(() => JSON.parse(window.render_game_to_text()));
try {
  await one.goto('http://localhost:5173');
  await one.waitForTimeout(1500);
  await one.screenshot({ path: 'artifacts/foundation/home.png' });
  await one.getByPlaceholder('Your street name').fill('Arun');
  await one.getByRole('button', { name: 'Create a party' }).click();
  await one.getByRole('button', { name: 'Open courtyard' }).click();
  await one.waitForFunction(() => JSON.parse(window.render_game_to_text()).players.length === 1);
  const initial = await inspect(one);
  const code = initial.room;
  await two.goto('http://localhost:5173');
  await two.getByPlaceholder('Your street name').fill('Meena');
  await two.getByRole('button', { name: 'Join with a code' }).click();
  await two.getByLabel('Party code').fill(code);
  await two.getByRole('button', { name: 'Join this party' }).click();
  await one.waitForFunction(() => JSON.parse(window.render_game_to_text()).players.length === 2);
  await two.waitForTimeout(1200);
  await one.bringToFront();
  await one.locator('canvas').click({ position: { x: 500, y: 400 } });
  const before = await inspect(one);
  await one.keyboard.down('KeyW');
  await one.waitForTimeout(800);
  await one.keyboard.up('KeyW');
  await one.keyboard.press('Space');
  await one.waitForTimeout(1000);
  const after = await inspect(one),
    remote = await inspect(two);
  const mine = after.players.find((p) => p.id === after.me),
    start = before.players.find((p) => p.id === before.me),
    seen = remote.players.find((p) => p.id === after.me);
  assert.ok(mine.z < start.z - 2, `Movement missing: ${JSON.stringify({ mine, start })}`);
  assert.ok(Math.abs(mine.z - seen.z) < 0.2);
  assert.equal(after.players.length, 2);
  await one.screenshot({ path: 'artifacts/foundation/two-player.png' });
  await two.reload();
  await two.waitForFunction(() => JSON.parse(window.render_game_to_text()).players.length === 2);
  const restored = await inspect(two);
  assert.equal(restored.me, remote.me);
  assert.equal(restored.players.length, 2);
  assert.deepEqual(errors, []);
  await fs.writeFile(
    'artifacts/foundation/result.json',
    JSON.stringify(
      { pass: true, browser: browser.version(), before, after, remote, restored, errors },
      null,
      2,
    ),
  );
  console.log('PASS: two real Chrome contexts, shared movement, jump, and refresh reconnection');
} finally {
  await browser.close();
}
