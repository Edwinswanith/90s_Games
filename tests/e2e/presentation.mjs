import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
await fs.mkdir('artifacts/presentation', { recursive: true });
const b = await chromium.launch({ channel: 'chrome' }),
  p = await b.newPage({ viewport: { width: 1920, height: 1080 } }),
  errors = [];
p.on('pageerror', (e) => errors.push(e.message));
try {
  await p.goto('http://localhost:5173');
  await p.getByRole('button', { name: 'Create a party' }).waitFor();
  await p.waitForTimeout(2500);
  await p.screenshot({ path: 'artifacts/presentation/home-1920.png' });
  await p.getByRole('button', { name: 'Open settings' }).click();
  await p.getByLabel('Graphics quality').selectOption('low');
  await p.getByLabel('Language', { exact: true }).selectOption('ta');
  await p.screenshot({ path: 'artifacts/presentation/tamil-settings.png' });
  await p.getByLabel('Language', { exact: true }).selectOption('en');
  await p.getByLabel('Graphics quality').selectOption('medium');
  await p.getByRole('button', { name: 'Close settings' }).click();
  await p.getByRole('button', { name: 'Create a party' }).click();
  await p.screenshot({ path: 'artifacts/presentation/modes.png' });
  await p.getByRole('button', { name: 'Open courtyard' }).click();
  await p.getByRole('button', { name: 'Rounds', exact: true }).click();
  await p.getByLabel('Format', { exact: true }).selectOption('single');
  await p.getByLabel('Game', { exact: true }).selectOption('paandi');
  await p.getByRole('button', { name: 'Ready to play' }).click();
  await p.getByRole('button', { name: 'Start match' }).click();
  await p.waitForFunction(
    () => JSON.parse(window.render_game_to_text()).phase === 'PLAYING',
    {},
    { timeout: 30000 },
  );
  await p.waitForTimeout(1000);
  await p.screenshot({ path: 'artifacts/presentation/paandi-1920.png' });
  await p.setViewportSize({ width: 1280, height: 720 });
  await p.waitForTimeout(1000);
  await p.screenshot({ path: 'artifacts/presentation/paandi-1280.png' });
  await fs.writeFile(
    'artifacts/presentation/diagnostics.json',
    await p.evaluate(() => window.render_game_to_text()),
  );
  assert.deepEqual(errors, []);
  console.log('PASS presentation, settings, Tamil toggle, both desktop viewports');
} finally {
  await b.close();
}
