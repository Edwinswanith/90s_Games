import { beforeAll, describe, expect, it } from 'vitest';
import {
  initPhysics,
  PhysicsScene,
  neutralInput,
  sanitizeInput,
} from '../../packages/simulation/src/physics';
import { courtyard } from '../../packages/shared/src/maps';
import { Player, InputFrame } from '../../packages/shared/src/state';
beforeAll(initPhysics);
describe('shared movement', () => {
  it('preserves decoded schema accessor values during sanitization', () => {
    const frame = new InputFrame();
    frame.moveZ = -1;
    frame.jump = true;
    frame.round = 2;
    expect(sanitizeInput(frame)).toMatchObject({ moveZ: -1, jump: true, round: 2 });
  });
  it('limits diagonal input and rejects non-finite axes', () => {
    const a = sanitizeInput({ ...neutralInput(), moveX: 1, moveZ: 1, aimX: NaN });
    expect(Math.hypot(a.moveX, a.moveZ)).toBeCloseTo(1);
    expect(a.aimX).toBe(0);
  });
  it('walks, jumps with the specified height, lands, and cannot pass a wall', () => {
    const world = new PhysicsScene(courtyard),
      p = new Player();
    let max = 0;
    for (let t = 1; t <= 240; t++) {
      world.move('p', p, { ...neutralInput(), moveX: 1, jump: t === 30 }, t);
      world.step();
      max = Math.max(max, p.y);
    }
    expect(max).toBeGreaterThan(1.1);
    expect(max).toBeLessThan(1.4);
    expect(p.grounded).toBe(true);
    expect(p.x).toBeLessThan(9.5);
    world.dispose();
  });
  it('does not turn a held jump into unlimited jumping', () => {
    const world = new PhysicsScene(courtyard),
      p = new Player();
    for (let t = 1; t < 200; t++) {
      world.move('p', p, { ...neutralInput(), jump: true }, t);
      world.step();
    }
    expect(p.grounded).toBe(true);
    world.dispose();
  });
});
