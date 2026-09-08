import type { PartyState, Player, RoundOutcome } from '../../../../packages/shared/src/state';
import type { Command, PhysicsScene } from '../../../../packages/simulation/src/physics';
import { neutralInput } from '../../../../packages/simulation/src/physics';
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
  constructor(public ctx: RoundContext) {}
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
