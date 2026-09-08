import { BaseRound, steer } from './base';
import {
  paandiBase,
  paandiGroup,
  paandiSupport,
  markerFor,
} from '../../../../packages/shared/src/maps';
import { neutralInput, type Command } from '../../../../packages/simulation/src/physics';
import type { Player } from '../../../../packages/shared/src/state';
import { makeOutcome } from '../../../../packages/shared/src/scoring';
export class Paandi extends BaseRound {
  botGround = new Map<string, boolean>();
  botWait = new Map<string, number>();
  wasGrounded = new Map<string, boolean>();
  previousZ = new Map<string, number>();
  firstFinish = -1;
  start() {
    this.s.deadline = this.ctx.startTick + 105 * 60;
    for (const p of this.players) {
      this.wasGrounded.set(p.slotId, true);
      this.previousZ.set(p.slotId, p.z);
    }
  }
  reset(p: Player, reason: string) {
    Object.assign(p, {
      x: 0,
      y: 0.03,
      z: paandiBase(p.section),
      vx: 0,
      vy: 0,
      vz: 0,
      grounded: true,
      jumpHeld: false,
      jumpBuffer: 0,
      gate: 0,
      lastSupport: -1,
      airborneFrom: -1,
      returning: false,
      markerRetrieved: false,
      stunUntil: this.s.tick + 30,
    });
    this.wasGrounded.set(p.slotId, true);
    this.notice(p, reason);
  }
  beforeMove(commands: Map<string, Command>) {
    for (const p of this.players) {
      const cmd = commands.get(p.slotId),
        edge = !!cmd?.action && !p.actionHeld;
      p.actionHeld = !!cmd?.action;
      if (!edge || p.section >= 3 || !p.returning || p.markerRetrieved || !p.grounded) continue;
      const marker = markerFor(this.ctx.seed, p.section);
      if (p.lastSupport === marker + 1 && paandiSupport(p.section, p.x, p.z) === marker + 1) {
        p.markerRetrieved = true;
        this.notice(p, 'Marker retrieved. Hop home.');
      }
    }
  }
  afterMove() {
    for (const p of this.players) {
      if (p.qualified) continue;
      if (p.section >= 3) {
        if ((this.previousZ.get(p.slotId) ?? p.z) > -48 && p.z <= -48 && p.x >= 2.5 && p.x <= 5.5) {
          p.qualified = true;
          p.finishTick = this.s.tick;
          if (this.firstFinish < 0) {
            this.firstFinish = this.s.tick;
            this.s.deadline = Math.min(this.s.deadline, this.s.tick + 25 * 60);
          }
        }
        this.previousZ.set(p.slotId, p.z);
        continue;
      }
      const support = paandiSupport(p.section, p.x, p.z),
        was = this.wasGrounded.get(p.slotId) ?? true;
      if (p.y < -2) {
        this.reset(p, 'Back to this section');
        continue;
      }
      if (p.gate === 0 && !p.returning) {
        if (p.grounded && support === 0) {
          p.gate = 1;
          p.lastSupport = 0;
        }
        this.wasGrounded.set(p.slotId, p.grounded);
        continue;
      }
      if (was && !p.grounded) p.airborneFrom = p.lastSupport;
      if (!was && p.grounded) {
        const marker = markerFor(this.ctx.seed, p.section);
        if (support === marker && !p.markerRetrieved) {
          this.reset(p, 'Skip the marked cell');
          continue;
        }
        if (support === p.lastSupport) {
          /* An in-place hop makes no progress. */
        } else if (support !== p.gate || p.airborneFrom !== p.lastSupport) {
          this.reset(p, 'Land on the highlighted next group');
          continue;
        } else {
          p.lastSupport = support;
          if (!p.returning) {
            if (support === 7) {
              p.returning = true;
              p.gate = 6;
              this.notice(p, 'Turn back. Retrieve the marker beside it.');
            } else {
              p.gate = support + 1;
              if (p.gate === marker) p.gate++;
            }
          } else if (support === 0) {
            p.section++;
            p.gate = 0;
            p.lastSupport = -1;
            p.returning = false;
            p.markerRetrieved = false;
            this.notice(
              p,
              p.section === 3
                ? 'All sections complete. Follow the side path to finish.'
                : 'Section saved. Walk to the next start.',
            );
          } else p.gate = support - 1;
        }
      } else if (p.grounded && support !== p.lastSupport) {
        this.reset(p, 'Hop between the chalk groups');
        continue;
      }
      p.progress =
        p.section * 1000 + (p.returning ? 14 - p.lastSupport : Math.max(0, p.lastSupport));
      this.wasGrounded.set(p.slotId, p.grounded);
      this.previousZ.set(p.slotId, p.z);
    }
    const finishers = this.players.filter((p) => p.qualified).length;
    if (
      finishers === this.players.length ||
      (this.ctx.target > 0 && finishers >= this.ctx.target) ||
      this.s.tick >= this.s.deadline
    )
      this.done = makeOutcome(
        `${this.s.matchId}:${this.s.roundId}`,
        'paandi',
        this.players,
        (p) => [p.finishTick >= 0 ? 1 : 0, p.finishTick >= 0 ? -p.finishTick : p.progress],
        'Finishers rank by crossing time; others by validated section and gate progress.',
        this.ctx.target,
      );
  }
  bot(p: Player): Command {
    if (p.qualified || this.s.tick < p.stunUntil) return neutralInput();
    const index = this.players.indexOf(p);
    if (p.grounded && !this.botGround.get(p.slotId))
      this.botWait.set(p.slotId, this.s.tick + 6 + index * 2);
    this.botGround.set(p.slotId, p.grounded);
    if (p.grounded && this.s.tick < (this.botWait.get(p.slotId) ?? 0)) return neutralInput();
    if (p.section >= 3) return steer(p, { x: 4, z: -49 }, 0.1);
    if (p.gate === 0 && !p.returning) {
      const z = paandiBase(p.section);
      return steer(p, { x: Math.abs(p.z - z) > 1.6 ? 3.5 : 0, z }, 0.15);
    }
    const marker = markerFor(this.ctx.seed, p.section);
    if (p.returning && !p.markerRetrieved && p.lastSupport === marker + 1 && p.grounded)
      return { ...neutralInput(), action: true };
    const target = { ...paandiGroup(p.section, p.gate), x: ((index % 3) - 1) * 0.12 };
    const remaining = p.grounded
      ? 0.65
      : Math.max(0.1, (p.vy + Math.sqrt(p.vy * p.vy + 48 * Math.max(0, p.y))) / 24);
    return {
      ...neutralInput(),
      moveX: Math.max(-1, Math.min(1, (target.x - p.x) / remaining / 5.5)),
      moveZ: Math.max(-1, Math.min(1, (target.z - p.z) / remaining / 5.5)),
      jump: p.grounded,
    };
  }
}
