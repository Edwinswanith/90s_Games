import { beforeAll, afterAll, expect, it } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { Client, type Room } from '@colyseus/sdk';
import { PartyState, InputFrame } from '../../packages/shared/src/state';
import { BUILD, FESTIVAL_ORDER } from '../../packages/shared/src/config';
const endpoint = 'http://127.0.0.1:2577';
let server: ChildProcess;
const rooms: Room<any, PartyState>[] = [];
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
beforeAll(async () => {
  server = spawn(process.execPath, ['--import', 'tsx', 'apps/server/src/index.ts'], {
    env: { ...process.env, GAME_SERVER_PORT: '2577' },
    stdio: 'ignore',
  });
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch(endpoint + '/health')).ok) return;
    } catch {}
    await wait(100);
  }
  throw new Error('Test server did not start');
});
afterAll(async () => {
  await Promise.race([Promise.all(rooms.map((r) => r.leave().catch(() => {}))), wait(1000)]);
  server?.kill('SIGTERM');
});
it('admits eight real clients and enforces readiness and host authority', async () => {
  const sdk = new Client(endpoint),
    host = await sdk.create<PartyState>('party', { name: 'Host', build: BUILD }, PartyState);
  rooms.push(host);
  for (let i = 1; i < 8; i++)
    rooms.push(
      await new Client(endpoint).joinById<PartyState>(
        host.roomId,
        { name: `Player ${i}`, build: BUILD },
        PartyState,
      ),
    );
  await wait(300);
  expect(host.state.players.size).toBe(8);
  for (const room of rooms) expect(room.state.players.size).toBe(8);
  await expect(
    sdk.joinById(host.roomId, { name: 'Ninth', build: BUILD }, PartyState),
  ).rejects.toThrow();
  const guest = rooms[1];
  let error = '';
  guest.onMessage('error', (m) => {
    error = m.message;
  });
  guest.send('settings', {
    format: 'single',
    policy: 'host',
    singleGame: 'eripandhu',
    firstRace: 'paandi',
    slots: 8,
    botFill: true,
    order: FESTIVAL_ORDER,
  });
  await wait(100);
  expect(error).toContain('host');
  expect(host.state.singleGame).toBe('kalla-manna');
  rooms.forEach((r) => r.send('ready', true));
  await wait(100);
  expect([...host.state.players.values()].every((p) => p.ready)).toBe(true);
  host.send('settings', {
    format: 'single',
    policy: 'host',
    singleGame: 'kalla-manna',
    firstRace: 'paandi',
    slots: 8,
    botFill: true,
    order: FESTIVAL_ORDER,
  });
  await wait(100);
  expect([...host.state.players.values()].every((p) => !p.ready)).toBe(true);
  const input = guest.input({ type: InputFrame });
  const z = host.state.players.get(guest.sessionId)!.z;
  for (let i = 0; i < 50; i++) {
    input.data.moveZ = -1;
    input.send();
    await wait(17);
  }
  input.data.moveZ = 0;
  input.send();
  await wait(200);
  expect(host.state.players.get(guest.sessionId)!.z).toBeLessThan(z - 2);
  guest.send('position', { x: 9999, score: 999 });
  await wait(100);
  expect(host.state.players.get(guest.sessionId)!.score).toBe(0);
  expect(host.state.players.get(guest.sessionId)!.x).toBeLessThan(10);
});
