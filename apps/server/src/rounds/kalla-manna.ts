import { BaseRound, pace, steer } from './base';
import { makeOutcome } from '../../../../packages/shared/src/scoring';
import { seeded } from '../../../../packages/shared/src/config';
import { kallaCells, cellAt } from '../../../../packages/shared/src/maps';
import type { Player } from '../../../../packages/shared/src/state';
import { neutralInput } from '../../../../packages/simulation/src/physics';
export class KallaManna extends BaseRound {
  random = seeded(this.ctx.seed);
  // Separate stream so CPU nerves never change the seeded hazard sequence.
  nerves = seeded(this.ctx.seed ^ 0x5f3759df);
  panic = new Map<string, number>();
  safeIds = new Set<number>();
  callTick = 0;
  start() {
    this.s.wave = 0;
    this.s.deadline = this.ctx.startTick + 75 * 60;
    this.nextWave();
  }
  nextWave() {
    this.s.wave++;
    this.callTick = this.s.tick;
    this.s.safe = this.random() < 0.5 ? 'stone' : 'sand';
    const candidates = kallaCells.filter((c) => c.material === this.s.safe);
    this.safeIds = new Set(candidates.map((c) => c.index));
    const warning = Math.max(108, 180 - this.s.wave * 8);
    // CPUs occasionally freeze on a call, more often as the pace rises, so survival stays
    // uncertain and the round thins out instead of ending in an eight-way tie.
    this.panic.clear();
    for (const p of this.players)
      if (
        p.cpu &&
        this.nerves() < Math.min(0.45, (0.03 + this.s.wave * 0.025) * (this.skill(p).slip / 0.06))
      )
        this.panic.set(p.slotId, Math.round(warning * (0.55 + this.nerves() * 0.4)));
    if (this.s.wave > 4) {
      const selected = candidates.filter(() => this.random() < 0.5);
      for (const p of this.players.filter((p) => p.alive)) {
        const nearest = [...candidates].sort(
          (a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z),
        )[0];
        if (nearest && !selected.includes(nearest)) selected.push(nearest);
      }
      this.safeIds = new Set(selected.map((c) => c.index));
    }
    // Retain a reachable authored target for every currently active participant.
    this.s.safeTiles = JSON.stringify([...this.safeIds]);
    this.s.wavePhase = 'warning';
    this.s.waveDeadline = this.s.tick + warning;
  }
  afterMove() {
    if (this.s.tick >= this.s.waveDeadline) {
      if (this.s.wavePhase === 'warning') {
        this.s.wavePhase = 'active';
        this.s.waveDeadline = this.s.tick + 120;
      } else if (this.s.wavePhase === 'active') {
        this.s.wavePhase = 'recovery';
        this.s.waveDeadline = this.s.tick + 60;
      } else this.nextWave();
    }
    for (const p of this.players) {
      if (!p.alive) continue;
      const cell = cellAt(p.x, p.z);
      if (!cell || p.y < -2) this.eliminate(p, 'Out of the courtyard');
      else if (this.s.wavePhase === 'active' && p.grounded && !this.safeIds.has(cell.index))
        this.eliminate(p, `Wrong surface. ${this.s.safe.toUpperCase()} was safe.`);
    }
    const alive = this.players.filter((p) => p.alive).length;
    if (alive <= (this.ctx.target || 1) || this.s.tick >= this.s.deadline)
      this.done = makeOutcome(
        `${this.s.matchId}:${this.s.roundId}`,
        'kalla-manna',
        this.players,
        (p) => [p.alive ? 1 : 0, p.alive ? 0 : p.eliminatedTick],
        this.s.tick >= this.s.deadline
          ? 'Time limit: remaining survivors share their places.'
          : 'Survival time determines placement.',
        this.ctx.target,
      );
  }
  bot(p: Player) {
    if (!p.alive || this.s.wavePhase === 'recovery') return neutralInput();
    const delay =
      18 + this.players.indexOf(p) * 3 + this.skill(p).reaction + (this.panic.get(p.slotId) ?? 0);
    if (this.s.tick - this.callTick < delay) return neutralInput();
    const candidates = kallaCells.filter((c) => this.safeIds.has(c.index));
    const target = candidates.sort(
      (a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z),
    )[0];
    return target ? pace(steer(p, target, 0.25), this.skill(p)) : neutralInput();
  }
}
