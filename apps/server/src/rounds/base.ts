import type { PartyState, Player, RoundOutcome } from '../../../../packages/shared/src/state';
import type { Command, PhysicsScene } from '../../../../packages/simulation/src/physics';
import { neutralInput } from '../../../../packages/simulation/src/physics';
import { seeded, type Difficulty } from '../../../../packages/shared/src/config';
export interface Skill {
  /** Fraction of full movement input the CPU uses (0.8-1). */
  speed: number;
  /** Extra reaction delay in ticks. */
  reaction: number;
  /** Aim error in radians. */
  error: number;
  /** Chance of a mistake at each decision point (hesitation, bad hop, mistimed jump). */
  slip: number;
}
const PRECISE: Skill = { speed: 1, reaction: 0, error: 0, slip: 0 };
const BASE: Record<Difficulty, Skill> = {
  relaxed: { speed: 0.82, reaction: 16, error: 0.3, slip: 0.14 },
  street: { speed: 0.91, reaction: 7, error: 0.16, slip: 0.06 },
  legend: { speed: 1, reaction: 1, error: 0.05, slip: 0.018 },
};
function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}
// Per-round CPU personality: the room's difficulty plus a seeded individual spread, so the same
// CPU does not win the same way every round. Non-CPU callers (reference solvers in tests) get
// precise play.
export function skillFor(p: Pick<Player, 'cpu' | 'slotId'>, seed: number, difficulty: string) {
  if (!p.cpu) return PRECISE;
  const base = BASE[difficulty as Difficulty] ?? BASE.street,
    r = seeded(hash(`${seed}:${p.slotId}`));
  return {
    speed: Math.min(1, base.speed * (0.94 + r() * 0.1)),
    reaction: Math.round(base.reaction * (0.5 + r())),
    error: base.error * (0.6 + r() * 0.8),
    slip: base.slip * (0.5 + r()),
  };
}
export function pace(cmd: Command, skill: Skill): Command {
  return { ...cmd, moveX: cmd.moveX * skill.speed, moveZ: cmd.moveZ * skill.speed };
}
export interface RoundContext {
  state: PartyState;
  players: Player[];
  physics: PhysicsScene;
  startTick: number;
  target: number;
  seed: number;
}
export interface RoundController {
  start(): void;
  movementEnabled(): boolean;
  beforeMove(commands: Map<string, Command>): void;
  afterMove(): void;
  outcome(): RoundOutcome | null;
  bot(p: Player): Command;
  disconnect(p: Player): void;
  dispose(): void;
}
export class BaseRound implements RoundController {
  done: RoundOutcome | null = null;
  private skills = new Map<string, Skill>();
  // Independent stream for CPU decisions so it never shifts seeded hazards or layouts.
  choice: () => number;
  constructor(public ctx: RoundContext) {
    this.choice = seeded(ctx.seed ^ 0x2c1b3c6d);
  }
  skill(p: Player) {
    let s = this.skills.get(p.slotId);
    if (!s) this.skills.set(p.slotId, (s = skillFor(p, this.ctx.seed, this.s.difficulty)));
    return s;
  }
  get s() {
    return this.ctx.state;
  }
  get players() {
    return this.ctx.players;
  }
  start() {}
  movementEnabled() {
    return true;
  }
  beforeMove(_commands: Map<string, Command>) {}
  afterMove() {}
  outcome() {
    return this.done;
  }
  bot(_p: Player): Command {
    return neutralInput();
  }
  disconnect(_p: Player) {}
  dispose() {}
  notice(p: Player, text: string) {
    p.notice = text;
    p.noticeUntil = this.s.tick + 150;
  }
  eliminate(p: Player, reason: string) {
    if (!p.alive) return;
    p.alive = false;
    p.eliminatedTick = this.s.tick;
    p.vx = 0;
    p.vz = 0;
    this.notice(p, reason);
  }
}
export function steer(
  p: Pick<Player, 'x' | 'z'>,
  target: { x: number; z: number },
  stop = 0.2,
): Command {
  const dx = target.x - p.x,
    dz = target.z - p.z,
    d = Math.hypot(dx, dz);
  return { ...neutralInput(), moveX: d > stop ? dx / d : 0, moveZ: d > stop ? dz / d : 0 };
}
