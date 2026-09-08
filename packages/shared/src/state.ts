import { schema, t, type SchemaType } from '@colyseus/schema';
import { BUILD, CONTENT, type Phase } from './config';
export const InputFrame = schema(
  {
    moveX: t.float32().default(0),
    moveZ: t.float32().default(0),
    jump: t.boolean().default(false),
    action: t.boolean().default(false),
    aimX: t.float32().default(0),
    aimZ: t.float32().default(-1),
    round: t.uint32().default(0),
  },
  'InputFrame',
);
export type InputFrame = SchemaType<typeof InputFrame>;
export const Player = schema(
  {
    slotId: t.string().default(''),
    name: t.string().default(''),
    cpu: t.boolean().default(false),
    connected: t.boolean().default(true),
    ready: t.boolean().default(false),
    team: t.float64().default(0),
    cosmetic: t.float64().default(0),
    x: t.float64().default(0),
    y: t.float64().default(0),
    z: t.float64().default(0),
    vx: t.float64().default(0),
    vy: t.float64().default(0),
    vz: t.float64().default(0),
    facing: t.float64().default(0),
    grounded: t.boolean().default(true),
    jumpHeld: t.boolean().default(false),
    actionHeld: t.boolean().default(false),
    jumpBuffer: t.float64().default(0),
    lastGround: t.float64().default(0),
    mode: t.string().default('idle'),
    matchEligible: t.boolean().default(true),
    alive: t.boolean().default(true),
    qualified: t.boolean().default(false),
    lives: t.float64().default(2),
    item: t.string().default(''),
    progress: t.float64().default(0),
    checkpoint: t.float64().default(0),
    stunUntil: t.float64().default(0),
    protectionUntil: t.float64().default(0),
    score: t.float64().default(0),
    finishTick: t.float64().default(-1),
    eliminatedTick: t.float64().default(-1),
    hits: t.float64().default(0),
    vaultUntil: t.float64().default(0),
    vaultStart: t.float64().default(0),
    vaultX: t.float64().default(0),
    vaultZ: t.float64().default(0),
    vaultEndX: t.float64().default(0),
    vaultEndZ: t.float64().default(0),
    boostUntil: t.float64().default(0),
    section: t.float64().default(0),
    gate: t.float64().default(0),
    returning: t.boolean().default(false),
    markerRetrieved: t.boolean().default(false),
    lastSupport: t.float64().default(-1),
    airborneFrom: t.float64().default(-1),
    placingUntil: t.float64().default(0),
    throwUntil: t.float64().default(0),
    notice: t.string().default(''),
    noticeUntil: t.float64().default(0),
  },
  'Player',
);
export type Player = SchemaType<typeof Player>;
export const Item = schema(
  {
    id: t.string().default(''),
    kind: t.string().default('ball'),
    status: t.string().default('GROUND'),
    owner: t.string().default(''),
    x: t.float64().default(0),
    y: t.float64().default(0.2),
    z: t.float64().default(0),
    vx: t.float64().default(0),
    vz: t.float64().default(0),
    until: t.float64().default(0),
    travel: t.float64().default(0),
    stackIndex: t.float64().default(-1),
  },
  'Item',
);
export type Item = SchemaType<typeof Item>;
export const PartyState = schema(
  {
    roomCode: t.string().default(''),
    build: t.string().default(BUILD),
    content: t.string().default(CONTENT),
    revision: t.float64().default(0),
    host: t.string().default(''),
    phase: t.string<Phase>().default('LOBBY'),
    matchId: t.string().default(''),
    roundId: t.float64().default(0),
    roundNumber: t.float64().default(0),
    format: t.string().default('festival'),
    policy: t.string().default('host'),
    selectedGame: t.string().default('kalla-manna'),
    singleGame: t.string().default('kalla-manna'),
    firstRace: t.string().default('pachai-kuthirai'),
    slots: t.float64().default(8),
    botFill: t.boolean().default(true),
    order: t.string().default(''),
    remaining: t.string().default(''),
    tick: t.float64().default(0),
    deadline: t.float64().default(0),
    target: t.float64().default(0),
    seed: t.float64().default(1),
    error: t.string().default(''),
    wave: t.float64().default(0),
    safe: t.string().default(''),
    safeTiles: t.string().default(''),
    wavePhase: t.string().default('warning'),
    waveDeadline: t.float64().default(0),
    heatPhase: t.string().default(''),
    heat: t.float64().default(0),
    builderTeam: t.float64().default(0),
    stacked: t.float64().default(0),
    suddenDeath: t.boolean().default(false),
    boundary: t.float64().default(10),
    marker: t.float64().default(3),
    results: t.string().default(''),
    history: t.string().default(''),
    votes: t.string().default(''),
    resultRevision: t.float64().default(0),
    teamOrder: t.string().default(''),
    matchResults: t.string().default(''),
    players: t.map(Player),
    items: t.map(Item),
  },
  'PartyState',
);
export type PartyState = SchemaType<typeof PartyState>;
export interface Placement {
  slots: string[];
  place: number;
  points: number;
  metric: string;
}
export interface RoundOutcome {
  id: string;
  game: string;
  groups: Placement[];
  qualifiers: string[];
  reason: string;
  draw: boolean;
  heats?: { team: number; count: number; tick: number }[];
}
