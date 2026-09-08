import { BaseRound, steer } from './base';
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
  round: { s: Eripandhu['s']; players: Player[]; balls: BallSystem },
  p: Player,
): Command {
  if (!p.alive) return neutralInput();
  const i = round.players.indexOf(p),
    s = round.s;
  const enemies = round.players.filter((q) => q.alive && round.balls.canHit(p, q));
  const enemy = enemies.sort(
    (a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z),
  )[0];
  const balls = [...s.items.values()]
    .filter((b) => b.kind === 'ball' && b.status === 'GROUND')
    .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z));
  let cmd = neutralInput();
  if (p.item && enemy) {
    const d = Math.hypot(enemy.x - p.x, enemy.z - p.z);
    cmd =
      d > 6
        ? steer(p, enemy)
        : steer(p, { x: Math.sin(s.tick / 100 + i) * 3, z: Math.cos(s.tick / 100 + i) * 3 });
    const angle = Math.atan2(enemy.x - p.x, enemy.z - p.z) + Math.sin(s.tick * 0.08 + i) * 0.1;
    cmd.aimX = Math.sin(angle);
    cmd.aimZ = Math.cos(angle);
    cmd.action = s.tick % 45 === (i * 3) % 45 && round.balls.lineOfSight(p, enemy);
  } else if (balls[0]) {
    cmd = steer(p, balls[0], 0.65);
    cmd.action = s.tick % 12 === i % 12;
  } else cmd = steer(p, { x: Math.sin(s.tick / 130 + i) * 3, z: Math.cos(s.tick / 130 + i) * 3 });
  if (p.grounded && s.tick % 12 === i % 12)
    cmd.jump = [...s.items.values()].some(
      (b) => b.status === 'LIVE' && b.owner !== p.slotId && Math.hypot(b.x - p.x, b.z - p.z) < 3,
    );
  if (
    s.suddenDeath &&
    (Math.abs(p.x) > s.boundary - 0.8 || Math.abs(p.z) > s.boundary * 0.8 - 0.8)
  ) {
    const center = steer(p, { x: 0, z: 0 });
    cmd.moveX = center.moveX;
    cmd.moveZ = center.moveZ;
  }
  return cmd;
}
