import { Room, ServerError, type Client } from '@colyseus/core';
import { randomBytes } from 'node:crypto';
import { PartyState, Player, InputFrame } from '../../../../packages/shared/src/state';
import {
  BUILD,
  FESTIVAL_ORDER,
  TIMING,
  TICK_RATE,
  seeded,
  shuffle,
} from '../../../../packages/shared/src/config';
import { identitySchema, settingsSchema } from '../../../../packages/shared/src/validation';
import { courtyard } from '../../../../packages/shared/src/maps';
import {
  initPhysics,
  neutralInput,
  sanitizeInput,
  type Command,
} from '../../../../packages/simulation/src/physics';
import { MatchEngine } from '../match/MatchEngine';
export const roomDirectory = new Map<string, PartyRoom>();
export class PartyRoom extends Room<{ state: PartyState; input: InputFrame }> {
  state = new PartyState();
  inputs = this.defineInput(InputFrame, {
    bufferMaxSize: 32,
    sanitize: (frame) => Object.assign(frame, sanitizeInput(frame)),
  });
  engine!: MatchEngine;
  get physics() {
    return this.engine.physics;
  }
  arrivals = new Map<string, number>();
  lastInput = new Map<string, { at: number; command: Command }>();
  drops = new Map<string, number>();
  noHumansSince = 0;
  stepSamples: number[] = [];
  async onCreate() {
    this.maxClients = 8;
    this.autoDispose = false;
    this.maxMessagesPerSecond = 150;
    await initPhysics();
    this.engine = new MatchEngine(this.state);
    this.assignTeams();
    do {
      this.state.roomCode = randomBytes(6).toString('hex').slice(0, 6).toUpperCase();
    } while (roomDirectory.has(this.state.roomCode));
    roomDirectory.set(this.state.roomCode, this);
    this.state.order = JSON.stringify(FESTIVAL_ORDER);
    this.setPatchRate(50);
    this.onMessage('ready', (client, value) => {
      const p = this.state.players.get(client.sessionId);
      if (p && this.state.phase === 'LOBBY' && typeof value === 'boolean') p.ready = value;
    });
    this.onMessage('settings', (client, value) => {
      if (!this.requireHost(client) || this.state.phase !== 'LOBBY') return;
      const patch = settingsSchema.partial().strict().safeParse(value);
      if (!patch.success) return this.error(client, 'Invalid room configuration.');
      const parsed = settingsSchema.safeParse({
        format: this.state.format,
        policy: this.state.policy,
        singleGame: this.state.singleGame,
        firstRace: this.state.firstRace,
        slots: this.state.slots,
        botFill: this.state.botFill,
        difficulty: this.state.difficulty,
        order: JSON.parse(this.state.order),
        ...patch.data,
      });
      if (!parsed.success) return this.error(client, 'Invalid room configuration.');
      const nextSlots = parsed.data.format === 'single' ? parsed.data.slots : 8;
      if (nextSlots < this.state.players.size)
        return this.error(client, 'Occupied seats cannot be removed. Ask a player to leave first.');
      Object.assign(this.state, {
        ...parsed.data,
        order: JSON.stringify(parsed.data.order),
        slots: parsed.data.format === 'single' ? parsed.data.slots : 8,
      });
      this.maxClients = this.state.slots;
      if (patch.data.slots !== undefined || patch.data.format !== undefined) this.assignTeams();
      this.invalidateReady();
    });
    this.onMessage('vote', (client, value) => {
      if (value && typeof value.game === 'string' && typeof value.match === 'string')
        this.engine.vote(client.sessionId, value.game, value.match);
    });
    this.onMessage('team-swap', (client, value) => {
      if (!this.requireHost(client) || this.state.phase !== 'LOBBY') return;
      const teams: number[] = JSON.parse(this.state.teamOrder);
      if (
        !value ||
        !Number.isInteger(value.a) ||
        !Number.isInteger(value.b) ||
        value.a < 0 ||
        value.b < 0 ||
        value.a >= this.state.slots ||
        value.b >= this.state.slots
      )
        return;
      [teams[value.a], teams[value.b]] = [teams[value.b], teams[value.a]];
      this.state.teamOrder = JSON.stringify(teams);
      this.applyTeams();
      this.invalidateReady();
    });
    this.onMessage('kick', (client, value) => {
      if (
        !this.requireHost(client) ||
        this.state.phase !== 'LOBBY' ||
        typeof value !== 'string' ||
        value === this.state.host
      )
        return;
      const guest = this.clients.find((c) => c.sessionId === value);
      if (guest) guest.leave(4000, 'Removed from the lobby by the host.');
    });
    this.onMessage('start', (client) => {
      if (this.requireHost(client)) {
        const error = this.engine.begin();
        if (error) this.error(client, error);
      }
    });
    this.onMessage('loaded', (client, value) => {
      if (value && Number.isInteger(value.round) && typeof value.content === 'string')
        this.engine.contentReady(client.sessionId, value.round, value.content);
    });
    this.onMessage('lobby', (client) => {
      if (this.requireHost(client) && this.state.phase === 'MATCH_RESULTS')
        this.engine.returnToLobby();
    });
    this.setFixedTimestep(() => this.step(), TICK_RATE);
  }
  onAuth(_client: Client, options: unknown) {
    const data = identitySchema.safeParse(options);
    if (!data.success)
      throw new ServerError(400, 'Use a name of 1–16 characters and the matching build.');
    if (this.state.players.size >= this.state.slots)
      throw new ServerError(409, 'This room is full.');
    if (this.state.phase !== 'LOBBY') throw new ServerError(409, 'This match has already started.');
    return data.data;
  }
  onJoin(
    client: Client,
    _options: unknown,
    auth: { name: string; cosmetic: number; build: typeof BUILD },
  ) {
    const p = new Player();
    p.slotId = client.sessionId;
    p.name = auth.name;
    p.cosmetic = auth.cosmetic;
    const spawn = courtyard.spawns[this.state.players.size % 8];
    p.x = spawn.x;
    p.z = spawn.z;
    this.state.players.set(p.slotId, p);
    this.applyTeams();
    this.arrivals.set(p.slotId, performance.now());
    this.physics.add(p.slotId, p);
    if (!this.state.host) this.state.host = p.slotId;
    this.invalidateReady();
    this.noHumansSince = 0;
  }
  onDrop(client: Client) {
    const p = this.state.players.get(client.sessionId);
    if (!p) return;
    p.connected = false;
    p.ready = false;
    this.engine.publishVotes();
    this.engine.controller?.disconnect(p);
    p.item = '';
    p.placingUntil = 0;
    this.lastInput.delete(p.slotId);
    this.drops.set(p.slotId, performance.now());
    this.allowReconnection(client, TIMING.reconnectSeconds).catch(() => {
      /* onLeave handles expired reservations */
    });
  }
  onReconnect(client: Client) {
    const p = this.state.players.get(client.sessionId);
    if (p) {
      p.connected = true;
      p.cpu = false;
      this.drops.delete(p.slotId);
      this.lastInput.delete(p.slotId);
    }
  }
  onLeave(client: Client) {
    const p = this.state.players.get(client.sessionId);
    if (!p) return;
    this.engine.controller?.disconnect(p);
    this.drops.delete(p.slotId);
    this.lastInput.delete(p.slotId);
    this.arrivals.delete(p.slotId);
    if (this.state.phase === 'LOBBY') {
      this.physics.remove(p.slotId);
      this.state.players.delete(p.slotId);
      this.invalidateReady();
    } else {
      p.cpu = true;
      p.connected = false;
      p.item = '';
      p.placingUntil = 0;
    }
    if (this.state.host === p.slotId) this.transferHost();
  }
  applyTeams() {
    const teams: number[] = JSON.parse(this.state.teamOrder || '[]');
    let i = 0;
    for (const p of this.state.players.values()) p.team = teams[i++] ?? 0;
  }
  assignTeams() {
    this.state.teamOrder = JSON.stringify(
      shuffle(
        Array.from({ length: this.state.slots }, (_, i) =>
          i < Math.ceil(this.state.slots / 2) ? 0 : 1,
        ),
        seeded(Math.floor(Math.random() * 0x7fffffff)),
      ),
    );
    this.applyTeams();
  }
  invalidateReady() {
    this.applyTeams();
    this.state.revision++;
    for (const p of this.state.players.values()) if (!p.cpu) p.ready = false;
  }
  error(client: Client, message: string) {
    client.send('error', { message });
  }
  requireHost(client: Client) {
    if (client.sessionId !== this.state.host) {
      this.error(client, 'Only the host can change this.');
      return false;
    }
    return true;
  }
  transferHost() {
    this.state.host =
      [...this.state.players.values()]
        .filter((p) => p.connected && !p.cpu)
        .sort((a, b) => (this.arrivals.get(a.slotId) ?? 0) - (this.arrivals.get(b.slotId) ?? 0))[0]
        ?.slotId ?? '';
  }
  commandFor(p: Player): Command {
    if (!p.connected) return neutralInput();
    const frame = this.inputs.get(p.slotId).next();
    if (frame) {
      const command = frame.round === this.state.roundId ? sanitizeInput(frame) : neutralInput();
      this.lastInput.set(p.slotId, { command, at: performance.now() });
      return command;
    }
    const previous = this.lastInput.get(p.slotId);
    return previous &&
      previous.command.round === this.state.roundId &&
      performance.now() - previous.at < TIMING.staleMs
      ? previous.command
      : neutralInput();
  }
  step() {
    const began = performance.now();
    const commands = new Map<string, Command>();
    for (const p of this.state.players.values()) commands.set(p.slotId, this.commandFor(p));
    this.engine.update(commands);
    const hostDrop = this.drops.get(this.state.host);
    if (hostDrop && performance.now() - hostDrop > TIMING.hostTransferMs) this.transferHost();
    const humans = [...this.state.players.values()].some(
      (p) => !p.cpu && (p.connected || this.drops.has(p.slotId)),
    );
    if (!humans && this.state.phase !== 'LOBBY')
      this.engine.returnToLobby('No contest: all human players left.');
    if (humans) this.noHumansSince = 0;
    else if (!this.noHumansSince) this.noHumansSince = performance.now();
    else if (performance.now() - this.noHumansSince > TIMING.abandonMs) void this.disconnect();
    this.stepSamples.push(performance.now() - began);
    if (this.stepSamples.length > 3600) this.stepSamples.shift();
  }
  onDispose() {
    roomDirectory.delete(this.state.roomCode);
    this.engine?.dispose();
    this.lastInput.clear();
    this.arrivals.clear();
    this.drops.clear();
  }
}
