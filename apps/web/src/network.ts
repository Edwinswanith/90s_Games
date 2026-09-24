import { Client, Predict, type Room } from '@colyseus/sdk';
import { BUILD, CONTENT, type Phase } from '../../../packages/shared/src/config';
import { PartyState, InputFrame } from '../../../packages/shared/src/state';
import {
  PhysicsScene,
  initPhysics,
  neutralInput,
  type Command,
} from '../../../packages/simulation/src/physics';
import { mapFor } from '../../../packages/shared/src/maps';
export type GameRoom = Room<any, PartyState>;
// The built server serves this page and the game on one origin (locally :2567, or a hosted
// https URL on the default port), so production talks to its own origin.
export const serverUrl =
  import.meta.env.VITE_GAME_SERVER_URL ||
  (import.meta.env.DEV ? `${location.protocol}//${location.hostname}:2567` : location.origin);
export const session: {
  room: GameRoom | null;
  client: Client;
  error: string;
  connecting: boolean;
  dropped: boolean;
  revision: number;
  connectionEpoch: number;
} = {
  room: null,
  client: new Client(serverUrl),
  error: '',
  connecting: false,
  dropped: false,
  revision: 0,
  connectionEpoch: 0,
};
const listeners = new Set<() => void>();
export function notify() {
  session.revision++;
  for (const fn of listeners) fn();
}
export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function snapshot() {
  return session.revision;
}
let signature = '';
function attach(room: GameRoom) {
  session.room = room;
  session.error = '';
  session.dropped = false;
  sessionStorage.setItem('theru.reconnect', room.reconnectionToken);
  room.onMessage('error', (e: { message: string }) => {
    session.error = e.message;
    notify();
  });
  room.onStateChange((state) => {
    const next = [
      state.phase,
      state.revision,
      state.host,
      state.selectedGame,
      state.roundId,
      Math.ceil((state.deadline - state.tick) / 60),
      state.wavePhase,
      state.safe,
      state.wave,
      state.stacked,
      state.heat,
      state.heatPhase,
      state.suddenDeath,
      state.results,
      state.votes,
      state.error,
      state.difficulty,
      ...[...state.players.values()].map(
        (p) =>
          `${p.slotId}:${p.name}:${p.cpu}:${p.connected}:${p.ready}:${p.score}:${p.alive}:${p.lives}:${p.item}:${p.checkpoint}:${p.gate}:${p.section}:${p.notice}:${p.cosmetic}`,
      ),
    ].join('|');
    if (next !== signature) {
      signature = next;
      notify();
    }
  });
  room.onDrop(() => {
    session.dropped = true;
    notify();
  });
  room.onReconnect(() => {
    session.dropped = false;
    session.connectionEpoch++;
    sessionStorage.setItem('theru.reconnect', room.reconnectionToken);
    notify();
  });
  room.onLeave((_code, reason) => {
    if (session.room === room) {
      session.room = null;
      session.dropped = false;
      sessionStorage.removeItem('theru.reconnect');
      session.error = reason || 'Connection closed. The local server may have stopped.';
      notify();
    }
  });
  notify();
  return room;
}
export async function connect(name: string, cosmetic: number, code?: string) {
  session.connecting = true;
  session.error = '';
  notify();
  try {
    const identity = { name, cosmetic, build: BUILD };
    let room: GameRoom;
    if (code) {
      const response = await fetch(
        `${serverUrl}/rooms/${encodeURIComponent(code.trim().toUpperCase())}`,
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (!data.joinable) throw new Error(data.reason || 'This room is not joinable.');
      room = await session.client.joinById<PartyState>(data.roomId, identity, PartyState);
    } else room = await session.client.create<PartyState>('party', identity, PartyState);
    return attach(room);
  } catch (e) {
    session.error = e instanceof Error ? e.message : 'Could not reach the local server.';
    return null;
  } finally {
    session.connecting = false;
    notify();
  }
}
export async function restore() {
  const token = sessionStorage.getItem('theru.reconnect');
  if (!token) return;
  session.connecting = true;
  notify();
  try {
    attach(await session.client.reconnect<PartyState>(token, PartyState));
  } catch {
    sessionStorage.removeItem('theru.reconnect');
    session.error = 'The previous seat is no longer reserved. Join again from the lobby.';
  } finally {
    session.connecting = false;
    notify();
  }
}
export async function leave() {
  const room = session.room;
  session.room = null;
  sessionStorage.removeItem('theru.reconnect');
  session.error = '';
  notify();
  await room?.leave();
}
export const controls = {
  ...neutralInput(),
  blocked: false,
  aiming: false,
  actionPulse: false,
  jumpPulse: false,
};
export function clearControls() {
  Object.assign(controls, neutralInput(), { aiming: false, actionPulse: false, jumpPulse: false });
}
export class PredictionRuntime {
  predict: any;
  input: any;
  sim: any;
  physics: PhysicsScene;
  round: number;
  disposed = false;
  loaded = false;
  remotes = new Map<string, object>();
  constructor(public room: GameRoom) {
    const state = room.state,
      p = state.players.get(room.sessionId)!;
    this.round = state.roundId;
    this.physics = new PhysicsScene(
      mapFor(state.phase === 'LOBBY' ? 'courtyard' : state.selectedGame),
    );
    this.input = room.input({ type: InputFrame });
    this.predict = Predict.get(room, { mode: 'lerp', delay: 100 });
    this.syncRemotes();
    const world = { player: p, physics: this.physics, tick: state.tick };
    this.sim = this.predict.sim({
      input: this.input,
      world,
      adopt: (w: any) => {
        w.tick = state.tick;
      },
      step: (_ctx: any, w: any, cmd: Command) => {
        w.tick++;
        w.physics.move(
          p.slotId,
          w.player,
          cmd,
          w.tick,
          state.phase === 'LOBBY' ||
            (state.phase === 'PLAYING' &&
              (state.selectedGame !== 'seven-stones' || state.heatPhase === 'active')),
        );
        w.physics.step();
      },
      smoothMs: 65,
      snap: 3,
    });
  }
  syncRemotes() {
    for (const p of this.room.state.players.values())
      if (p.slotId !== this.room.sessionId && !this.remotes.has(p.slotId)) {
        this.predict.attach(p, { fields: ['x', 'y', 'z', 'facing'], mode: 'lerp' });
        this.remotes.set(p.slotId, p);
      }
    for (const [id, p] of this.remotes)
      if (!this.room.state.players.has(id)) {
        this.predict.detach(p);
        this.remotes.delete(id);
      }
  }
  update(now: number) {
    this.syncRemotes();
    if (this.disposed || session.dropped) return;
    if (this.room.state.phase === 'LOADING' && !this.loaded) {
      this.room.send('loaded', { round: this.room.state.roundId, content: CONTENT });
      this.loaded = true;
    }
    const n = this.predict.tick(now);
    for (let i = 0; i < n; i++) {
      const cmd = controls.blocked ? neutralInput() : controls;
      Object.assign(this.input.data, {
        moveX: cmd.moveX,
        moveZ: cmd.moveZ,
        jump: cmd.jump || (!controls.blocked && controls.jumpPulse),
        action: cmd.action || (!controls.blocked && controls.actionPulse),
        aimX: cmd.aimX,
        aimZ: cmd.aimZ,
        round: this.room.state.roundId,
      });
      controls.actionPulse = false;
      controls.jumpPulse = false;
      this.input.send();
    }
  }
  position(p: any) {
    return {
      x: this.predict.value(p, 'x'),
      y: this.predict.value(p, 'y'),
      z: this.predict.value(p, 'z'),
      facing: this.predict.value(p, 'facing'),
    };
  }
  dispose() {
    this.disposed = true;
    this.sim.dispose();
    this.predict.dispose();
    this.physics.dispose();
  }
}
export const physicsReady = initPhysics();
export function phase(): Phase {
  return session.room?.state.phase ?? 'LOBBY';
}
