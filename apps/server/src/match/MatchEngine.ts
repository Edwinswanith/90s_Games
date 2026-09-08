import { randomUUID, randomInt } from 'node:crypto';
import { PartyState, Player, type RoundOutcome } from '../../../../packages/shared/src/state';
import {
  CONTENT,
  TIMING,
  GAME_IDS,
  FESTIVAL_ORDER,
  seeded,
  shuffle,
} from '../../../../packages/shared/src/config';
import { rosterError } from '../../../../packages/shared/src/validation';
import { mapFor } from '../../../../packages/shared/src/maps';
import { makeOutcome } from '../../../../packages/shared/src/scoring';
import {
  PhysicsScene,
  neutralInput,
  type Command,
} from '../../../../packages/simulation/src/physics';
import type { RoundController } from '../rounds/base';
import { SevenStones } from '../rounds/seven-stones';
import { Eripandhu } from '../rounds/eripandhu';
import { PachaiKuthirai } from '../rounds/pachai-kuthirai';
import { KallaManna } from '../rounds/kalla-manna';
import { Paandi } from '../rounds/paandi';
const controllers = {
  'kalla-manna': KallaManna,
  'pachai-kuthirai': PachaiKuthirai,
  eripandhu: Eripandhu,
  'seven-stones': SevenStones,
  paandi: Paandi,
};
function immutable<T>(v: T): T {
  if (v && typeof v === 'object') {
    Object.freeze(v);
    for (const child of Object.values(v)) immutable(child);
  }
  return v;
}
export class MatchEngine {
  physics: PhysicsScene;
  controller: RoundController | null = null;
  loaded = new Set<string>();
  loadingStarted = 0;
  history: RoundOutcome[] = [];
  awarded = new Set<string>();
  private hazardSeed = 1;
  queue: string[] = [];
  votes = new Map<string, string>();
  random = seeded(1);
  constructor(public s: PartyState) {
    this.physics = new PhysicsScene(mapFor('courtyard'));
  }
  get participants() {
    return [...this.s.players.values()].filter((p) => p.matchEligible);
  }
  startError() {
    const humans = [...this.s.players.values()].filter((p) => !p.cpu && p.connected);
    return (
      rosterError(this.s.format, this.s.singleGame, this.s.slots, humans.length, this.s.botFill) ||
      ([...this.s.players.values()].some((p) => !p.cpu && !p.connected)
        ? 'Wait for disconnected players to return.'
        : '') ||
      (humans.some((p) => !p.ready) ? 'Every human player, including the host, must be ready.' : '')
    );
  }
  begin() {
    if (this.s.phase !== 'LOBBY') return 'A match is already in progress.';
    const error = this.startError();
    if (error) return error;
    this.s.matchId = randomUUID();
    this.s.roundNumber = 0;
    this.history = [];
    this.awarded.clear();
    this.s.history = '';
    this.s.matchResults = '';
    this.s.error = '';
    this.random = seeded(randomInt(0x7fffffff));
    for (const [id, p] of this.s.players) if (p.cpu) this.s.players.delete(id);
    while (this.s.players.size < this.s.slots) {
      const p = new Player();
      p.slotId = `cpu-${this.s.players.size}`;
      p.name = ['Bala', 'Kavi', 'Mani', 'Nila', 'Raja', 'Viji', 'Selvi', 'Muthu'][
        this.s.players.size
      ];
      p.cpu = true;
      p.connected = false;
      p.cosmetic = this.s.players.size % 6;
      this.s.players.set(p.slotId, p);
    }
    const teams: number[] = JSON.parse(this.s.teamOrder || '[]');
    let i = 0;
    for (const p of this.s.players.values()) {
      p.score = 0;
      p.matchEligible = true;
      p.team = teams[i++] ?? i % 2;
    }
    this.queue =
      this.s.format === 'festival'
        ? this.s.policy === 'shuffle'
          ? shuffle(GAME_IDS, this.random)
          : JSON.parse(this.s.order || JSON.stringify(FESTIVAL_ORDER))
        : this.s.format === 'knockout'
          ? [this.s.firstRace, 'kalla-manna', 'eripandhu']
          : [this.s.singleGame];
    this.nextRound();
    return '';
  }
  nextRound() {
    this.s.remaining = JSON.stringify(this.queue);
    this.votes.clear();
    this.s.votes = '{}';
    if (!this.queue.length) {
      this.s.phase = 'MATCH_RESULTS';
      this.s.matchResults = JSON.stringify(
        this.s.format === 'festival'
          ? makeOutcome(
              `${this.s.matchId}:final`,
              'festival',
              [...this.s.players.values()],
              (p) => [p.score],
              'Total points across five rounds. Equal totals share the title.',
            )
          : this.history.at(-1),
      );
      return;
    }
    if (this.s.format === 'festival' && this.s.policy === 'vote' && this.queue.length > 1) {
      this.s.phase = 'VOTING';
      this.s.deadline = this.s.tick + 600;
      return;
    }
    this.select(this.queue[0]);
  }
  vote(id: string, game: string, match: string) {
    const p = this.s.players.get(id);
    if (
      this.s.phase !== 'VOTING' ||
      match !== this.s.matchId ||
      this.s.tick >= this.s.deadline ||
      !p?.connected ||
      p.cpu ||
      !this.queue.includes(game)
    )
      return false;
    this.votes.set(id, game);
    this.publishVotes();
    return true;
  }
  publishVotes() {
    this.s.votes = JSON.stringify(
      Object.fromEntries(
        [...this.votes].filter(
          ([id]) => this.s.players.get(id)?.connected && !this.s.players.get(id)?.cpu,
        ),
      ),
    );
  }
  resolveVote() {
    this.publishVotes();
    const votes = Object.values(JSON.parse(this.s.votes)) as string[];
    const counts = this.queue.map((game) => ({
      game,
      count: votes.filter((v) => v === game).length,
    }));
    const max = Math.max(...counts.map((c) => c.count));
    const tied = counts.filter((c) => c.count === max);
    this.select(tied[Math.floor(this.random() * tied.length)].game);
  }
  select(game: string) {
    try {
      this.controller?.dispose();
      this.controller = null;
      this.physics.dispose();
      this.physics = new PhysicsScene(mapFor(game));
      this.queue = this.queue.filter((id) => id !== game);
      this.s.remaining = JSON.stringify(this.queue);
      this.s.roundId++;
      this.s.roundNumber++;
      this.s.selectedGame = game;
      this.s.seed = Math.floor(this.random() * 0x7fffffff);
      this.hazardSeed = randomInt(0x7fffffff);
      this.s.phase = 'ROUND_SELECTED';
      this.s.deadline = this.s.tick + TIMING.reveal;
      this.s.results = '';
      this.s.items.clear();
      this.loaded.clear();
      this.s.suddenDeath = false;
      this.s.heatPhase = '';
      this.s.safeTiles = '[]';
      this.s.wave = 0;
      this.s.target =
        this.s.format === 'knockout'
          ? this.s.roundNumber === 1
            ? 4
            : this.s.roundNumber === 2
              ? 2
              : 0
          : 0;
      const map = mapFor(game);
      let i = 0;
      for (const p of this.s.players.values()) {
        Object.assign(p, {
          alive: p.matchEligible,
          qualified: false,
          lives: 2,
          item: '',
          progress: 0,
          checkpoint: 0,
          finishTick: -1,
          eliminatedTick: -1,
          stunUntil: 0,
          protectionUntil: 0,
          vaultUntil: 0,
          boostUntil: 0,
          section: 0,
          gate: 0,
          returning: false,
          markerRetrieved: false,
          lastSupport: -1,
          airborneFrom: -1,
          placingUntil: 0,
          throwUntil: 0,
          notice: '',
          noticeUntil: 0,
          hits: 0,
        });
        this.resetPlayer(p, map.spawns[i++ % map.spawns.length]);
      }
    } catch (error) {
      this.returnToLobby(
        `The round could not initialize: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }
  resetPlayer(p: Player, spawn: { x: number; z: number }) {
    Object.assign(p, {
      x: spawn.x,
      y: 0.05,
      z: spawn.z,
      vx: 0,
      vy: 0,
      vz: 0,
      grounded: true,
      jumpHeld: false,
      actionHeld: false,
      jumpBuffer: 0,
      lastGround: this.s.tick,
      mode: 'idle',
      vaultUntil: 0,
      boostUntil: 0,
      stunUntil: 0,
      protectionUntil: 0,
      placingUntil: 0,
      throwUntil: 0,
      progress: 0,
      checkpoint: 0,
      section: 0,
      gate: 0,
      lives: 2,
      hits: 0,
      finishTick: -1,
      eliminatedTick: -1,
      returning: false,
      markerRetrieved: false,
      notice: '',
      noticeUntil: 0,
    });
    this.physics.add(p.slotId, p);
  }
  contentReady(id: string, round: number, content: string) {
    if (
      this.s.phase === 'LOADING' &&
      round === this.s.roundId &&
      content === CONTENT &&
      this.s.players.has(id)
    )
      this.loaded.add(id);
  }
  returnToLobby(reason = '') {
    this.controller?.dispose();
    this.controller = null;
    this.physics.dispose();
    this.physics = new PhysicsScene(mapFor('courtyard'));
    this.s.items.clear();
    this.s.phase = 'LOBBY';
    this.s.error = reason;
    this.s.results = '';
    this.s.matchResults = '';
    this.s.history = '';
    this.s.remaining = '[]';
    this.s.votes = '{}';
    this.loaded.clear();
    this.queue = [];
    this.votes.clear();
    this.s.roundId++;
    this.s.deadline = 0;
    this.s.target = 0;
    let i = 0;
    for (const [id, p] of this.s.players) {
      if (p.cpu) {
        this.s.players.delete(id);
        continue;
      }
      p.ready = false;
      p.alive = true;
      p.matchEligible = true;
      p.qualified = false;
      p.item = '';
      p.score = 0;
      this.resetPlayer(p, mapFor('courtyard').spawns[i++ % 8]);
    }
    this.s.revision++;
  }
  update(commands: Map<string, Command>) {
    this.s.tick++;
    if (this.s.phase === 'VOTING' && this.s.tick >= this.s.deadline) this.resolveVote();
    if (this.s.phase === 'ROUND_SELECTED' && this.s.tick >= this.s.deadline) {
      this.s.phase = 'LOADING';
      this.loadingStarted = performance.now();
    }
    if (this.s.phase === 'LOADING') {
      const missing = [...this.s.players.values()].filter(
        (p) => !p.cpu && !this.loaded.has(p.slotId),
      );
      if (!missing.length) {
        this.s.phase = 'BRIEFING';
        this.s.deadline = this.s.tick + TIMING.briefing;
      } else if (performance.now() - this.loadingStarted > TIMING.loadingMs)
        this.returnToLobby(
          `Content did not finish loading for ${missing.map((p) => p.name).join(', ')}.`,
        );
    }
    if (this.s.phase === 'BRIEFING' && this.s.tick >= this.s.deadline) {
      this.s.phase = 'COUNTDOWN';
      this.s.deadline = this.s.tick + TIMING.countdown;
    }
    if (this.s.phase === 'COUNTDOWN' && this.s.tick >= this.s.deadline) {
      if (this.participants.length < 2) {
        this.returnToLobby('No contest: fewer than two participants remain.');
        return;
      }
      try {
        this.s.phase = 'PLAYING';
        const Controller = controllers[this.s.selectedGame as keyof typeof controllers];
        this.controller = new Controller({
          state: this.s,
          players: this.participants,
          physics: this.physics,
          startTick: this.s.tick,
          target: this.s.target,
          seed: this.s.selectedGame === 'kalla-manna' ? this.hazardSeed : this.s.seed,
        });
        this.controller.start();
      } catch {
        this.returnToLobby('The round could not start. Please try again.');
        return;
      }
    }
    if (this.s.phase === 'PLAYING')
      for (const p of this.participants) if (p.cpu) commands.set(p.slotId, this.controller!.bot(p));
    if (this.s.phase === 'PLAYING') this.controller?.beforeMove(commands);
    for (const p of this.s.players.values()) {
      this.physics.move(
        p.slotId,
        p,
        commands.get(p.slotId) ?? neutralInput(),
        this.s.tick,
        this.s.phase === 'LOBBY' ||
          (this.s.phase === 'PLAYING' && (this.controller?.movementEnabled() ?? true)),
      );
      if (p.noticeUntil < this.s.tick) p.notice = '';
      if (this.s.phase === 'LOBBY' && (p.y < -2 || Math.abs(p.x) > 11 || Math.abs(p.z) > 10))
        this.resetPlayer(p, mapFor('courtyard').spawns[0]);
    }
    this.physics.step();
    if (this.s.phase === 'PLAYING') {
      this.controller!.afterMove();
      const outcome = this.controller!.outcome();
      if (outcome) this.finishRound(outcome);
    }
    if (this.s.phase === 'ROUND_RESULTS' && this.s.tick >= this.s.deadline) this.nextRound();
  }
  finishRound(result: RoundOutcome) {
    if (this.awarded.has(result.id)) return;
    const outcome = immutable(JSON.parse(JSON.stringify(result)) as RoundOutcome);
    this.awarded.add(outcome.id);
    this.history.push(outcome);
    if (this.s.format === 'festival')
      for (const group of outcome.groups)
        for (const id of group.slots) this.s.players.get(id)!.score += group.points;
    if (this.s.format === 'knockout' && this.s.target > 0)
      for (const p of this.s.players.values())
        p.matchEligible = outcome.qualifiers.includes(p.slotId);
    this.s.results = JSON.stringify(outcome);
    this.s.history = JSON.stringify(this.history);
    this.s.resultRevision++;
    this.s.phase = 'ROUND_RESULTS';
    this.s.deadline = this.s.tick + TIMING.results;
    this.controller?.dispose();
  }
  dispose() {
    this.controller?.dispose();
    this.physics.dispose();
  }
}
