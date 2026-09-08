import { beforeAll, expect, it } from 'vitest';
import { PartyState, Player } from '../../packages/shared/src/state';
import { initPhysics, PhysicsScene, neutralInput } from '../../packages/simulation/src/physics';
import { paandiMap, paandiSupport } from '../../packages/shared/src/maps';
import { Paandi } from '../../apps/server/src/rounds/paandi';
beforeAll(initPhysics);
function fixture(seed = 2) {
  const s = new PartyState(),
    p = new Player({ slotId: 'p', z: 4 }),
    physics = new PhysicsScene(paandiMap),
    round = new Paandi({ state: s, players: [p], physics, startTick: 0, target: 0, seed });
  round.start();
  return { s, p, physics, round };
}
it('completes three out-and-back sections with legal jump inputs for every marker seed', () => {
  for (const seed of [0, 1, 2]) {
    const { s, p, physics, round } = fixture(seed);
    for (let tick = 1; tick <= 6300 && !round.done; tick++) {
      s.tick = tick;
      const cmd = round.bot(p);
      round.beforeMove(new Map([[p.slotId, cmd]]));
      physics.move(p.slotId, p, cmd, tick);
      physics.step();
      round.afterMove();
    }
    expect({
      seed,
      section: p.section,
      gate: p.gate,
      finish: p.finishTick,
      x: p.x,
      z: p.z,
      notice: p.notice,
    }).toEqual(expect.objectContaining({ section: 3, finish: expect.any(Number) }));
    expect(p.finishTick).toBeGreaterThan(0);
    physics.dispose();
  }
});
it('rejects walking and distant retrieval, and accepts the visible edge tolerance', () => {
  const { s, p, physics, round } = fixture();
  round.afterMove();
  p.z = 2.55;
  s.tick++;
  round.afterMove();
  expect(p.gate).toBe(0);
  expect(p.z).toBe(4);
  p.returning = true;
  p.lastSupport = 7;
  p.x = 5;
  round.beforeMove(new Map([[p.slotId, { ...neutralInput(), action: true }]]));
  expect(p.markerRetrieved).toBe(false);
  expect(paandiSupport(0, 0.75, 4 - 1.45)).toBe(1);
  physics.dispose();
});
