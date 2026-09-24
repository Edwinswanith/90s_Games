import { BaseRound, pace, steer } from './base';
import { raceCheckpoints } from '../../../../packages/shared/src/maps';
import { makeOutcome } from '../../../../packages/shared/src/scoring';
import { Item, type Player } from '../../../../packages/shared/src/state';
import { seeded } from '../../../../packages/shared/src/config';
import { neutralInput } from '../../../../packages/simulation/src/physics';
const TYRE_ROWS = [-14, -35.5, -84];
const TYRE_SWING = 4.3;
export class PachaiKuthirai extends BaseRound {
  previous = new Map<string, { x: number; z: number }>();
  botNodes = new Map<string, number>();
  firstFinish = -1;
  tyres: { id: string; phase: number; omega: number }[] = [];
  hesitate = new Map<string, number>();
  decided = new Set<string>();
  start() {
    this.s.deadline = this.ctx.startTick + 90 * 60;
    for (const p of this.players) this.previous.set(p.slotId, { x: p.x, z: p.z });
    // Rolling tyres cross the lane between vault rows: jump them or get bumped.
    const random = seeded(this.ctx.seed ^ 0x7a3e);
    TYRE_ROWS.forEach((z, i) => {
      const id = `tyre-${i}`;
      this.tyres.push({
        id,
        phase: random() * Math.PI * 2,
        omega: (Math.PI * 2) / ((2.4 + i * 0.5) * 60),
      });
      this.s.items.set(id, new Item({ id, kind: 'tyre', status: 'HAZARD', x: 0, y: 0.45, z }));
    });
    this.moveTyres();
  }
  moveTyres() {
    const t = this.s.tick - this.ctx.startTick;
    for (const tyre of this.tyres) {
      const item = this.s.items.get(tyre.id)!;
      item.x = TYRE_SWING * Math.sin(tyre.phase + t * tyre.omega);
      item.vx = TYRE_SWING * tyre.omega * 60 * Math.cos(tyre.phase + t * tyre.omega);
    }
  }
  tyreContact(p: Player) {
    if (p.qualified || p.vaultUntil > this.s.tick || p.protectionUntil > this.s.tick || p.y > 0.45)
      return;
    for (const tyre of this.tyres) {
      const item = this.s.items.get(tyre.id)!;
      if (Math.abs(p.x - item.x) < 0.65 && Math.abs(p.z - item.z) < 0.5) {
        p.stunUntil = this.s.tick + 36;
        p.protectionUntil = this.s.tick + 90;
        p.vx = Math.sign(item.vx || 1) * 4.5;
        p.vz = 2.5;
        p.boostUntil = 0;
        this.notice(p, 'Tyre bump! Jump the rolling tyres.');
        return;
      }
    }
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
    this.moveTyres();
    for (const p of this.players) {
      if (p.qualified) continue;
      this.tyreContact(p);
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
    const skill = this.skill(p);
    if (this.s.tick < (this.hesitate.get(p.slotId) ?? 0)) return neutralInput();
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
    // CPUs occasionally lose their nerve before a vault row.
    for (const b of this.ctx.physics.map.boxes) {
      const d = p.z - b.z;
      if (b.kind !== 'npc' || d < 2.3 || d > 2.9 || Math.abs(b.x - p.x) > b.w / 2) continue;
      const key = `${p.slotId}:${b.z}`;
      if (this.decided.has(key)) break;
      this.decided.add(key);
      if (this.choice() < skill.slip * 3) {
        this.hesitate.set(p.slotId, this.s.tick + 18 + skill.reaction * 3);
        return neutralInput();
      }
      break;
    }
    const cmd = pace(steer(p, nodes[index], 0.1), skill);
    const tyreAhead = this.tyres.some((tyre) => {
      const item = this.s.items.get(tyre.id)!,
        d = p.z - item.z;
      if (d < 0.6 || d > 1.9 || Math.abs(item.x + item.vx * 0.25 - p.x) > 1.4) return false;
      const key = `${p.slotId}:${tyre.id}:${Math.floor((this.s.tick * tyre.omega) / Math.PI)}`;
      if (!this.decided.has(key)) {
        this.decided.add(key);
        if (this.choice() < skill.slip * 2.5) this.decided.add(`${key}:miss`);
      }
      return !this.decided.has(`${key}:miss`);
    });
    cmd.jump =
      (p.grounded && tyreAhead) ||
      (p.grounded &&
        this.ctx.physics.map.boxes.some(
          (b) =>
            b.kind === 'npc' &&
            Math.abs(b.x - p.x) < b.w / 2 + 0.1 &&
            p.z - b.z > 1.5 &&
            p.z - b.z < 2,
        ));
    return cmd;
  }
}
