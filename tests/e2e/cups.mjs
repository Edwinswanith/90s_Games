import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
await fs.mkdir('artifacts/cups', { recursive: true });
await fs.mkdir('artifacts/thumbnails', { recursive: true });
const browser = await chromium.launch({
    channel: 'chrome',
    args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
  }),
  a = await browser.newContext({ viewport: { width: 1280, height: 720 } }),
  b = await browser.newContext({ viewport: { width: 1280, height: 720 } }),
  one = await a.newPage(),
  two = await b.newPage(),
  errors = [],
  report = [];
for (const p of [one, two]) p.on('pageerror', (e) => errors.push(e.message));
const inspect = (p) => p.evaluate(() => JSON.parse(window.render_game_to_text()));
try {
  await one.goto('http://localhost:5173');
  await one.getByRole('button', { name: 'Create a party' }).click();
  await one.getByRole('button', { name: 'Open courtyard' }).click();
  await one.getByRole('button', { name: 'Rounds', exact: true }).click();
  await one.getByLabel('Round selection').selectOption('vote');
  await one.waitForFunction(() => JSON.parse(window.render_game_to_text()).players.length === 1);
  const code = (await inspect(one)).room;
  await two.goto('http://localhost:5173');
  await two.getByRole('button', { name: 'Join with a code' }).click();
  await two.getByLabel('Party code').fill(code);
  await two.getByRole('button', { name: 'Join this party' }).click();
  await one.waitForFunction(() => JSON.parse(window.render_game_to_text()).players.length === 2);
  for (const format of ['festival', 'knockout']) {
    if (format === 'knockout') {
      await one.getByRole('button', { name: 'Rounds', exact: true }).click();
      await one.getByLabel('Format', { exact: true }).selectOption('knockout');
      await one.waitForTimeout(200);
    }
    await two.getByRole('button', { name: 'Ready to play' }).click();
    await one.getByRole('button', { name: 'Ready to play' }).click();
    await one.getByRole('button', { name: 'Start match' }).click();
    await one.waitForFunction(() => JSON.parse(window.render_game_to_text()).phase !== 'LOBBY');
    let last = '',
      selected = new Set(),
      seenOutcomes = new Set();
    const began = Date.now();
    while (Date.now() - began < 700000) {
      const d = await inspect(one),
        other = await inspect(two);
      assert.equal(d.players.length, 8);
      if (d.phase === 'VOTING' && last !== `vote${d.round}`) {
        await one.locator('button[aria-pressed]').first().click();
        await two.locator('button[aria-pressed]').last().click();
        last = `vote${d.round}`;
      }
      if (d.phase === 'PLAYING' && !selected.has(d.game)) {
        selected.add(d.game);
        await one.waitForTimeout(600);
        await one.screenshot({ path: `artifacts/cups/${format}-${d.game}.png` });
        const thumbnail = await one
          .locator('canvas')
          .evaluate((canvas) => canvas.toDataURL('image/webp', 0.8).split(',')[1]);
        await fs.writeFile(`artifacts/thumbnails/${d.game}.webp`, Buffer.from(thumbnail, 'base64'));
        console.log(`${format}: both Chrome clients entered ${d.game}`);
      }
      if (d.results && !seenOutcomes.has(d.results.id) && other.results?.id === d.results.id) {
        assert.deepEqual(d.results, other.results);
        seenOutcomes.add(d.results.id);
        if (format === 'festival')
          assert.equal(
            d.results.groups.reduce((sum, g) => sum + g.slots.length * g.points, 0),
            360,
          );
      }
      if (d.phase === 'MATCH_RESULTS') {
        assert.equal(selected.size, format === 'festival' ? 5 : 3);
        if (format === 'festival')
          assert.equal(
            d.players.reduce((sum, p) => sum + p.score, 0),
            1800,
          );
        await one.screenshot({ path: `artifacts/cups/${format}-podium.png` });
        report.push({
          format,
          seconds: (Date.now() - began) / 1000,
          games: [...selected],
          agreedOutcomes: [...seenOutcomes],
          state: d,
        });
        break;
      }
      await one.waitForTimeout(400);
    }
    assert.equal((await inspect(one)).phase, 'MATCH_RESULTS');
    await one.getByRole('button', { name: 'Back to lobby' }).click();
    await one.waitForFunction(() => JSON.parse(window.render_game_to_text()).phase === 'LOBBY');
    await one.waitForTimeout(300);
  }
  assert.deepEqual(errors, []);
  await fs.writeFile(
    'artifacts/cups/report.json',
    JSON.stringify({ pass: true, report, errors, browser: browser.version() }, null, 2),
  );
  console.log('PASS two Chrome clients, full Festival and Knockout, scoring and rematches');
} finally {
  await browser.close();
}
