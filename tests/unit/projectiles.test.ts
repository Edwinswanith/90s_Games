import { expect, it } from 'vitest';
import { Item, PartyState, Player } from '../../packages/shared/src/state';
import { BallSystem, segmentCircle } from '../../packages/simulation/src/projectiles';
import { neutralInput } from '../../packages/simulation/src/physics';
it('sweeps through a target crossed between endpoints', () => {
  expect(segmentCircle(-2, 0, 2, 0, 0, 0, 0.5)).toBeCloseTo(0.375);
});
it('keeps exactly tied pickups unassigned and makes a unique nearest pickup atomic', () => {
  const s = new PartyState(),
    a = new Player({ slotId: 'a', x: -0.5 }),
    b = new Player({ slotId: 'b', x: 0.5 }),
    balls = new BallSystem(s, [a, b], []);
  balls.spawn(1);
  const commands = new Map([
    ['a', { ...neutralInput(), action: true }],
    ['b', { ...neutralInput(), action: true }],
  ]);
  balls.actions(commands);
  expect(s.items.get('ball-0')!.status).toBe('GROUND');
  a.actionHeld = b.actionHeld = false;
  a.x = -0.2;
  balls.actions(commands);
  expect(a.item).toBe('ball-0');
  expect(b.item).toBe('');
});
it('spends a ball after one hit, excludes its owner and respects jumping/protection', () => {
  const s = new PartyState(),
    a = new Player({ slotId: 'a' }),
    b = new Player({ slotId: 'b', z: -1 }),
    balls = new BallSystem(s, [a, b], []);
  const ball = new Item({ id: 'ball', status: 'LIVE', owner: 'a', x: 0, z: 0, y: 0.9, vz: -12 });
  s.items.set(ball.id, ball);
  let hits = 0;
  for (let i = 0; i < 20; i++) {
    s.tick++;
    hits += balls.step().length;
  }
  expect(hits).toBe(1);
  expect(ball.status).toBe('SPENT');
  Object.assign(ball, { status: 'LIVE', x: 0, z: 0, travel: 0 });
  b.y = 1.25;
  for (let i = 0; i < 12; i++) expect(balls.step()).toHaveLength(0);
});
it('blocks projectiles at a wall before an opponent', () => {
  const s = new PartyState(),
    a = new Player({ slotId: 'a' }),
    b = new Player({ slotId: 'b', z: -3 });
  const balls = new BallSystem(
    s,
    [a, b],
    [{ id: 'wall', x: 0, y: 0.6, z: -1, w: 3, h: 1.2, d: 0.2 }],
  );
  balls.spawn(1);
  const ball = s.items.get('ball-0')!;
  balls.throw(a, ball, { ...neutralInput(), aimZ: -1 });
  for (let i = 0; i < 30; i++) expect(balls.step()).toHaveLength(0);
  expect(ball.status).toBe('SPENT');
});
