export const BUILD = 'theru-0.1.0';
export const CONTENT = 'courtyards-1';
export const TICK_RATE = 60;
export const DT = 1 / TICK_RATE;
export const TIMING = {
  reveal: 120,
  briefing: 300,
  countdown: 180,
  results: 360,
  loadingMs: 30000,
  staleMs: 250,
  reconnectSeconds: 15,
  hostTransferMs: 5000,
  abandonMs: 30000,
};
export const MOVE = {
  height: 1.65,
  radius: 0.35,
  speed: 5.5,
  acceleration: 30,
  gravity: -24,
  jump: 7.8,
  airSteering: 0.55,
  coyoteTicks: 6,
  bufferTicks: 8,
  stepHeight: 0.25,
};
export const COLORS = {
  ink: '#152347',
  indigo: '#203E91',
  blue: '#3168E0',
  cyan: '#45C8F5',
  yellow: '#FFD34E',
  cream: '#FFF4DD',
  white: '#F7FBFF',
  muted: '#C7D3EF',
  mint: '#45C486',
  coral: '#E86762',
  sand: '#E8C894',
  stone: '#8996A5',
  terracotta: '#C66F4A',
  leaf: '#6EA675',
  ocean: '#269AC7',
  mango: '#E8A23B',
};
export const GAME_IDS = [
  'kalla-manna',
  'pachai-kuthirai',
  'eripandhu',
  'seven-stones',
  'paandi',
] as const;
export type GameId = (typeof GAME_IDS)[number];
export type Format = 'single' | 'festival' | 'knockout';
// CPU skill. Humans are never affected; it only shapes CPU reaction, accuracy and mistakes.
export const DIFFICULTIES = ['relaxed', 'street', 'legend'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];
export const DIFFICULTY_INFO: Record<Difficulty, { label: string; detail: string; xp: number }> = {
  relaxed: { label: 'Relaxed', detail: 'Slower CPUs that slip up often.', xp: 0.75 },
  street: { label: 'Street', detail: 'A fair neighbourhood challenge.', xp: 1 },
  legend: { label: 'Legend', detail: 'Sharp, fast CPUs. Bonus XP.', xp: 1.4 },
};
export type Phase =
  | 'LOBBY'
  | 'VOTING'
  | 'ROUND_SELECTED'
  | 'LOADING'
  | 'BRIEFING'
  | 'COUNTDOWN'
  | 'PLAYING'
  | 'ROUND_RESULTS'
  | 'MATCH_RESULTS';
export type Policy = 'host' | 'shuffle' | 'vote';
export const FESTIVAL_ORDER: GameId[] = [
  'pachai-kuthirai',
  'kalla-manna',
  'paandi',
  'seven-stones',
  'eripandhu',
];
export interface RoundManifest {
  id: GameId;
  title: string;
  tamil: string;
  subtitle: string;
  category: string;
  seconds: number;
  objective: string;
  objectiveTa: string;
  controls: string;
  color: string;
}
export const GAMES: Record<GameId, RoundManifest> = {
  'kalla-manna': {
    id: 'kalla-manna',
    title: 'Kalla Manna',
    tamil: 'கல்லா மண்ணா',
    subtitle: 'Stone or Sand',
    category: 'SURVIVAL',
    seconds: 75,
    objective: 'Reach the called safe surface before the countdown ends.',
    objectiveTa: 'நேரம் முடிவதற்குள் அறிவிக்கப்பட்ட பாதுகாப்பான இடத்திற்குச் செல்லுங்கள்.',
    controls: 'Move · Jump',
    color: COLORS.mint,
  },
  'pachai-kuthirai': {
    id: 'pachai-kuthirai',
    title: 'Pachai Kuthirai',
    tamil: 'பச்சைக் குதிரை',
    subtitle: 'Leapfrog Lane',
    category: 'RACE',
    seconds: 90,
    objective: 'Time your vaults, jump the rolling tyres, pass the checkpoints and finish.',
    objectiveTa: 'சரியான நேரத்தில் தாண்டி, சோதனைப் புள்ளிகளைக் கடந்து இலக்கை அடையுங்கள்.',
    controls: 'Move · Jump / vault',
    color: COLORS.yellow,
  },
  eripandhu: {
    id: 'eripandhu',
    title: 'Eripandhu',
    tamil: 'எறிபந்து',
    subtitle: 'Dodgeball Yard',
    category: 'ELIMINATION',
    seconds: 90,
    objective: 'Dodge incoming balls. Two valid hits knock you out.',
    objectiveTa: 'வரும் பந்துகளைத் தவிருங்கள். இரண்டு முறை பட்டால் வெளியேறுவீர்கள்.',
    controls: 'Move · Jump · E pick up / throw · Mouse aim',
    color: COLORS.coral,
  },
  'seven-stones': {
    id: 'seven-stones',
    title: 'Seven Stones',
    tamil: 'ஏழு கல்',
    subtitle: 'Stack and Scatter',
    category: 'TEAM PLAY',
    seconds: 186,
    objective: 'Builders stack seven stones. Defenders tag them with the ball. Swap roles.',
    objectiveTa: 'ஏழு கற்களை அடுக்குங்கள் அல்லது பந்தால் தடுங்கள். பிறகு அணிகளின் பங்கு மாறும்.',
    controls: 'Move · Jump · E pick up / place / throw',
    color: COLORS.cyan,
  },
  paandi: {
    id: 'paandi',
    title: 'Paandi',
    tamil: 'பாண்டி',
    subtitle: 'Chalk-Hop Challenge',
    category: 'PRECISION',
    seconds: 105,
    objective: 'Hop out, skip the marker, turn back, and retrieve it with E.',
    objectiveTa: 'குறியிட்ட கட்டத்தைத் தாண்டிக் குதித்து, திரும்பி வந்து குறியை எடுங்கள்.',
    controls: 'Move · Jump · E retrieve',
    color: COLORS.mango,
  },
};
export function seeded(seed: number) {
  let n = seed >>> 0;
  return () => {
    n += 0x6d2b79f5;
    let t = n;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function shuffle<T>(values: readonly T[], random: () => number): T[] {
  const out = [...values];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
