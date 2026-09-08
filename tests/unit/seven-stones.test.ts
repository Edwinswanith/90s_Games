import { beforeAll, expect, it } from 'vitest';
import { PartyState, Player } from '../../packages/shared/src/state';
import { initPhysics, PhysicsScene, neutralInput } from '../../packages/simulation/src/physics';
import { stonesMap } from '../../packages/shared/src/maps';
import { SevenStones, scatter } from '../../apps/server/src/rounds/seven-stones';
beforeAll(initPhysics);
function fixture() {
  const s = new PartyState(),
    players = Array.from({ length: 8 }, (_, i) => new Player({ slotId: String(i), team: i % 2 })),
    physics = new PhysicsScene(stonesMap),
    round = new SevenStones({ state: s, players, physics, startTick: 0, target: 0, seed: 2 });
  round.start();
  return { s, players, physics, round };
}
it('resets to equivalent mirrored layouts and preserves seven stone identities', () => {
  const { s, physics, round } = fixture();
  round.startHeat(2);
  expect([...s.items.values()].filter((i) => i.kind === 'stone')).toHaveLength(7);
  expect(s.items.get('stone-0')!.z).toBe(-scatter[0][1]);
  physics.dispose();
});
it('cancels a carried-stone placement safely on departure', () => {
  const { s, players, physics, round } = fixture();
  const p = players[0],
    stone = s.items.get('stone-0')!;
  Object.assign(stone, { status: 'CARRIED', owner: p.slotId });
  p.item = stone.id;
  p.placingUntil = 20;
  round.disconnect(p);
  expect(stone.status).toBe('GROUND');
  expect(stone.owner).toBe('');
  expect(p.placingUntil).toBe(0);
  physics.dispose();
});
it('completes two legal 4v4 heats and distributes one round of points', () => {
  const { s, players, physics, round } = fixture();
  for (let tick = 1; tick < 11500 && !round.done; tick++) {
    s.tick = tick;
    const commands = new Map(players.map((p) => [p.slotId, round.bot(p)]));
    round.beforeMove(commands);
    for (const p of players)
      physics.move(
        p.slotId,
        p,
        commands.get(p.slotId) ?? neutralInput(),
        tick,
        round.movementEnabled(),
      );
    physics.step();
    round.afterMove();
  }
  expect(round.done).not.toBeNull();
  expect(round.done!.heats).toHaveLength(2);
  expect(round.done!.groups.reduce((sum, g) => sum + g.points * g.slots.length, 0)).toBe(360);
  expect(round.done!.heats!.some((h) => h.count > 0)).toBe(true);
  physics.dispose();
});
