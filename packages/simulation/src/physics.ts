import RAPIER from '@dimforge/rapier3d-compat';
import { MOVE, DT } from '../../shared/src/config';
import type { MapDefinition } from '../../shared/src/maps';
import type { Player, InputFrame } from '../../shared/src/state';
let initialization: Promise<void> | undefined;
export function initPhysics() {
  return (initialization ??= RAPIER.init());
}
export type Motion = Pick<
  Player,
  | 'x'
  | 'y'
  | 'z'
  | 'vx'
  | 'vy'
  | 'vz'
  | 'facing'
  | 'grounded'
  | 'jumpHeld'
  | 'jumpBuffer'
  | 'lastGround'
  | 'mode'
  | 'alive'
  | 'qualified'
  | 'stunUntil'
  | 'item'
  | 'boostUntil'
  | 'vaultUntil'
  | 'vaultStart'
  | 'vaultX'
  | 'vaultZ'
  | 'vaultEndX'
  | 'vaultEndZ'
>;
export const neutralInput = () => ({
  moveX: 0,
  moveZ: 0,
  jump: false,
  action: false,
  aimX: 0,
  aimZ: -1,
  round: 0,
});
export type Command = Pick<
  InputFrame,
  'moveX' | 'moveZ' | 'jump' | 'action' | 'aimX' | 'aimZ' | 'round'
>;
export function sanitizeInput(value: Command) {
  // Schema fields are accessors, so spreading a decoded frame loses its values.
  const out = {
    moveX: value.moveX,
    moveZ: value.moveZ,
    jump: value.jump,
    action: value.action,
    aimX: value.aimX,
    aimZ: value.aimZ,
    round: value.round,
  };
  for (const k of ['moveX', 'moveZ', 'aimX', 'aimZ'] as const)
    out[k] = Number.isFinite(out[k]) ? Math.max(-1, Math.min(1, out[k])) : 0;
  const length = Math.hypot(out.moveX, out.moveZ);
  if (length > 1) {
    out.moveX /= length;
    out.moveZ /= length;
  }
  out.jump = out.jump === true;
  out.action = out.action === true;
  return out;
}
export class PhysicsScene {
  world = new RAPIER.World({ x: 0, y: MOVE.gravity, z: 0 });
  controller = this.world.createCharacterController(0.01);
  bodies = new Map<string, { body: RAPIER.RigidBody; collider: RAPIER.Collider }>();
  playerHandles = new Set<number>();
  constructor(public map: MapDefinition) {
    this.world.timestep = DT;
    this.controller.enableAutostep(MOVE.stepHeight, 0.2, false);
    this.controller.enableSnapToGround(0.15);
    for (const b of map.boxes)
      this.world.createCollider(
        RAPIER.ColliderDesc.cuboid(b.w / 2, b.h / 2, b.d / 2).setTranslation(b.x, b.y, b.z),
      );
  }
  add(id: string, p: Motion) {
    if (this.bodies.has(id)) return;
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(p.x, p.y + MOVE.height / 2, p.z),
    );
    const collider = this.world.createCollider(
      RAPIER.ColliderDesc.capsule((MOVE.height - 2 * MOVE.radius) / 2, MOVE.radius),
      body,
    );
    this.playerHandles.add(collider.handle);
    this.bodies.set(id, { body, collider });
  }
  remove(id: string) {
    const b = this.bodies.get(id);
    if (b) {
      this.playerHandles.delete(b.collider.handle);
      this.world.removeRigidBody(b.body);
      this.bodies.delete(id);
    }
  }
  move(id: string, p: Motion, cmd: Command, tick: number, enabled = true) {
    this.add(id, p);
    const { body, collider } = this.bodies.get(id)!;
    body.setTranslation({ x: p.x, y: p.y + MOVE.height / 2, z: p.z }, false);
    const input =
      enabled && p.alive && !p.qualified && tick >= p.stunUntil
        ? sanitizeInput(cmd)
        : neutralInput();
    if (!enabled || !p.alive || p.qualified) p.vaultUntil = 0;
    const jumpEdge = input.jump && !p.jumpHeld;
    if (jumpEdge && p.grounded && p.vz < -2.5 && input.moveZ < -0.5) {
      const obstacle = this.map.boxes.find(
        (b) =>
          b.kind === 'npc' &&
          Math.abs(p.x - b.x) < b.w / 2 + 0.05 &&
          p.z - b.z >= 1.45 &&
          p.z - b.z <= 2.05,
      );
      if (obstacle) {
        p.vaultStart = tick;
        p.vaultUntil = tick + 30;
        p.vaultX = p.x;
        p.vaultZ = p.z;
        p.vaultEndX = p.x;
        p.vaultEndZ = obstacle.z - 1.45;
        p.jumpBuffer = 0;
      }
    }
    if (p.vaultUntil > tick) {
      p.jumpHeld = input.jump;
      const u = (tick - p.vaultStart + 1) / 30;
      const highest = this.map.boxes
        .filter(
          (b) =>
            b.kind === 'npc' && Math.abs(b.x - p.x) < 1.1 && b.z < p.vaultZ && b.z > p.vaultEndZ,
        )
        .reduce((h, b) => Math.max(h, b.h), 0.55);
      const desired = {
        x: p.vaultX + (p.vaultEndX - p.vaultX) * u,
        y: 0.02 + 4 * u * (1 - u) * (highest + 0.6),
        z: p.vaultZ + (p.vaultEndZ - p.vaultZ) * u,
      };
      this.controller.computeColliderMovement(
        collider,
        { x: desired.x - p.x, y: desired.y - p.y, z: desired.z - p.z },
        undefined,
        undefined,
        (c) => !this.playerHandles.has(c.handle),
      );
      const m = this.controller.computedMovement();
      p.x += m.x;
      p.y += m.y;
      p.z += m.z;
      p.grounded = false;
      p.vy = 0;
      p.mode = 'vault';
      if (u >= 1 && Math.hypot(p.x - p.vaultEndX, p.z - p.vaultEndZ) < 0.3)
        p.boostUntil = tick + 60;
      body.setNextKinematicTranslation({ x: p.x, y: p.y + MOVE.height / 2, z: p.z });
      return;
    }
    if (p.grounded) p.lastGround = tick;
    if (input.jump && !p.jumpHeld) p.jumpBuffer = tick + MOVE.bufferTicks;
    p.jumpHeld = input.jump;
    if (p.jumpBuffer > tick && tick - p.lastGround <= MOVE.coyoteTicks) {
      p.vy = MOVE.jump;
      p.grounded = false;
      p.lastGround = -999;
      p.jumpBuffer = 0;
    }
    const speed =
      MOVE.speed * (p.item.startsWith('stone') ? 4.6 / 5.5 : 1) * (p.boostUntil > tick ? 1.1 : 1);
    const accel = MOVE.acceleration * (p.grounded ? 1 : MOVE.airSteering) * DT;
    const approach = (a: number, b: number) => a + Math.max(-accel, Math.min(accel, b - a));
    p.vx = approach(p.vx, input.moveX * speed);
    p.vz = approach(p.vz, input.moveZ * speed);
    p.vy += MOVE.gravity * DT;
    if (Math.hypot(input.moveX, input.moveZ) > 0.05)
      p.facing = Math.atan2(input.moveX, input.moveZ);
    this.controller.computeColliderMovement(
      collider,
      { x: p.vx * DT, y: p.vy * DT, z: p.vz * DT },
      undefined,
      undefined,
      (c) => !this.playerHandles.has(c.handle),
    );
    const movement = this.controller.computedMovement();
    p.x += movement.x;
    p.y += movement.y;
    p.z += movement.z;
    p.grounded = this.controller.computedGrounded();
    if (p.grounded && p.vy < 0) p.vy = 0;
    p.mode =
      tick < p.stunUntil
        ? 'stumble'
        : !p.alive
          ? 'eliminated'
          : !p.grounded
            ? p.vy > 0
              ? 'jump'
              : 'fall'
            : Math.hypot(p.vx, p.vz) > 0.2
              ? 'run'
              : 'idle';
    body.setNextKinematicTranslation({ x: p.x, y: p.y + MOVE.height / 2, z: p.z });
  }
  step() {
    this.world.step();
  }
  dispose() {
    this.bodies.clear();
    this.playerHandles.clear();
    this.world.free();
  }
}
