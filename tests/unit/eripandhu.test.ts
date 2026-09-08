import { beforeAll, expect, it } from 'vitest';
import { PartyState, Player } from '../../packages/shared/src/state';
import { initPhysics, PhysicsScene } from '../../packages/simulation/src/physics';
import { ballMap } from '../../packages/shared/src/maps';
import { Eripandhu } from '../../apps/server/src/rounds/eripandhu';
beforeAll(initPhysics);
it('finishes an eight-player contest with legal CPU controls', () => {
  const s = new PartyState(),
    players = ballMap.spawns.map((spawn, i) => new Player({ slotId: String(i), ...spawn }));
  const physics = new PhysicsScene(ballMap),
    r = new Eripandhu({ state: s, players, physics, startTick: 0, target: 0, seed: 1 });
  r.start();
  for (let tick = 1; tick <= 7250 && !r.done; tick++) {
    s.tick = tick;
    const commands = new Map(players.map((p) => [p.slotId, r.bot(p)]));
    r.beforeMove(commands);
    for (const p of players) physics.move(p.slotId, p, commands.get(p.slotId)!, tick);
    physics.step();
    r.afterMove();
  }
  expect(r.done).not.toBeNull();
  expect(r.done!.groups.flatMap((g) => g.slots)).toHaveLength(8);
  expect(players.some((p) => p.hits > 0)).toBe(true);
  physics.dispose();
});
