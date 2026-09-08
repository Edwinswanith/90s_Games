// Independent SDK clients send ordinary inputs. This runner never advances server time.
import { Client, type Room } from '@colyseus/sdk';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { PartyState, InputFrame } from '../../packages/shared/src/state';
import { BUILD, CONTENT } from '../../packages/shared/src/config';
import { PhysicsScene, initPhysics, neutralInput } from '../../packages/simulation/src/physics';
import { mapFor } from '../../packages/shared/src/maps';
import { PachaiKuthirai } from '../../apps/server/src/rounds/pachai-kuthirai';
import { KallaManna } from '../../apps/server/src/rounds/kalla-manna';
import { Paandi } from '../../apps/server/src/rounds/paandi';
import { Eripandhu } from '../../apps/server/src/rounds/eripandhu';
import { SevenStones } from '../../apps/server/src/rounds/seven-stones';
import type { BaseRound } from '../../apps/server/src/rounds/base';
const duration = Number(process.env.LOAD_SECONDS || 1800),
  port = Number(process.env.LOAD_PORT || 2578),
  endpoint = `http://127.0.0.1:${port}`;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
await initPhysics();
await mkdir('artifacts/load', { recursive: true });
const child = spawn(process.execPath, ['--import', 'tsx', 'apps/server/src/index.ts'], {
  env: { ...process.env, GAME_SERVER_PORT: String(port) },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let serverLog = '';
child.stdout.on('data', (v) => (serverLog += String(v)));
child.stderr.on('data', (v) => (serverLog += String(v)));
const rooms: Room<any, PartyState>[] = [],
  drivers: {
    room: Room<any, PartyState>;
    input: any;
    round: number;
    policy: BaseRound | null;
    world: PhysicsScene | null;
    lastWave: number;
  }[] = [];
const outcomes: unknown[] = [],
  metrics: unknown[] = [];
let timer: ReturnType<typeof setInterval> | undefined;
let failure: unknown;
try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(endpoint + '/health')).ok) break;
    } catch {}
    await wait(100);
  }
  const host = await new Client(endpoint).create<PartyState>(
    'party',
    { name: 'Load 1', build: BUILD },
    PartyState,
  );
  rooms.push(host);
  for (let i = 1; i < 8; i++)
    rooms.push(
      await new Client(endpoint).joinById<PartyState>(
        host.roomId,
        { name: `Load ${i + 1}`, build: BUILD },
        PartyState,
      ),
    );
  for (const room of rooms) {
    room.onMessage('error', (e) => {
      failure = new Error(e.message);
    });
    room.onLeave(() => {
      if (timer) failure = new Error('An SDK client left unexpectedly');
    });
    drivers.push({
      room,
      input: room.input({ type: InputFrame }),
      round: -1,
      policy: null,
      world: null,
      lastWave: -1,
    });
  }
  let matches = 0,
    started = 0,
    seenResults = '',
    lobbyReadyAt = 0;
  const began = Date.now();
  timer = setInterval(() => {
    try {
      for (const d of drivers) {
        const s = d.room.state,
          p = s.players.get(d.room.sessionId);
        if (!p) continue;
        if (s.phase === 'LOADING') d.room.send('loaded', { round: s.roundId, content: CONTENT });
        if (d.round !== s.roundId) {
          d.world?.dispose();
          d.world = new PhysicsScene(mapFor(s.selectedGame));
          const C = {
            'pachai-kuthirai': PachaiKuthirai,
            'kalla-manna': KallaManna,
            paandi: Paandi,
            eripandhu: Eripandhu,
            'seven-stones': SevenStones,
          }[s.selectedGame as 'paandi'];
          d.policy = new C({
            state: s,
            players: [...s.players.values()].filter((p) => p.matchEligible),
            physics: d.world,
            startTick: s.tick,
            target: s.target,
            seed: s.seed,
          });
          d.round = s.roundId;
          d.lastWave = -1;
        }
        if (d.policy instanceof KallaManna) {
          d.policy.safeIds = new Set(JSON.parse(s.safeTiles || '[]'));
          if (d.lastWave !== s.wave) {
            d.policy.callTick = s.tick;
            d.lastWave = s.wave;
          }
        }
        const cmd = s.phase === 'PLAYING' && p.matchEligible ? d.policy!.bot(p) : neutralInput();
        Object.assign(d.input.data, { ...cmd, round: s.roundId });
        d.input.send();
      }
      const s = host.state;
      if (s.phase === 'LOBBY' && Date.now() > lobbyReadyAt) {
        if ([...s.players.values()].length === 8 && [...s.players.values()].every((p) => p.ready)) {
          host.send('start');
          started++;
          lobbyReadyAt = Date.now() + 2000;
        } else {
          rooms.forEach((r) => r.send('ready', true));
          lobbyReadyAt = Date.now() + 300;
        }
      }
      if (s.phase === 'VOTING')
        rooms.forEach((r, i) => {
          const choices = JSON.parse(r.state.remaining);
          r.send('vote', { game: choices[i % choices.length], match: r.state.matchId });
        });
      if (s.phase === 'MATCH_RESULTS' && s.matchId !== seenResults) {
        seenResults = s.matchId;
        const history = JSON.parse(s.history);
        assert.equal(history.length, s.format === 'festival' ? 5 : 3);
        if (s.format === 'festival') {
          assert.equal(
            [...s.players.values()].reduce((sum, p) => sum + p.score, 0),
            1800,
          );
          assert.equal(new Set(history.map((h: any) => h.game)).size, 5);
        }
        outcomes.push({
          match: s.matchId,
          format: s.format,
          history,
          score: [...s.players.values()].map((p) => p.score),
        });
        matches++;
        console.log(
          `Completed ${s.format} ${matches} at ${Math.round((Date.now() - began) / 1000)}s`,
        );
        host.send('lobby');
        setTimeout(
          () =>
            host.send('settings', {
              format: matches % 2 ? 'knockout' : 'festival',
              policy: matches % 3 === 0 ? 'vote' : 'host',
            }),
          250,
        );
        lobbyReadyAt = Date.now() + 600;
      }
    } catch (e) {
      failure = e;
    }
  }, 1000 / 60);
  while (Date.now() - began < duration * 1000 && !failure) {
    await wait(10000);
    metrics.push({
      elapsed: (Date.now() - began) / 1000,
      ...(await (await fetch(endpoint + '/health')).json()),
    });
  }
  if (failure) throw failure;
  assert.equal(rooms.length, 8);
  assert.ok(matches > 0);
  await writeFile(
    'artifacts/load/report.json',
    JSON.stringify(
      {
        pass: true,
        seconds: (Date.now() - began) / 1000,
        clients: 8,
        matches,
        started,
        outcomes,
        metrics,
      },
      null,
      2,
    ),
  );
  console.log(`PASS: ${duration}s, eight SDK connections, ${matches} complete matches`);
} catch (e) {
  await writeFile(
    'artifacts/load/failure.json',
    JSON.stringify({ error: String(e), outcomes, metrics, serverLog }, null, 2),
  );
  throw e;
} finally {
  if (timer) clearInterval(timer);
  timer = undefined;
  for (const d of drivers) d.world?.dispose();
  await Promise.race([Promise.all(rooms.map((r) => r.leave().catch(() => {}))), wait(1000)]);
  child.kill('SIGTERM');
}
