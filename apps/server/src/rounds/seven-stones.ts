import { BaseRound, steer } from './base';
import { BallSystem } from '../../../../packages/simulation/src/projectiles';
import { neutralInput, type Command } from '../../../../packages/simulation/src/physics';
import { Item, type Player } from '../../../../packages/shared/src/state';
import { seeded, shuffle } from '../../../../packages/shared/src/config';
import { makeOutcome } from '../../../../packages/shared/src/scoring';
import { ballBot } from './eripandhu';
export const scatter = [
  [-6, -4],
  [-2, -5],
  [3, -4],
  [6, -1],
  [5, 4],
  [-1, 5],
  [-6, 2],
];
export class SevenStones extends BaseRound {
  balls = new BallSystem(
    this.s,
    this.players,
    this.ctx.physics.map.boxes,
    (p) => p.team !== this.s.builderTeam,
    (owner, target) => owner.team !== this.s.builderTeam && target.team === this.s.builderTeam,
  );
  performances: { team: number; count: number; tick: number }[] = [];
  heatStart = 0;
  lastProgress = 0;
  phaseEnd = 0;
  start() {
    const balanced = this.players.filter((p) => p.team === 0).length === this.players.length / 2;
    if (!balanced)
      shuffle(this.players, seeded(this.ctx.seed)).forEach(
        (p, i) => (p.team = i < this.players.length / 2 ? 0 : 1),
      );
    this.startHeat(1);
  }
  startHeat(heat: number) {
    this.s.heat = heat;
    this.s.builderTeam = heat - 1;
    this.s.stacked = 0;
    this.s.heatPhase = 'knockdown';
    this.phaseEnd = this.s.tick + 60;
    this.s.deadline = this.phaseEnd + 90 * 60;
    this.s.items.clear();
    this.lastProgress = 0;
    const sign = heat === 1 ? 1 : -1;
    for (let i = 0; i < 7; i++) {
      const [x, z] = scatter[i];
      this.s.items.set(
        `stone-${i}`,
        new Item({ id: `stone-${i}`, kind: 'stone', x, z: z * sign, y: 0.1 }),
      );
    }
    const builders = this.players.filter((p) => p.team === this.s.builderTeam),
      defenders = this.players.filter((p) => p.team !== this.s.builderTeam);
    for (const group of [builders, defenders])
      group.forEach((p, i) =>
        Object.assign(p, {
          x: (i - (group.length - 1) / 2) * 2.2,
          z: (group === builders ? 7 : -7) * sign,
          y: 0.05,
          vx: 0,
          vy: 0,
          vz: 0,
          grounded: true,
          item: '',
          placingUntil: 0,
          stunUntil: 0,
          protectionUntil: this.phaseEnd + 60,
          throwUntil: 0,
          actionHeld: false,
          jumpHeld: false,
          jumpBuffer: 0,
        }),
      );
    this.balls.spawn(this.players.length === 8 ? 2 : 1);
    for (const item of this.s.items.values()) if (item.kind === 'ball') item.z = -3 * sign;
  }
  movementEnabled() {
    return this.s.heatPhase === 'active';
  }
  beforeMove(commands: Map<string, Command>) {
    if (this.s.heatPhase !== 'active') return;
    const edges = this.players.filter((p) => commands.get(p.slotId)?.action && !p.actionHeld);
    this.balls.actions(commands);
    const claims = new Map<string, { p: Player; d: number }[]>();
    for (const p of edges) {
      if (p.team !== this.s.builderTeam || this.s.tick < p.stunUntil) continue;
      if (p.item) {
        if (p.item.startsWith('stone') && !p.placingUntil && Math.hypot(p.x, p.z) <= 1.3)
          p.placingUntil = this.s.tick + 27;
        continue;
      }
      const stone = [...this.s.items.values()]
        .filter(
          (i) =>
            i.kind === 'stone' && i.status === 'GROUND' && Math.hypot(i.x - p.x, i.z - p.z) <= 1.2,
        )
        .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
      if (stone) {
        const list = claims.get(stone.id) ?? [];
        list.push({ p, d: Math.hypot(p.x - stone.x, p.z - stone.z) });
        claims.set(stone.id, list);
      }
    }
    for (const [id, list] of claims) {
      list.sort((a, b) => a.d - b.d);
      if (list.length > 1 && Math.abs(list[0].d - list[1].d) < 1e-6) continue;
      const stone = this.s.items.get(id)!;
      stone.status = 'CARRIED';
      stone.owner = list[0].p.slotId;
      list[0].p.item = id;
    }
  }
  dropStone(p: Player) {
    const stone = this.s.items.get(p.item);
    if (stone?.kind === 'stone') {
      const x = Math.max(-10, Math.min(10, p.x));
      let z = Math.max(-8, Math.min(8, p.z));
      for (const b of this.ctx.physics.map.boxes.filter((b) => b.kind === 'cover'))
        if (Math.abs(x - b.x) < b.w / 2 + 0.35 && Math.abs(z - b.z) < b.d / 2 + 0.35)
          z = b.z + (z > b.z ? 1 : -1) * (b.d / 2 + 0.5);
      Object.assign(stone, { status: 'GROUND', owner: '', x, z, y: 0.1 });
    }
    p.item = '';
    p.placingUntil = 0;
  }
  afterMove() {
    if (this.s.heatPhase === 'knockdown' && this.s.tick >= this.phaseEnd) {
      this.s.heatPhase = 'active';
      this.heatStart = this.s.tick;
      this.s.deadline = this.s.tick + 90 * 60;
    }
    if (this.s.heatPhase === 'swap') {
      if (this.s.tick >= this.phaseEnd) this.startHeat(2);
      return;
    }
    if (this.s.heatPhase !== 'active') return;
    const targets = new Set(this.balls.step().map((h) => h.target));
    for (const p of targets) {
      this.dropStone(p);
      p.stunUntil = this.s.tick + 39;
      p.protectionUntil = this.s.tick + 90;
      this.notice(p, 'Stone dropped! Pick it up and keep building.');
    }
    for (const p of this.players) {
      const stone = this.s.items.get(p.item);
      if (stone?.kind === 'stone') {
        stone.x = p.x;
        stone.z = p.z;
        stone.y = p.y + 0.85;
      }
      if (!p.placingUntil) continue;
      if (
        p.stunUntil > this.s.tick ||
        Math.hypot(p.x, p.z) > 1.3 ||
        stone?.kind !== 'stone' ||
        stone.owner !== p.slotId
      ) {
        p.placingUntil = 0;
        continue;
      }
      p.mode = 'place';
      if (this.s.tick >= p.placingUntil) {
        Object.assign(stone, {
          status: 'STACKED',
          owner: '',
          stackIndex: this.s.stacked,
          x: 0,
          z: 0,
          y: 0.15 + this.s.stacked * 0.16,
        });
        this.s.stacked++;
        p.item = '';
        p.placingUntil = 0;
        this.lastProgress = this.s.tick - this.heatStart;
        this.notice(p, 'Stone placed');
      }
    }
    if (this.s.stacked === 7 || this.s.tick >= this.s.deadline) {
      this.performances.push({
        team: this.s.builderTeam,
        count: this.s.stacked,
        tick: this.lastProgress,
      });
      this.balls.clear();
      for (const p of this.players) {
        p.item = '';
        p.placingUntil = 0;
      }
      if (this.s.heat === 1) {
        this.s.heatPhase = 'swap';
        this.phaseEnd = this.s.tick + 240;
        this.s.deadline = this.phaseEnd;
      } else {
        const performance = (team: number) => this.performances.find((h) => h.team === team)!;
        const a = performance(0),
          b = performance(1);
        const equal = a.count === b.count && (a.count === 0 || a.tick === b.tick);
        const reason = equal
          ? 'Both teams matched their building performance. A draw.'
          : 'More stones wins; equal positive counts use the earlier progress time.';
        this.done = makeOutcome(
          `${this.s.matchId}:${this.s.roundId}`,
          'seven-stones',
          this.players,
          (p) => {
            const h = performance(p.team);
            return [h.count, h.count ? -h.tick : 0];
          },
          reason,
        );
        this.done.draw = equal;
        this.done.heats = this.performances;
      }
    }
  }
  bot(p: Player): Command {
    if (this.s.heatPhase !== 'active') return neutralInput();
    if (p.team !== this.s.builderTeam) return ballBot(this, p);
    if (p.placingUntil) return neutralInput();
    let cmd = neutralInput();
    if (p.item) cmd = steer(p, { x: 0, z: 0 }, 0.6);
    else {
      const stones = [...this.s.items.values()]
        .filter((i) => i.kind === 'stone' && i.status === 'GROUND')
        .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z));
      if (stones[0]) cmd = steer(p, stones[0], 0.65);
    }
    cmd.action = this.s.tick % 12 === this.players.indexOf(p) % 12;
    return cmd;
  }
  disconnect(p: Player) {
    if (p.item.startsWith('stone')) this.dropStone(p);
    else this.balls.drop(p);
  }
}
