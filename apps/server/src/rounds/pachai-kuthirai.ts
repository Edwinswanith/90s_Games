import { BaseRound, steer } from './base';
import { raceCheckpoints } from '../../../../packages/shared/src/maps';
import { makeOutcome } from '../../../../packages/shared/src/scoring';
import type { Player } from '../../../../packages/shared/src/state';
import { neutralInput } from '../../../../packages/simulation/src/physics';
export class PachaiKuthirai extends BaseRound {
  previous = new Map<string, { x: number; z: number }>();
  botNodes = new Map<string, number>();
  firstFinish = -1;
  start() {
    this.s.deadline = this.ctx.startTick + 90 * 60;
    for (const p of this.players) this.previous.set(p.slotId, { x: p.x, z: p.z });
  }
  reset(p: Player) {
    const z = p.checkpoint ? raceCheckpoints[p.checkpoint - 1] - 1 : 3;
    Object.assign(p, {
      x: 0,
      y: 0.05,
      z,
      vx: 0,
      vy: 0,
      vz: 0,
      vaultUntil: 0,
      boostUntil: 0,
      jumpHeld: false,
      jumpBuffer: 0,
      lastGround: this.s.tick,
      grounded: true,
      stunUntil: this.s.tick + 25,
    });
    this.notice(p, 'Back to your checkpoint');
  }
  afterMove() {
    for (const p of this.players) {
      if (p.qualified) continue;
      const before = this.previous.get(p.slotId)!;
      if (p.y < -2) {
        this.reset(p);
        this.botNodes.delete(p.slotId);
      }
      const gate = raceCheckpoints[p.checkpoint];
      if (
        gate !== undefined &&
        before.z > gate &&
        p.z <= gate &&
        Math.abs(p.x) <= 5 &&
        p.y > -0.2
      ) {
        p.checkpoint++;
        this.notice(p, p.checkpoint === 4 ? 'Finished!' : 'Checkpoint saved');
        if (p.checkpoint === 4) {
          p.finishTick = this.s.tick;
          p.qualified = true;
          if (this.firstFinish < 0) {
            this.firstFinish = this.s.tick;
            this.s.deadline = Math.min(this.s.deadline, this.s.tick + 25 * 60);
          }
        }
      }
      const base = p.checkpoint ? -raceCheckpoints[p.checkpoint - 1] : 0,
        next = -(raceCheckpoints[p.checkpoint] ?? -99);
      p.progress = p.checkpoint * 1000 + Math.max(0, Math.min(next - base, -p.z - base));
      if (p.vaultUntil === this.s.tick && p.vaultStart > 0) {
        if (p.boostUntil > this.s.tick) this.notice(p, 'Clean vault');
        else {
          p.stunUntil = this.s.tick + 18;
          this.notice(p, 'Vault blocked. Reset your approach.');
        }
      }
      this.previous.set(p.slotId, { x: p.x, z: p.z });
    }
    const finishers = this.players.filter((p) => p.qualified).length;
    if (
      finishers === this.players.length ||
      (this.ctx.target > 0 && finishers >= this.ctx.target) ||
      this.s.tick >= this.s.deadline
    )
      this.done = makeOutcome(
        `${this.s.matchId}:${this.s.roundId}`,
        'pachai-kuthirai',
        this.players,
        (p) => [p.finishTick >= 0 ? 1 : 0, p.finishTick >= 0 ? -p.finishTick : p.progress],
        'Finishers rank by crossing time; others by validated route progress.',
        this.ctx.target,
      );
  }
  bot(p: Player) {
    if (p.qualified) return neutralInput();
    const lane = this.players.indexOf(p) % 2 ? -8 : 2;
    const nodes = [
      { x: 0, z: -24.7 },
      { x: 0, z: -48.5 },
      { x: lane, z: -50.5 },
      { x: lane, z: -69.5 },
      { x: 0, z: -73.8 },
      { x: 0, z: -100 },
    ];
    let index =
      this.botNodes.get(p.slotId) ??
      (p.checkpoint >= 3 ? 5 : p.checkpoint === 2 ? 2 : p.checkpoint);
    while (index < nodes.length - 1 && Math.hypot(nodes[index].x - p.x, nodes[index].z - p.z) < 0.8)
      index++;
    this.botNodes.set(p.slotId, index);
    const cmd = steer(p, nodes[index], 0.1);
    cmd.jump =
      p.grounded &&
      this.ctx.physics.map.boxes.some(
        (b) =>
          b.kind === 'npc' &&
          Math.abs(b.x - p.x) < b.w / 2 + 0.1 &&
          p.z - b.z > 1.5 &&
          p.z - b.z < 2,
      );
    return cmd;
  }
}
