import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const game = process.argv[2] || 'pachai-kuthirai';
await fs.mkdir(`artifacts/${game}`, { recursive: true });
const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
try {
  await page.goto('http://localhost:5173');
  await page.getByRole('button', { name: 'Create a party' }).click();
  await page.getByRole('button', { name: 'Open courtyard' }).click();
  await page.getByRole('button', { name: 'Rounds', exact: true }).click();
  await page.getByLabel('Format', { exact: true }).selectOption('single');
  await page.getByLabel('Game', { exact: true }).selectOption(game);
  await page.getByRole('button', { name: 'Ready to play' }).click();
  await page.getByRole('button', { name: 'Start match' }).click();
  await page.waitForFunction(
    () =>
      window.render_game_to_text && JSON.parse(window.render_game_to_text()).phase === 'PLAYING',
    {},
    { timeout: 35000 },
  );
  await page.screenshot({ path: `artifacts/${game}/playing.png` });
  if (game === 'pachai-kuthirai') {
    await page.keyboard.down('KeyW');
    await page.waitForFunction(
      () => {
        const d = JSON.parse(window.render_game_to_text());
        return d.players.find((p) => p.id === d.me).z < -7.9;
      },
      {},
      { timeout: 8000 },
    );
    await page.keyboard.down('Space');
    await page.waitForTimeout(200);
    await page.screenshot({ path: `artifacts/${game}/vault.png` });
    await page.keyboard.up('Space');
    await page.waitForTimeout(500);
    await page.keyboard.up('KeyW');
  } else {
    await page.keyboard.press('KeyE');
    await page.keyboard.press('Space');
  }
  await page.waitForFunction(
    () => JSON.parse(window.render_game_to_text()).phase === 'MATCH_RESULTS',
    {},
    { timeout: 210000 },
  );
  await page.screenshot({ path: `artifacts/${game}/results.png` });
  const result = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  assert.equal(result.players.length, 8);
  assert.deepEqual(errors, []);
  await page.getByRole('button', { name: 'Back to lobby' }).click();
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).phase === 'LOBBY');
  await fs.writeFile(
    `artifacts/${game}/result.json`,
    JSON.stringify({ pass: true, result, errors, browser: browser.version() }, null, 2),
  );
  console.log(`PASS: ${game}, real Chrome, eight participants, round and rematch`);
} finally {
  await browser.close();
}
