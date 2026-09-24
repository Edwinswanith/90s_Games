import { BaseRound, pace, steer, type Skill } from './base';
import { BallSystem, BALL } from '../../../../packages/simulation/src/projectiles';
import { neutralInput, type Command } from '../../../../packages/simulation/src/physics';
import { makeOutcome } from '../../../../packages/shared/src/scoring';
import type { Player } from '../../../../packages/shared/src/state';
export class Eripandhu extends BaseRound {
  balls = new BallSystem(this.s, this.players, this.ctx.physics.map.boxes);
  outside = new Map<string, number>();
  start() {
    this.s.suddenDeath = false;
    this.s.boundary = 10;
    this.s.deadline = this.ctx.startTick + 90 * 60;
    const n = this.players.length;
    this.balls.spawn(n >= 6 ? 3 : n >= 4 ? 2 : 1);
    if (n === 2) {
      Object.assign(this.players[0], { x: 0, z: 5 });
      Object.assign(this.players[1], { x: 0, z: -5 });
    }
  }
  beforeMove(commands: Map<string, Command>) {
    this.balls.actions(commands);
  }
  afterMove() {
    const hits = this.balls.step(),
      targets = new Set(hits.map((h) => h.target));
    for (const p of targets) {
      p.lives = this.s.suddenDeath ? 0 : p.lives - 1;
      p.stunUntil = this.s.tick + BALL.stunTicks;
      p.protectionUntil = this.s.tick + BALL.protectionTicks;
      for (const h of hits.filter((h) => h.target === p)) h.owner.hits++;
      this.balls.drop(p);
      this.notice(p, p.lives ? 'Hit! One life left.' : 'Knocked out');
      if (p.lives <= 0) this.eliminate(p, 'Two hits. You are out.');
    }
    if (this.s.suddenDeath) {
      const elapsed = this.s.tick - (this.ctx.startTick + 90 * 60);
      this.s.boundary = 10 - Math.max(0, Math.min(1, (elapsed - 180) / (27 * 60))) * 6;
      for (const p of this.players.filter((p) => p.alive)) {
        if (Math.abs(p.x) > this.s.boundary || Math.abs(p.z) > this.s.boundary * 0.8) {
          if (!this.outside.has(p.slotId)) {
            this.outside.set(p.slotId, this.s.tick);
            this.notice(p, 'Move inside the marked boundary!');
          } else if (this.s.tick - this.outside.get(p.slotId)! > 60)
            this.eliminate(p, 'Outside the shrinking boundary');
        } else this.outside.delete(p.slotId);
      }
    }
    const survivors = this.players.filter((p) => p.alive).length;
    if (this.s.tick >= this.s.deadline && survivors > 1 && !this.s.suddenDeath) {
      this.s.suddenDeath = true;
      this.s.deadline = this.ctx.startTick + 120 * 60;
      for (const p of this.players) this.notice(p, 'Sudden death! One hit eliminates.');
    }
    if (survivors <= 1 || this.s.tick >= this.s.deadline)
      this.done = makeOutcome(
        `${this.s.matchId}:${this.s.roundId}`,
        'eripandhu',
        this.players,
        (p) => [p.alive ? 1 : 0, p.alive ? p.lives : p.eliminatedTick, p.alive ? p.hits : 0],
        survivors <= 1
          ? 'Last survivors win; simultaneous final eliminations share the result.'
          : 'Time limit: lives, then valid hits dealt. Exact ties remain shared.',
      );
  }
  bot(p: Player): Command {
    return ballBot(this, p);
  }
  disconnect(p: Player) {
    this.balls.drop(p);
  }
}
export function ballBot(
  round: {
    s: Eripandhu['s'];
    players: Player[];
    balls: BallSystem;
    skill(p: Player): Skill;
    choice(): number;
  },
  p: Player,
  prefer?: (q: Player) => number,
): Command {
  if (!p.alive) return neutralInput();
  const i = round.players.indexOf(p),
    s = round.s,
    skill = round.skill(p);
  const enemies = round.players.filter((q) => q.alive && round.balls.canHit(p, q));
  const score = (q: Player) => Math.hypot(q.x - p.x, q.z - p.z) + (prefer?.(q) ?? 0);
  const enemy = enemies.sort((a, b) => score(a) - score(b))[0];
  const balls = [...s.items.values()]
    .filter((b) => b.kind === 'ball' && b.status === 'GROUND')
    .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z));
  let cmd = neutralInput();
  if (p.item && enemy) {
    const d = Math.hypot(enemy.x - p.x, enemy.z - p.z);
    // Keep a throwing distance of about 5-6.5 units: point-blank throws are undodgeable.
    cmd =
      d > 6.5
        ? steer(p, enemy)
        : d < 4.5
          ? steer(p, { x: p.x - (enemy.x - p.x), z: p.z - (enemy.z - p.z) })
          : steer(p, { x: Math.sin(s.tick / 100 + i) * 3, z: Math.cos(s.tick / 100 + i) * 3 });
    // Aim wobble and throw rhythm come from the CPU's skill, so hits are earned, not automatic.
    const wobble = Math.sin(s.tick * 0.37 + i * 1.7) * 0.6 + Math.sin(s.tick * 0.11 + i) * 0.4;
    const angle = Math.atan2(enemy.x - p.x, enemy.z - p.z) + wobble * (0.1 + skill.error);
    cmd.aimX = Math.sin(angle);
    cmd.aimZ = Math.cos(angle);
    // Wind-up between throws gives targets a readable moment to dodge.
    const period = 84 + skill.reaction * 4;
    cmd.action = s.tick % period === (i * 3) % period && round.balls.lineOfSight(p, enemy);
  } else if (balls[0]) {
    cmd = steer(p, balls[0], 0.65);
    cmd.action = s.tick % (12 + skill.reaction) === i % 12;
  } else cmd = steer(p, { x: Math.sin(s.tick / 130 + i) * 3, z: Math.cos(s.tick / 130 + i) * 3 });
  // Dodge: an incoming ball within reach triggers a jump, with a skill-based chance each tick.
  const incoming = [...s.items.values()].some((b) => {
    if (b.status !== 'LIVE' || b.owner === p.slotId) return false;
    const dx = p.x - b.x,
      dz = p.z - b.z,
      d = Math.hypot(dx, dz);
    return d < 3.2 && d > 0.01 && (b.vx * dx + b.vz * dz) / d > 6;
  });
  if (p.grounded && incoming) cmd.jump = round.choice() < 0.2 * Math.max(0.2, 1 - skill.slip * 4);
  if (
    s.suddenDeath &&
    (Math.abs(p.x) > s.boundary - 0.8 || Math.abs(p.z) > s.boundary * 0.8 - 0.8)
  ) {
    const center = steer(p, { x: 0, z: 0 });
    cmd.moveX = center.moveX;
    cmd.moveZ = center.moveZ;
  }
  return pace(cmd, skill);
}
