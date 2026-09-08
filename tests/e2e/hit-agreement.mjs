import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
await fs.mkdir('artifacts/hit-agreement', { recursive: true });
const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
});
const a = await browser.newContext(),
  b = await browser.newContext();
const one = await a.newPage(),
  two = await b.newPage();
const errors = [];
for (const p of [one, two]) p.on('pageerror', (e) => errors.push(e.message));
const inspect = (p) => p.evaluate(() => JSON.parse(window.render_game_to_text()));
try {
  await one.goto('http://localhost:5173');
  await one.getByPlaceholder('Your street name').fill('Thrower');
  await one.getByRole('button', { name: 'Create a party' }).click();
  await one.getByRole('button', { name: 'Open courtyard' }).click();
  await one.getByRole('button', { name: 'Rounds', exact: true }).click();
  await one.getByLabel('Format', { exact: true }).selectOption('single');
  await one.getByLabel('Game', { exact: true }).selectOption('eripandhu');
  await one.getByLabel('Participants').selectOption('2');
  const code = (await inspect(one)).room;
  await two.goto('http://localhost:5173');
  await two.getByPlaceholder('Your street name').fill('Dodger');
  await two.getByRole('button', { name: 'Join with a code' }).click();
  await two.getByLabel('Party code').fill(code);
  await two.getByRole('button', { name: 'Join this party' }).click();
  await two.getByRole('button', { name: 'Ready to play' }).click();
  await one.getByRole('button', { name: 'Ready to play' }).click();
  await one.getByRole('button', { name: 'Start match' }).click();
  await one.waitForFunction(
    () => JSON.parse(window.render_game_to_text()).phase === 'PLAYING',
    {},
    { timeout: 30000 },
  );
  await one.bringToFront();
  await one.keyboard.down('KeyW');
  await one.waitForFunction(
    () => {
      const d = JSON.parse(window.render_game_to_text());
      return d.players.find((p) => p.id === d.me).z < 1;
    },
    {},
    { timeout: 6000 },
  );
  await one.keyboard.up('KeyW');
  await one.waitForTimeout(250);
  console.log('before pickup', JSON.stringify(await inspect(one)));
  await one.keyboard.down('KeyE');
  await one.waitForTimeout(200);
  await one.keyboard.up('KeyE');
  await one.waitForFunction(
    () => {
      const d = JSON.parse(window.render_game_to_text());
      return !!d.players.find((p) => p.id === d.me).item;
    },
    {},
    { timeout: 3000 },
  );
  await one.waitForTimeout(150);
  await one.keyboard.press('KeyE');
  await two.waitForFunction(
    () => {
      const d = JSON.parse(window.render_game_to_text());
      return d.players.find((p) => p.id === d.me).lives === 1;
    },
    {},
    { timeout: 5000 },
  );
  await one.waitForTimeout(150);
  const first = await inspect(one),
    second = await inspect(two);
  assert.equal(first.players.find((p) => p.id === second.me).lives, 1);
  assert.equal(second.players.find((p) => p.id === second.me).lives, 1);
  assert.deepEqual(errors, []);
  await two.screenshot({ path: 'artifacts/hit-agreement/registered-hit.png' });
  await fs.writeFile(
    'artifacts/hit-agreement/result.json',
    JSON.stringify({ pass: true, first, second, errors }, null, 2),
  );
  console.log('PASS: two Chrome players agree on a real pickup, throw, and hit');
} finally {
  await browser.close();
}
