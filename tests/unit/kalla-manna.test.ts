import { beforeAll, expect, it } from 'vitest';
import { PartyState, Player } from '../../packages/shared/src/state';
import { initPhysics } from '../../packages/simulation/src/physics';
import { MatchEngine } from '../../apps/server/src/match/MatchEngine';
import { makeOutcome } from '../../packages/shared/src/scoring';
import { CONTENT } from '../../packages/shared/src/config';
import { KallaManna } from '../../apps/server/src/rounds/kalla-manna';
import { PhysicsScene } from '../../packages/simulation/src/physics';
import { kallaMap, kallaCells } from '../../packages/shared/src/maps';
beforeAll(initPhysics);
it('does not eliminate during warning or in flight, and batches unsafe landings', () => {
  const s = new PartyState(),
    players = [0, 1, 2].map((i) => new Player({ slotId: String(i) }));
  const world = new PhysicsScene(kallaMap);
  const round = new KallaManna({
    state: s,
    players,
    physics: world,
    startTick: 0,
    target: 2,
    seed: 22,
  });
  round.start();
  const unsafe = kallaCells.find((c) => !round.safeIds.has(c.index))!;
  for (const p of players) {
    p.x = unsafe.x;
    p.z = unsafe.z;
  }
  s.tick = 10;
  round.afterMove();
  expect(players.every((p) => p.alive)).toBe(true);
  s.wavePhase = 'active';
  s.waveDeadline = 1000;
  players[0].grounded = false;
  round.afterMove();
  expect(players[0].alive).toBe(true);
  expect(players[1].eliminatedTick).toBe(players[2].eliminatedTick);
  expect(round.done!.qualifiers).toHaveLength(3);
  world.dispose();
});
it('preserves tie groups and averages occupied positions', () => {
  const p = Array.from(
    { length: 8 },
    (_, i) => new Player({ slotId: String(i), score: i < 2 ? 5 : 8 - i }),
  );
  const result = makeOutcome('x', 'kalla', p, (x) => [x.score], '', 4);
  expect(result.groups.reduce((sum, g) => sum + g.points * g.slots.length, 0)).toBe(360);
  expect(result.qualifiers.length).toBeGreaterThanOrEqual(4);
});
it('completes an eight-participant Kalla Manna round and resets cleanly', () => {
  const s = new PartyState({ format: 'single', slots: 8, host: 'human' });
  s.players.set('human', new Player({ slotId: 'human', name: 'Human', ready: true }));
  const engine = new MatchEngine(s);
  expect(engine.begin()).toBe('');
  for (let t = 0; t < 5600 && s.phase !== 'MATCH_RESULTS'; t++) {
    if (s.phase === 'LOADING') engine.contentReady('human', s.roundId, CONTENT);
    engine.update(new Map());
  }
  expect(s.phase).toBe('MATCH_RESULTS');
  expect(engine.history).toHaveLength(1);
  expect(engine.history[0].groups.flatMap((g) => g.slots)).toHaveLength(8);
  engine.returnToLobby();
  expect(s.players.size).toBe(1);
  expect(s.players.get('human')!.ready).toBe(false);
  expect(s.items.size).toBe(0);
  engine.dispose();
});
