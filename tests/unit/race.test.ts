import { beforeAll, expect, it } from 'vitest';
import { initPhysics, PhysicsScene, neutralInput } from '../../packages/simulation/src/physics';
import { raceMap } from '../../packages/shared/src/maps';
import { PartyState, Player } from '../../packages/shared/src/state';
import { PachaiKuthirai } from '../../apps/server/src/rounds/pachai-kuthirai';
beforeAll(initPhysics);
it('requires ordered checkpoints even when a character reaches the finish', () => {
  const s = new PartyState(),
    p = new Player({ slotId: 'p', x: 0, z: 3 });
  const world = new PhysicsScene(raceMap),
    r = new PachaiKuthirai({
      state: s,
      players: [p],
      physics: world,
      startTick: 0,
      target: 0,
      seed: 1,
    });
  r.start();
  p.z = -100;
  s.tick++;
  r.afterMove();
  expect(p.qualified).toBe(false);
  expect(p.checkpoint).toBe(1);
  world.dispose();
});
it('completes both authored race branches through legal bot inputs', () => {
  const s = new PartyState(),
    players = [new Player({ slotId: 'a', x: 0, z: 3 }), new Player({ slotId: 'b', x: 1, z: 3 })];
  const world = new PhysicsScene(raceMap),
    r = new PachaiKuthirai({ state: s, players, physics: world, startTick: 0, target: 0, seed: 1 });
  r.start();
  for (let tick = 1; tick < 5400 && !r.done; tick++) {
    s.tick = tick;
    for (const p of players) world.move(p.slotId, p, r.bot(p), tick);
    world.step();
    r.afterMove();
  }
  expect(
    players.map((p) => ({
      id: p.slotId,
      checkpoint: p.checkpoint,
      x: p.x,
      z: p.z,
      finish: p.finishTick,
    })),
  ).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: 'a', checkpoint: 4 }),
      expect.objectContaining({ id: 'b', checkpoint: 4 }),
    ]),
  );
  world.dispose();
});
it('rejects a vault from outside the approach area', () => {
  const world = new PhysicsScene(raceMap),
    p = new Player({ x: 0, z: 2, vz: -5.5 });
  world.move('p', p, { ...neutralInput(), moveZ: -1, jump: true }, 1);
  expect(p.vaultUntil).toBe(0);
  world.dispose();
});

it('does not grant a clean-vault bonus when the authored arc is obstructed', () => {
  const world = new PhysicsScene({
      ...raceMap,
      boxes: [
        ...raceMap.boxes,
        { id: 'test-ceiling', x: 0, y: 1.8, z: -10, w: 3, h: 0.25, d: 0.6 },
      ],
    }),
    p = new Player({ slotId: 'p', x: 0, z: -8.2, y: 0.01, vz: -5.5 });
  for (let tick = 1; tick <= 32; tick++) {
    world.move('p', p, { ...neutralInput(), moveZ: -1, jump: tick === 1 }, tick);
    world.step();
  }
  expect(p.boostUntil).toBe(0);
  expect(p.z).toBeGreaterThan(-11.2);
  world.dispose();
});
it('records a valid final crossing only once', () => {
  const state = new PartyState(),
    p = new Player({ slotId: 'p', checkpoint: 3, x: 0, z: -98 }),
    world = new PhysicsScene(raceMap),
    round = new PachaiKuthirai({
      state,
      players: [p],
      physics: world,
      startTick: 0,
      target: 0,
      seed: 1,
    });
  round.start();
  state.tick = 120;
  p.z = -100;
  round.afterMove();
  expect(p.finishTick).toBe(120);
  state.tick = 240;
  round.afterMove();
  expect(p.finishTick).toBe(120);
  world.dispose();
});
it('caps repeated momentum refreshes at one ten-percent bonus', () => {
  const world = new PhysicsScene({
      ...raceMap,
      boxes: raceMap.boxes.filter((b) => b.kind !== 'npc'),
    }),
    p = new Player({ slotId: 'p', x: 0, z: 3 });
  for (let tick = 1; tick <= 180; tick++) {
    p.boostUntil = tick + 60;
    world.move('p', p, { ...neutralInput(), moveZ: -1 }, tick);
    world.step();
    expect(Math.hypot(p.vx, p.vz)).toBeLessThanOrEqual(6.050001);
  }
  expect(Math.abs(p.vz)).toBeCloseTo(6.05);
  world.dispose();
});
