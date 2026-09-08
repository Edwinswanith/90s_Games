import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
await fs.mkdir('artifacts/localization-audio', { recursive: true });
const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
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
    () => JSON.parse(window.render_game_to_text()).phase === 'PLAYING',
    {},
    { timeout: 35000 },
  );
  await page.getByRole('button', { name: 'Open settings' }).click();
  await page.getByLabel('Language', { exact: true }).selectOption('ta');
  await page.getByRole('button', { name: 'Close settings' }).click();
  await page.keyboard.press('Space');
  await page.waitForTimeout(1000);
  assert.ok((await page.locator('body').innerText()).includes('கல்லா மண்ணா'));
  await page.screenshot({ path: 'artifacts/localization-audio/kalla-tamil-1280.png' });
  await page.keyboard.down('KeyA');
  await page.waitForTimeout(2200);
  await page.keyboard.up('KeyA');
  await page.waitForFunction(
    () => JSON.parse(window.render_game_to_text()).phase === 'MATCH_RESULTS',
    {},
    { timeout: 90000 },
  );
  await page.waitForTimeout(500);
  const diagnostics = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  for (const cue of ['count', 'warning', 'jump', 'land', 'eliminate', 'finish'])
    assert.ok(diagnostics.audio[cue] > 0, `Missing audible cue ${cue}`);
  await page.screenshot({ path: 'artifacts/localization-audio/results-tamil-1280.png' });
  await page.getByRole('button', { name: /மைதானத்திற்குத் திரும்பு/ }).click();
  await page.getByRole('button', { name: 'Rounds', exact: true }).click();
  await page.getByLabel('Game', { exact: true }).selectOption('paandi');
  await page.getByRole('button', { name: 'விளையாடத் தயார்' }).click();
  await page.getByRole('button', { name: 'போட்டியைத் தொடங்கு' }).click();
  await page.waitForFunction(
    () => JSON.parse(window.render_game_to_text()).phase === 'PLAYING',
    {},
    { timeout: 35000 },
  );
  await page.waitForTimeout(500);
  const text = await page.locator('body').innerText();
  assert.ok(text.includes('வெளிப்பயணம்'));
  assert.ok(text.includes('குறியுள்ள கட்டத்தைத் தாண்டுங்கள்'));
  await page.screenshot({ path: 'artifacts/localization-audio/paandi-tamil-1280.png' });
  assert.deepEqual(errors, []);
  await fs.writeFile(
    'artifacts/localization-audio/report.json',
    JSON.stringify(
      {
        pass: true,
        browser: browser.version(),
        audio: diagnostics.audio,
        tamilEssentialInstructions: true,
        errors,
      },
      null,
      2,
    ),
  );
  console.log(
    'PASS: Tamil essential HUD and results, actual countdown/hazard/jump/land/elimination/celebration audio events',
  );
} finally {
  await browser.close();
}
