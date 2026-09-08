import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
await fs.mkdir('artifacts/built-launcher', { recursive: true });
const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
});
const one = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const two = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [],
  outside = [],
  resources = [];
for (const page of [one, two]) {
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) =>
    resources.push({
      status: response.status(),
      encoding: response.headers()['content-encoding'],
      type: response.request().resourceType(),
    }),
  );
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (['http:', 'https:'].includes(url.protocol) && url.hostname !== 'localhost') {
      outside.push(url.origin);
      return route.abort();
    }
    return route.continue();
  });
}
try {
  const health = await (await fetch('http://localhost:2567/health')).json();
  assert.equal(health.ok, true);
  await one.goto('http://localhost:2567');
  await one.getByPlaceholder('Your street name').fill('Arun');
  await one.screenshot({ path: 'artifacts/built-launcher/home.png' });
  await one.getByRole('button', { name: 'Create a party' }).click();
  await one.getByRole('button', { name: 'Open courtyard' }).click();
  await one.waitForFunction(() =>
    /^[A-F0-9]{6}$/.test(
      document
        .querySelector('[aria-label="Copy invitation"]')
        ?.parentElement?.querySelector('strong')?.textContent || '',
    ),
  );
  const roomCode = await one
    .getByRole('button', { name: 'Copy invitation' })
    .locator('..')
    .locator('strong')
    .innerText();
  assert.match(roomCode, /^[A-F0-9]{6}$/);
  assert.equal(
    (await (await fetch(`http://localhost:2567/rooms/${roomCode}`)).json()).joinable,
    true,
  );
  await two.goto('http://localhost:2567');
  await two.getByPlaceholder('Your street name').fill('Meena');
  await two.getByRole('button', { name: 'Join with a code' }).click();
  await two.getByLabel('Party code').fill(roomCode);
  await two.getByRole('button', { name: 'Join this party' }).click();
  await one.getByRole('button', { name: 'Remove Meena', exact: true }).waitFor();
  await one.getByRole('button', { name: 'Rounds', exact: true }).click();
  await one.getByLabel('Format', { exact: true }).selectOption('single');
  await one.getByLabel('Game', { exact: true }).selectOption('eripandhu');
  await two.getByRole('button', { name: 'Ready to play' }).click();
  await one.getByRole('button', { name: 'Ready to play' }).click();
  await one.getByRole('button', { name: 'Start match' }).click();
  for (const page of [one, two])
    await page
      .getByText('E / CLICK NEAR A BALL TO PICK UP', { exact: true })
      .waitFor({ timeout: 35000 });
  await one.keyboard.down('KeyW');
  await one.waitForTimeout(400);
  await one.keyboard.up('KeyW');
  await one.keyboard.press('Space');
  await two.reload();
  await two.getByRole('heading', { name: 'Eripandhu', exact: true }).waitFor({ timeout: 12000 });
  assert.equal(await one.evaluate(() => typeof window.render_game_to_text), 'undefined');
  assert.equal(await two.evaluate(() => typeof window.advanceTime), 'undefined');
  assert.equal(
    (await (await fetch(`http://localhost:2567/rooms/${roomCode}`)).json()).joinable,
    false,
  );
  assert.ok(
    resources.some((resource) => resource.type === 'script' && resource.encoding === 'gzip'),
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(outside, []);
  await one.screenshot({ path: 'artifacts/built-launcher/two-clients-playing.png' });
  for (const page of [two, one]) {
    await page.getByRole('button', { name: 'Open settings' }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Leave party', exact: true })
      .click();
    await page.getByRole('button', { name: 'Create a party' }).waitFor();
  }
  await fs.writeFile(
    'artifacts/built-launcher/report.json',
    JSON.stringify(
      {
        pass: true,
        browser: browser.version(),
        url: 'http://localhost:2567',
        independentChromeContexts: 2,
        productionDiagnosticsDisabled: true,
        gzipScripts: true,
        offlineGameRequests: true,
        round: 'eripandhu',
        refreshDuringGame: true,
        errors,
        outside,
      },
      null,
      2,
    ),
  );
  console.log(
    'PASS built launcher: two real Chrome clients, shared round, refresh, gzip, local-only requests and leave',
  );
} finally {
  await browser.close();
}
