import { beforeAll, afterAll, expect, it } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { Client, type Room } from '@colyseus/sdk';
import { BUILD, CONTENT } from '../../packages/shared/src/config';
import { PartyState, InputFrame } from '../../packages/shared/src/state';
const endpoint = 'http://127.0.0.1:2579',
  wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
let server: ChildProcess;
const rooms: Room<any, PartyState>[] = [];
async function until(test: () => boolean, timeout = 5000) {
  const began = Date.now();
  while (!test()) {
    if (Date.now() - began > timeout)
      throw new Error('Timed out waiting for authoritative condition');
    await wait(50);
  }
}
beforeAll(async () => {
  server = spawn(process.execPath, ['--import', 'tsx', 'apps/server/src/index.ts'], {
    env: { ...process.env, GAME_SERVER_PORT: '2579' },
    stdio: 'ignore',
  });
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch(endpoint + '/health')).ok) return;
    } catch {}
    await wait(100);
  }
  throw new Error('Server did not open');
});
afterAll(async () => {
  for (const r of rooms) if (r.connection.isOpen) r.connection.close(1000);
  server?.kill('SIGTERM');
});
async function create(name = 'Host') {
  const r = await new Client(endpoint).create<PartyState>(
    'party',
    { name, build: BUILD },
    PartyState,
  );
  rooms.push(r);
  await until(() => r.state.players.size === 1);
  r.onMessage('error', () => {});
  return r;
}
it('rejects hostile origins on HTTP and matchmaking, malformed names, and incompatible builds', async () => {
  for (const path of ['/health', '/matchmake/create/party']) {
    const res = await fetch(endpoint + path, {
      method: path.includes('matchmake') ? 'POST' : 'GET',
      headers: { Origin: 'https://untrusted.example', 'Content-Type': 'application/json' },
      ...(path.includes('matchmake')
        ? { body: JSON.stringify({ name: 'bad', build: BUILD }) }
        : {}),
    });
    expect(res.status).toBe(403);
  }
  await expect(
    new Client(endpoint).create('party', { name: 'bad\nname', build: BUILD }),
  ).rejects.toThrow();
  await expect(
    new Client(endpoint).create('party', { name: 'Player', build: 'old' }),
  ).rejects.toThrow();
});
it('applies rapid independent settings, reserves reconnecting seats, and transfers host permission', async () => {
  const host = await create(),
    guest = await new Client(endpoint).joinById<PartyState>(
      host.roomId,
      { name: 'Guest', build: BUILD },
      PartyState,
    );
  rooms.push(guest);
  await until(() => host.state.players.size === 2);
  host.send('settings', { format: 'single', singleGame: 'eripandhu' });
  host.send('settings', { slots: 2 });
  await until(() => host.state.slots === 2);
  expect(host.state.singleGame).toBe('eripandhu');
  await expect(
    new Client(endpoint).joinById(host.roomId, { name: 'Extra', build: BUILD }, PartyState),
  ).rejects.toThrow();
  host.send('settings', { slots: NaN });
  await wait(100);
  expect(host.state.slots).toBe(2);
  const id = host.sessionId,
    token = host.reconnectionToken;
  host.connection.close(1000);
  await until(() => guest.state.players.get(id)?.connected === false);
  expect(guest.state.players.size).toBe(2);
  await until(() => guest.state.host === guest.sessionId, 6500);
  const returned = await new Client(endpoint).reconnect<PartyState>(token, PartyState);
  rooms.push(returned);
  returned.onMessage('error', () => {});
  await until(() => returned.state.players.size === 2);
  expect(returned.sessionId).toBe(id);
  expect(returned.state.host).toBe(guest.sessionId);
  const leaving = returned.leave();
  await Promise.race([leaving, wait(1500)]);
  await until(() => guest.state.players.size === 1);
  expect(returned.connection.isOpen).toBe(false);
});
it('returns to the lobby with a named reason when a client never acknowledges content', async () => {
  const host = await create('Slow loader');
  host.send('settings', { format: 'single', singleGame: 'kalla-manna' });
  await wait(100);
  host.send('ready', true);
  host.send('start');
  await until(() => host.state.phase === 'LOADING', 6000);
  await until(() => host.state.phase === 'LOBBY', 32000);
  expect(host.state.error).toContain('Slow loader');
  expect(host.state.items.size).toBe(0);
  expect([...host.state.players.values()].every((p) => !p.ready)).toBe(true);
}, 40000);
it('preserves elimination after a reservation expires and rejects the expired token', async () => {
  const host = await create('Stay still'),
    guest = await new Client(endpoint).joinById<PartyState>(
      host.roomId,
      { name: 'Observer', build: BUILD },
      PartyState,
    );
  rooms.push(guest);
  await until(() => host.state.players.size === 2);
  host.send('settings', { format: 'single', singleGame: 'kalla-manna', slots: 8 });
  await wait(100);
  host.send('ready', true);
  guest.send('ready', true);
  await wait(100);
  host.send('start');
  const loading = setInterval(() => {
    for (const r of [host, guest])
      if (r.state.phase === 'LOADING')
        r.send('loaded', { round: r.state.roundId, content: CONTENT });
  }, 50);
  try {
    await until(() => host.state.phase === 'PLAYING', 15000);
    await until(() => !host.state.players.get(host.sessionId)!.alive, 25000);
    const id = host.sessionId,
      token = host.reconnectionToken,
      eliminated = guest.state.players.get(id)!.eliminatedTick;
    host.connection.close(1000);
    await until(() => guest.state.players.get(id)?.cpu === true, 17000);
    const p = guest.state.players.get(id)!;
    expect(p.alive).toBe(false);
    expect(p.eliminatedTick).toBe(eliminated);
    await expect(new Client(endpoint).reconnect(token, PartyState)).rejects.toThrow();
  } finally {
    clearInterval(loading);
  }
}, 60000);
it('does not accept stale-round movement or client-supplied scores and ownership', async () => {
  const host = await create('Authority');
  const input = host.input({ type: InputFrame });
  const original = host.state.players.get(host.sessionId)!.x;
  for (let i = 0; i < 20; i++) {
    Object.assign(input.data, { moveX: NaN, moveZ: Infinity, round: 999 });
    input.send();
    await wait(17);
  }
  host.send('hit', { target: host.sessionId, score: 999, item: 'ball-0' });
  await wait(100);
  const p = host.state.players.get(host.sessionId)!;
  expect(Number.isFinite(p.x)).toBe(true);
  expect(Math.abs(p.x - original)).toBeLessThan(0.1);
  expect(p.score).toBe(0);
  expect(p.item).toBe('');
});
