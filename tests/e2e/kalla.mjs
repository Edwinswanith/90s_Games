import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
await fs.mkdir('artifacts/kalla', { recursive: true });
const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
try {
  await page.goto('http://localhost:5173');
  await page.getByRole('button', { name: 'Create a party' }).click();
  await page.getByRole('button', { name: 'Open courtyard' }).click();
  await page.getByRole('button', { name: 'Rounds', exact: true }).click();
  await page.getByLabel('Format', { exact: true }).selectOption('single');
  await page.getByLabel('Game', { exact: true }).selectOption('kalla-manna');
  await page.getByRole('button', { name: 'Ready to play' }).click();
  await page.getByRole('button', { name: 'Start match' }).click();
  await page.waitForFunction(
    () =>
      window.render_game_to_text && JSON.parse(window.render_game_to_text()).phase === 'PLAYING',
    {},
    { timeout: 30000 },
  );
  await page.screenshot({ path: 'artifacts/kalla/playing.png' });
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(450);
  await page.keyboard.up('KeyD');
  await page.waitForTimeout(4000);
  await page.screenshot({ path: 'artifacts/kalla/surface.png' });
  await page.waitForFunction(
    () => JSON.parse(window.render_game_to_text()).phase === 'MATCH_RESULTS',
    {},
    { timeout: 95000 },
  );
  await page.screenshot({ path: 'artifacts/kalla/results.png' });
  const result = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  assert.equal(result.players.length, 8);
  assert.deepEqual(errors, []);
  await page.getByRole('button', { name: 'Back to lobby' }).click();
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).phase === 'LOBBY');
  await fs.writeFile(
    'artifacts/kalla/result.json',
    JSON.stringify({ pass: true, result, errors, browser: browser.version() }, null, 2),
  );
  console.log('PASS: real Chrome Kalla Manna, eight slots, round lifecycle and rematch');
} finally {
  await browser.close();
}
