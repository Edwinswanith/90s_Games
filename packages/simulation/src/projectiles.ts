import type { Box } from '../../shared/src/maps';
import { Item, type PartyState, type Player } from '../../shared/src/state';
import { DT, MOVE } from '../../shared/src/config';
import type { Command } from './physics';
export const BALL = {
  radius: 0.18,
  speed: 11.5,
  pickup: 1.2,
  travel: 12,
  heldTicks: 240,
  recovery: 48,
  spentTicks: 24,
  protectionTicks: 75,
  stunTicks: 18,
};
export function segmentCircle(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  cx: number,
  cz: number,
  r: number,
) {
  const dx = bx - ax,
    dz = bz - az,
    ox = ax - cx,
    oz = az - cz,
    a = dx * dx + dz * dz,
    c = ox * ox + oz * oz - r * r;
  if (c <= 0) return 0;
  if (a < 1e-12) return Infinity;
  const b = 2 * (ox * dx + oz * dz),
    disc = b * b - 4 * a * c;
  if (disc < 0) return Infinity;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  return t >= 0 && t <= 1 ? t : Infinity;
}
export function segmentBox(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  box: Box,
  r = BALL.radius,
) {
  if (0.9 + r < box.y - box.h / 2 || 0.9 - r > box.y + box.h / 2) return Infinity;
  let lo = 0,
    hi = 1;
  for (const [a, b, min, max] of [
    [ax, bx, box.x - box.w / 2 - r, box.x + box.w / 2 + r],
    [az, bz, box.z - box.d / 2 - r, box.z + box.d / 2 + r],
  ]) {
    const d = b - a;
    if (Math.abs(d) < 1e-8) {
      if (a < min || a > max) return Infinity;
    } else {
      const t1 = (min - a) / d,
        t2 = (max - a) / d;
      lo = Math.max(lo, Math.min(t1, t2));
      hi = Math.min(hi, Math.max(t1, t2));
      if (lo > hi) return Infinity;
    }
  }
  return lo;
}
export class BallSystem {
  constructor(
    public s: PartyState,
    public players: Player[],
    public boxes: Box[],
    public canPickup: (p: Player) => boolean = () => true,
    public canHit: (owner: Player, target: Player) => boolean = (a, b) => a.slotId !== b.slotId,
  ) {}
  spawn(count: number) {
    for (let i = 0; i < count; i++) {
      const item = new Item({
        id: `ball-${i}`,
        x: count === 1 ? 0 : (i - (count - 1) / 2) * 3,
        z: 0,
      });
      this.s.items.set(item.id, item);
    }
  }
  drop(p: Player) {
    const item = this.s.items.get(p.item);
    if (item?.kind === 'ball') {
      Object.assign(item, {
        owner: '',
        status: 'SPENT',
        x: p.x,
        z: p.z,
        y: 0.18,
        until: this.s.tick + BALL.spentTicks,
      });
    }
    p.item = '';
  }
  clear() {
    for (const [id, item] of this.s.items) if (item.kind === 'ball') this.s.items.delete(id);
    for (const p of this.players) if (p.item.startsWith('ball')) p.item = '';
  }
  lineOfSight(a: Player, b: Player) {
    return this.boxes.every((box) => !Number.isFinite(segmentBox(a.x, a.z, b.x, b.z, box, 0)));
  }
  actions(commands: Map<string, Command>) {
    const claims = new Map<string, { p: Player; distance: number }[]>();
    for (const p of this.players) {
      const cmd = commands.get(p.slotId);
      const edge = !!cmd?.action && !p.actionHeld;
      p.actionHeld = !!cmd?.action;
      if (
        !edge ||
        !p.alive ||
        p.qualified ||
        this.s.tick < p.stunUntil ||
        this.s.tick < p.throwUntil ||
        !this.canPickup(p)
      )
        continue;
      if (p.item) {
        const ball = this.s.items.get(p.item);
        if (ball?.kind === 'ball') this.throw(p, ball, cmd!);
        continue;
      }
      const item = [...this.s.items.values()]
        .filter(
          (b) =>
            b.kind === 'ball' &&
            b.status === 'GROUND' &&
            Math.hypot(p.x - b.x, p.z - b.z) <= BALL.pickup,
        )
        .sort((a, b) => Math.hypot(p.x - a.x, p.z - a.z) - Math.hypot(p.x - b.x, p.z - b.z))[0];
      if (item) {
        const list = claims.get(item.id) ?? [];
        list.push({ p, distance: Math.hypot(p.x - item.x, p.z - item.z) });
        claims.set(item.id, list);
      }
    }
    for (const [id, list] of claims) {
      list.sort((a, b) => a.distance - b.distance);
      if (list.length > 1 && Math.abs(list[0].distance - list[1].distance) < 1e-6) continue;
      const item = this.s.items.get(id)!;
      item.status = 'CARRIED';
      item.owner = list[0].p.slotId;
      item.until = this.s.tick + BALL.heldTicks;
      list[0].p.item = id;
    }
  }
  throw(p: Player, b: Item, cmd: Command) {
    let x = cmd.aimX,
      z = cmd.aimZ;
    const length = Math.hypot(x, z);
    if (length < 0.01) {
      x = Math.sin(p.facing);
      z = Math.cos(p.facing);
    } else {
      x /= length;
      z /= length;
    }
    const candidates = this.players
      .filter(
        (q) => q.alive && q.slotId !== p.slotId && this.canHit(p, q) && this.lineOfSight(p, q),
      )
      .map((q) => {
        const dx = q.x - p.x,
          dz = q.z - p.z,
          d = Math.hypot(dx, dz);
        return { q, d, dot: (dx * x + dz * z) / d };
      })
      .filter((v) => v.d <= 12 && v.dot >= Math.cos((12 * Math.PI) / 180))
      .sort((a, b) => b.dot - a.dot);
    if (candidates[0]) {
      const c = candidates[0];
      x = (c.q.x - p.x) / c.d;
      z = (c.q.z - p.z) / c.d;
    }
    Object.assign(b, {
      status: 'LIVE',
      owner: p.slotId,
      x: p.x,
      z: p.z,
      y: 0.9,
      vx: x * BALL.speed,
      vz: z * BALL.speed,
      travel: 0,
    });
    p.item = '';
    p.throwUntil = this.s.tick + BALL.recovery;
    p.facing = Math.atan2(x, z);
  }
  step() {
    const hits: { owner: Player; target: Player }[] = [];
    for (const b of this.s.items.values()) {
      if (b.kind !== 'ball') continue;
      if (b.status === 'CARRIED') {
        const p = this.players.find((p) => p.slotId === b.owner);
        if (!p || !p.alive || this.s.tick >= b.until) {
          if (p) this.drop(p);
          else {
            b.status = 'GROUND';
            b.owner = '';
          }
          continue;
        }
        b.x = p.x;
        b.y = p.y + 0.85;
        b.z = p.z;
        continue;
      }
      if (b.status === 'SPENT') {
        if (this.s.tick >= b.until) {
          b.status = 'GROUND';
          b.y = 0.18;
          b.owner = '';
        }
        continue;
      }
      if (b.status !== 'LIVE') continue;
      const x = b.x + b.vx * DT,
        z = b.z + b.vz * DT;
      let earliest = Infinity,
        target: Player | undefined;
      const owner = this.players.find((p) => p.slotId === b.owner);
      for (const box of this.boxes) earliest = Math.min(earliest, segmentBox(b.x, b.z, x, z, box));
      for (const p of this.players) {
        if (!p.alive || p.slotId === b.owner || !owner || !this.canHit(owner, p)) continue;
        const cy = Math.max(p.y + MOVE.radius, Math.min(p.y + MOVE.height - MOVE.radius, b.y)),
          dy = b.y - cy,
          r2 = (MOVE.radius + BALL.radius) ** 2 - dy * dy;
        if (r2 < 0) continue;
        const t = segmentCircle(b.x, b.z, x, z, p.x, p.z, Math.sqrt(r2));
        if (t < earliest) {
          earliest = t;
          target = p;
        }
      }
      b.travel += BALL.speed * DT;
      if (Number.isFinite(earliest) || b.travel >= BALL.travel) {
        b.x += b.vx * DT * (Number.isFinite(earliest) ? earliest : 1);
        b.z += b.vz * DT * (Number.isFinite(earliest) ? earliest : 1);
        b.status = 'SPENT';
        b.y = 0.18;
        b.until = this.s.tick + BALL.spentTicks;
        if (target && owner && this.s.tick >= target.protectionUntil) hits.push({ owner, target });
      } else {
        b.x = x;
        b.z = z;
      }
    }
    return hits;
  }
}
