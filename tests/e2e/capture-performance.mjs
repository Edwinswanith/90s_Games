import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const report = [],
  errors = [];
await fs.mkdir('artifacts/performance', { recursive: true });
await fs.mkdir('artifacts/performance/thumbnails', { recursive: true });
const browser = await chromium.launch({
    channel: 'chrome',
    args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
  }),
  context = await browser.newContext({ viewport: { width: 1920, height: 1080 } }),
  page = await context.newPage();
page.on('pageerror', (e) => errors.push(e.message));
const inspect = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
try {
  for (const game of ['kalla-manna', 'pachai-kuthirai', 'eripandhu', 'seven-stones', 'paandi']) {
    await page.goto('http://localhost:5173');
    await page.getByRole('button', { name: 'Practise a game with CPUs' }).click();
    await page.getByLabel('Practice game').selectOption(game);
    await page.getByRole('button', { name: 'Open courtyard' }).click();
    await page.getByRole('button', { name: 'Ready to play' }).click();
    await page.getByRole('button', { name: 'Start match' }).click();
    await page.waitForFunction(
      () => JSON.parse(window.render_game_to_text()).phase === 'PLAYING',
      {},
      { timeout: 30000 },
    );
    await page.waitForTimeout(2000);
    const samples = [];
    for (let i = 0; i < 7; i++) {
      await page.waitForTimeout(1000);
      const sample = await inspect();
      if (sample.phase !== 'PLAYING') break;
      samples.push({
        ...sample.performance,
        phase: sample.phase,
        alive: sample.players.filter((p) => p.alive).length,
      });
    }
    const state = await inspect();
    await page.screenshot({ path: `artifacts/performance/${game}.png` });
    const image = await page
      .locator('canvas')
      .evaluate((canvas) => canvas.toDataURL('image/webp', 0.82).split(',')[1]);
    await fs.writeFile(
      `artifacts/performance/thumbnails/${game}.webp`,
      Buffer.from(image, 'base64'),
    );
    report.push({
      game,
      viewport: { width: 1920, height: 1080 },
      quality: 'medium',
      participants: 8,
      samples,
      state,
    });
    await fs.writeFile('artifacts/performance/progress.json', JSON.stringify(report, null, 2));
    await page.getByRole('button', { name: 'Open settings' }).click();
    await page
      .getByRole('dialog', { name: 'Settings' })
      .getByRole('button', { name: 'Leave party', exact: true })
      .click();
    await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).phase === 'HOME');
  }
  await fs.mkdir('apps/web/public/thumbnails', { recursive: true });
  for (const file of await fs.readdir('artifacts/performance/thumbnails'))
    await fs.copyFile(
      `artifacts/performance/thumbnails/${file}`,
      `apps/web/public/thumbnails/${file}`,
    );
  await page.reload();
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: 'Games', exact: true }).click();
  await page.waitForTimeout(800);
  assert.equal(await page.locator('article img').count(), 5);
  await page.screenshot({ path: 'artifacts/performance/library.png' });
  assert.deepEqual(errors, []);
  await fs.writeFile(
    'artifacts/performance/report.json',
    JSON.stringify(
      {
        browser: browser.version(),
        hardware: 'Apple M1, 8 GB RAM, macOS 14.5',
        pass: true,
        report,
        errors,
      },
      null,
      2,
    ),
  );
  console.log('PASS five-scene desktop performance capture and original thumbnails');
} finally {
  await browser.close();
}
