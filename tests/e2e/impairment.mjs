import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
// Use the exact WebSocket implementation already locked by the server transport.
const require = createRequire(import.meta.url),
  { WebSocket, WebSocketServer } = createRequire(require.resolve('@colyseus/ws-transport'))('ws');
await fs.mkdir('artifacts/impairment', { recursive: true });
const browser = await chromium.launch({
    channel: 'chrome',
    args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
  }),
  report = [];
const inspect = (p) => p.evaluate(() => JSON.parse(window.render_game_to_text()));
function random(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
try {
  for (const rtt of [0, 100, 200]) {
    let packets = 0;
    const proxy = new WebSocketServer({ port: 2586, host: '127.0.0.1' }),
      connections = [];
    await new Promise((r) => proxy.on('listening', r));
    proxy.on('connection', (client, request) => {
      const upstream = new WebSocket(`ws://127.0.0.1:2567${request.url}`, {
          headers: { origin: 'http://localhost:5173' },
        }),
        rng = random(2026 + connections.length);
      connections.push(client, upstream);
      const queued = [];
      let nextUp = 0,
        nextDown = 0;
      const later = (destination, data, binary, direction) => {
        packets++;
        const message = Buffer.from(data);
        const at = Math.max(
          Date.now() + rtt / 2 + (rtt ? (rng() - 0.5) * 20 : 0),
          direction === 'up' ? nextUp : nextDown,
        );
        if (direction === 'up') nextUp = at;
        else nextDown = at;
        setTimeout(
          () => {
            if (destination.readyState === WebSocket.OPEN) destination.send(message, { binary });
          },
          Math.max(0, at - Date.now()),
        );
      };
      client.on('message', (data, binary) => {
        if (upstream.readyState === WebSocket.OPEN) later(upstream, data, binary, 'up');
        else queued.push([data, binary]);
      });
      upstream.on('open', () =>
        queued.forEach(([data, binary]) => later(upstream, data, binary, 'up')),
      );
      upstream.on('message', (data, binary) => later(client, data, binary, 'down'));
      client.on('close', () => upstream.close());
      upstream.on('close', () => client.close());
      client.on('error', () => {});
      upstream.on('error', () => client.close());
    });
    const contexts = [await browser.newContext(), await browser.newContext()],
      pages = [],
      errors = [];
    for (const context of contexts) {
      await context.addInitScript(() => {
        const Native = window.WebSocket;
        window.WebSocket = class extends Native {
          constructor(url, protocols) {
            const endpoint = new URL(url);
            if (endpoint.port === '2567') {
              endpoint.hostname = '127.0.0.1';
              endpoint.port = '2586';
            }
            super(endpoint.href, protocols);
          }
        };
      });
      const page = await context.newPage();
      page.on('pageerror', (e) => errors.push(e.message));
      pages.push(page);
    }
    try {
      const [one, two] = pages;
      await one.goto('http://localhost:5173');
      await one.getByRole('button', { name: 'Create a party' }).click();
      await one.getByRole('button', { name: 'Open courtyard' }).click();
      await one.waitForFunction(
        () => JSON.parse(window.render_game_to_text()).players.length === 1,
      );
      const code = (await inspect(one)).room;
      await two.goto('http://localhost:5173');
      await two.getByRole('button', { name: 'Join with a code' }).click();
      await two.getByLabel('Party code').fill(code);
      await two.getByRole('button', { name: 'Join this party' }).click();
      await one.waitForFunction(
        () => JSON.parse(window.render_game_to_text()).players.length === 2,
      );
      await one.bringToFront();
      const before = await inspect(one);
      await one.keyboard.down('KeyW');
      await one.waitForTimeout(750);
      await one.keyboard.up('KeyW');
      await one.keyboard.press('Space');
      await one.waitForTimeout(1300 + rtt * 2);
      const a = await inspect(one),
        b = await inspect(two),
        p = a.players.find((p) => p.id === a.me),
        q = b.players.find((p) => p.id === a.me);
      assert.ok(p.z < before.players.find((p) => p.id === a.me).z - 1.5);
      assert.ok(Math.hypot(p.x - q.x, p.z - q.z) < 0.15);
      assert.ok(p.grounded);
      assert.deepEqual(errors, []);
      assert.ok(packets > 50);
      await one.screenshot({ path: `artifacts/impairment/rtt-${rtt}.png` });
      report.push({
        rtt,
        seed: 2026,
        jitter: '±10ms each direction; ordered game messages',
        packets,
        a,
        b,
        errors,
      });
      console.log(`PASS actual WebSocket proxy with ${rtt}ms added RTT`);
    } finally {
      for (const context of contexts) await context.close();
      for (const c of connections) c.terminate();
      await new Promise((r) => proxy.close(r));
    }
  }
  await fs.writeFile('artifacts/impairment/report.json', JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
