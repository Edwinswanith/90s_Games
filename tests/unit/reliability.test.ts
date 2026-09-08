import { beforeAll, expect, it } from 'vitest';
import { initPhysics, PhysicsScene, neutralInput } from '../../packages/simulation/src/physics';
import { courtyard, paandiMap, paandiGroup, markerFor } from '../../packages/shared/src/maps';
import { PartyState, Player, Item } from '../../packages/shared/src/state';
import { makeOutcome } from '../../packages/shared/src/scoring';
import { BallSystem, BALL } from '../../packages/simulation/src/projectiles';
import { Eripandhu } from '../../apps/server/src/rounds/eripandhu';
import { Paandi } from '../../apps/server/src/rounds/paandi';
import { ballMap, stonesMap } from '../../packages/shared/src/maps';
import { SevenStones } from '../../apps/server/src/rounds/seven-stones';
beforeAll(initPhysics);
it('advances every member of a tie at the qualification boundary and conserves points', () => {
  const players = Array.from(
    { length: 8 },
    (_, i) => new Player({ slotId: String(i), progress: [8, 7, 6, 5, 5, 3, 2, 1][i] }),
  );
  const outcome = makeOutcome('t', 'paandi', players, (p) => [p.progress], 'test', 4);
  expect(outcome.qualifiers).toEqual(['0', '1', '2', '3', '4']);
  expect(outcome.groups.find((g) => g.place === 4)!.points).toBe(45);
  expect(outcome.groups.reduce((s, g) => s + g.points * g.slots.length, 0)).toBe(360);
});
it('buffers a jump before landing and prevents eliminated vaults from moving along an old arc', () => {
  const world = new PhysicsScene(courtyard),
    p = new Player({ slotId: 'p', y: 0.3, grounded: false, vy: -4, lastGround: -999 });
  let buffered = false;
  for (let t = 1; t < 25; t++) {
    world.move('p', p, { ...neutralInput(), jump: t === 1 }, t);
    world.step();
    if (p.vy > 0) buffered = true;
  }
  expect(buffered).toBe(true);
  p.alive = false;
  p.vaultUntil = 999;
  p.vaultStart = 0;
  p.vaultEndZ = -20;
  world.move('p', p, neutralInput(), 25);
  expect(p.vaultUntil).toBe(0);
  world.dispose();
});
it('drops held balls on timeout, blocks protection hits, and enforces throw recovery', () => {
  const s = new PartyState(),
    a = new Player({ slotId: 'a' }),
    b = new Player({ slotId: 'b', z: -0.5, protectionUntil: 100 }),
    balls = new BallSystem(s, [a, b], []);
  balls.spawn(1);
  balls.actions(new Map([['a', { ...neutralInput(), action: true }]]));
  expect(a.item).toBe('ball-0');
  s.tick = BALL.heldTicks;
  balls.step();
  expect(a.item).toBe('');
  const ball = s.items.get('ball-0')!;
  Object.assign(ball, { status: 'LIVE', owner: 'a', x: 0, z: 0, y: 0.9, vz: -12, travel: 0 });
  s.tick = 10;
  expect(balls.step()).toHaveLength(0);
  expect(ball.status).toBe('SPENT');
  a.throwUntil = 200;
  a.actionHeld = false;
  ball.status = 'GROUND';
  ball.x = 0;
  ball.z = 0;
  balls.actions(new Map([['a', { ...neutralInput(), action: true }]]));
  expect(a.item).toBe('');
});
it('keeps simultaneous final hits tied and bounds sudden death', () => {
  const s = new PartyState(),
    a = new Player({ slotId: 'a', z: 0.5, lives: 1 }),
    b = new Player({ slotId: 'b', z: -0.5, lives: 1 }),
    world = new PhysicsScene(ballMap),
    r = new Eripandhu({
      state: s,
      players: [a, b],
      physics: world,
      startTick: 0,
      target: 0,
      seed: 1,
    });
  r.start();
  Object.assign(a, { z: 0.5, lives: 1 });
  Object.assign(b, { z: -0.5, lives: 1 });
  s.items.clear();
  s.items.set('a', new Item({ id: 'a', owner: 'a', status: 'LIVE', z: -0.1, y: 0.9, vz: -12 }));
  s.items.set('b', new Item({ id: 'b', owner: 'b', status: 'LIVE', z: 0.1, y: 0.9, vz: 12 }));
  s.tick = 1;
  r.afterMove();
  expect(r.done!.groups[0].slots).toHaveLength(2);
  expect(r.done!.draw).toBe(true);
  world.dispose();
  const world2 = new PhysicsScene(ballMap),
    state = new PartyState(),
    players = [new Player({ slotId: 'x' }), new Player({ slotId: 'y' })],
    round = new Eripandhu({ state, players, physics: world2, startTick: 0, target: 0, seed: 1 });
  round.start();
  state.tick = 5400;
  round.afterMove();
  expect(state.suddenDeath).toBe(true);
  expect(state.deadline).toBe(7200);
  state.tick = 7200;
  round.afterMove();
  expect(round.done).not.toBeNull();
  world2.dispose();
});
it('cancels stone placement before a same-tick ball hit can commit it', () => {
  const s = new PartyState(),
    builder = new Player({ slotId: 'b', team: 0 }),
    defender = new Player({ slotId: 'd', team: 1 }),
    world = new PhysicsScene(stonesMap),
    r = new SevenStones({
      state: s,
      players: [builder, defender],
      physics: world,
      startTick: 0,
      target: 0,
      seed: 1,
    });
  r.start();
  s.heatPhase = 'active';
  s.tick = 100;
  Object.assign(builder, { x: 0, z: 0, item: 'stone-0', placingUntil: 100, protectionUntil: 0 });
  const stone = s.items.get('stone-0')!;
  Object.assign(stone, { status: 'CARRIED', owner: 'b' });
  s.items.set(
    'live',
    new Item({ id: 'live', owner: 'd', status: 'LIVE', x: 0, z: 0.3, y: 0.9, vz: -12 }),
  );
  r.afterMove();
  expect(s.stacked).toBe(0);
  expect(stone.status).toBe('GROUND');
  expect(builder.placingUntil).toBe(0);
  world.dispose();
});
it('resets only the current Paandi section after forbidden or skipped landings', () => {
  const s = new PartyState(),
    p = new Player({
      slotId: 'p',
      section: 1,
      gate: 3,
      lastSupport: 1,
      airborneFrom: 1,
      grounded: true,
    }),
    world = new PhysicsScene(paandiMap),
    r = new Paandi({ state: s, players: [p], physics: world, startTick: 0, target: 0, seed: 1 });
  r.start();
  const marker = markerFor(1, 1);
  Object.assign(p, { x: 0, z: paandiGroup(1, marker).z });
  r.wasGrounded.set('p', false);
  r.afterMove();
  expect(p.section).toBe(1);
  expect(p.gate).toBe(0);
  expect(p.markerRetrieved).toBe(false);
  world.dispose();
});
