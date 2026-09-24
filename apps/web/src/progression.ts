// Local, per-device progression: street XP, levels, daily streaks, badges and personal bests.
// Purely cosmetic. It never touches the server, Cup points or placements.
export interface RoundStats {
  game: string;
  format: string;
  place: number;
  groupSize: number;
  participants: number;
  won: boolean;
  alive: boolean;
  lives: number;
  style: number;
  hitsDealt: number;
  knockouts: number;
  nearMisses: number;
  cleanVaults: number;
  stonesPlaced: number;
  waves: number;
  sections: number;
  finishSeconds: number;
  bestCombo: number;
  perfectGrids: number;
  overtakes: number;
  tyreJumps: number;
  /** CPU skill XP multiplier; 1 when the round had no CPUs. */
  skillXp: number;
  difficulty: string;
}
export interface Progress {
  xp: number;
  rounds: number;
  wins: number;
  podiums: number;
  bestCombo: number;
  dayStreak: number;
  lastDay: string;
  badges: string[];
  bests: Record<string, number>;
  counters: Record<string, number>;
}
export interface RewardLine {
  label: string;
  xp: number;
}
export interface RoundSummary {
  key: string;
  lines: RewardLine[];
  total: number;
  levelBefore: number;
  levelAfter: number;
  xpAfter: number;
  newBadges: Badge[];
  newBests: string[];
  unlocks: string[];
  dayStreak: number;
}
export interface Badge {
  id: string;
  icon: string;
  title: string;
  detail: string;
}
export const BADGES: Badge[] = [
  { id: 'first-win', icon: '★', title: 'Street Champ', detail: 'Win any round.' },
  { id: 'hat-trick', icon: '♛', title: 'Hat-trick', detail: 'Win 3 rounds.' },
  { id: 'podium-10', icon: '▲', title: 'Regular', detail: 'Finish on the podium 10 times.' },
  { id: 'untouchable', icon: '◈', title: 'Untouchable', detail: 'Win Eripandhu without a hit.' },
  { id: 'sniper', icon: '◎', title: 'Sniper', detail: 'Land 3 hits in one Eripandhu round.' },
  { id: 'close-call', icon: '≋', title: 'Ice Veins', detail: 'Dodge 3 close calls in one round.' },
  { id: 'wave-rider', icon: '◆', title: 'Wave Rider', detail: 'Survive 8 Kalla Manna waves.' },
  { id: 'clean-lane', icon: '⤴', title: 'Clean Lane', detail: 'Land 4 clean vaults in one race.' },
  { id: 'builder', icon: '▰', title: 'Master Builder', detail: 'Place 3 stones in one round.' },
  { id: 'chalk', icon: '▦', title: 'Chalk Champion', detail: 'Finish all three Paandi grids.' },
  { id: 'combo-5', icon: '✦', title: 'On Fire', detail: 'Reach a x5 combo.' },
  { id: 'festival', icon: '♔', title: 'Festival Legend', detail: 'Win a Festival Cup.' },
  { id: 'streak-3', icon: '☀', title: 'Every Evening', detail: 'Play 3 days in a row.' },
  { id: 'all-five', icon: '✿', title: 'Whole Street', detail: 'Finish a round of all 5 games.' },
  {
    id: 'perfect-paandi',
    icon: '▣',
    title: 'Steady Feet',
    detail: 'Clear 3 Paandi grids without a slip.',
  },
  {
    id: 'tyre-hopper',
    icon: '◯',
    title: 'Tyre Hopper',
    detail: 'Jump 3 rolling tyres in one race.',
  },
  { id: 'overtaker', icon: '»', title: 'Slipstream', detail: 'Make 4 overtakes in one round.' },
  {
    id: 'legend-slayer',
    icon: '⚔',
    title: 'Legend Slayer',
    detail: 'Win a round against Legend CPUs.',
  },
];
export const HATS = [
  { id: 0, name: 'Bare head', level: 1 },
  { id: 1, name: 'Cricket cap', level: 2 },
  { id: 2, name: 'Jasmine band', level: 4 },
  { id: 3, name: 'Paper crown', level: 6 },
  { id: 4, name: 'Cool shades', level: 9 },
  { id: 5, name: 'Golden crown', level: 13 },
];
export const COMBO_WINDOW_SECONDS = 4;
// Keeps one hot round from skipping the long unlock curve.
export const STYLE_CAP = 250;
export const MAX_MULTIPLIER = 5;
export function multiplierFor(count: number) {
  return Math.max(1, Math.min(MAX_MULTIPLIER, count));
}
export function xpToNext(level: number) {
  return 120 + (level - 1) * 60;
}
export function levelFor(xp: number) {
  let level = 1,
    rest = Math.max(0, Math.floor(xp));
  while (rest >= xpToNext(level)) {
    rest -= xpToNext(level);
    level++;
  }
  return { level, into: rest, need: xpToNext(level) };
}
export function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function nextStreak(lastDay: string, streak: number, today: Date) {
  const key = dayKey(today);
  if (lastDay === key) return { streak: Math.max(1, streak), first: false };
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  return { streak: lastDay === dayKey(yesterday) ? streak + 1 : 1, first: true };
}
export function emptyProgress(): Progress {
  return {
    xp: 0,
    rounds: 0,
    wins: 0,
    podiums: 0,
    bestCombo: 0,
    dayStreak: 0,
    lastDay: '',
    badges: [],
    bests: {},
    counters: {},
  };
}
const BEST_KEYS: Record<
  string,
  { key: string; label: string; lower?: boolean; of: keyof RoundStats }
> = {
  'kalla-manna': { key: 'kalla-waves', label: 'Most Kalla Manna waves survived', of: 'waves' },
  'pachai-kuthirai': {
    key: 'race-time',
    label: 'Fastest Pachai Kuthirai finish',
    lower: true,
    of: 'finishSeconds',
  },
  eripandhu: { key: 'eri-hits', label: 'Most Eripandhu hits', of: 'hitsDealt' },
  'seven-stones': { key: 'stones', label: 'Most stones placed', of: 'stonesPlaced' },
  paandi: { key: 'paandi-time', label: 'Fastest Paandi finish', lower: true, of: 'finishSeconds' },
};
// Applies one finished round to a progress record. Pure: returns a new record and a summary.
export function applyRound(
  before: Progress,
  stats: RoundStats,
  key: string,
  today: Date,
): { progress: Progress; summary: RoundSummary } {
  const p: Progress = {
    ...before,
    badges: [...before.badges],
    bests: { ...before.bests },
    counters: { ...before.counters },
  };
  const lines: RewardLine[] = [{ label: 'Played the round', xp: 25 }];
  const share =
    stats.participants > 1 ? (stats.participants - stats.place) / (stats.participants - 1) : 1;
  const placement = Math.round(Math.max(0, share) * 100);
  if (placement) lines.push({ label: `Placed #${stats.place}`, xp: placement });
  if (stats.won)
    lines.push({ label: stats.groupSize > 1 ? 'Shared the win' : 'Round winner', xp: 60 });
  if (stats.style > 0)
    lines.push({ label: 'Style & combos', xp: Math.round(Math.min(STYLE_CAP, stats.style)) });
  if (stats.skillXp !== 1) {
    const base = lines.reduce((sum, l) => sum + l.xp, 0);
    lines.push({
      label: `${stats.difficulty[0].toUpperCase()}${stats.difficulty.slice(1)} CPUs x${stats.skillXp}`,
      xp: Math.round(base * (stats.skillXp - 1)),
    });
  }
  const streak = nextStreak(p.lastDay, p.dayStreak, today);
  const subtotal = lines.reduce((sum, l) => sum + l.xp, 0);
  if (streak.first)
    lines.push({
      label: `First round today · day ${streak.streak}`,
      xp: Math.round(subtotal * 0.5),
    });
  const total = lines.reduce((sum, l) => sum + l.xp, 0);
  const levelBefore = levelFor(p.xp).level;
  p.xp += total;
  p.rounds++;
  if (stats.won) p.wins++;
  if (stats.place <= 3) p.podiums++;
  p.bestCombo = Math.max(p.bestCombo, stats.bestCombo);
  p.dayStreak = streak.streak;
  p.lastDay = dayKey(today);
  p.counters[`played:${stats.game}`] = (p.counters[`played:${stats.game}`] ?? 0) + 1;
  const newBests: string[] = [];
  const best = BEST_KEYS[stats.game];
  if (best) {
    const value = stats[best.of] as number;
    const previous = p.bests[best.key];
    if (
      value > 0 &&
      (previous === undefined || (best.lower ? value < previous : value > previous))
    ) {
      p.bests[best.key] = value;
      if (previous !== undefined) newBests.push(best.label);
    }
  }
  const earned = (id: string) => {
    switch (id) {
      case 'first-win':
        return p.wins >= 1;
      case 'hat-trick':
        return p.wins >= 3;
      case 'podium-10':
        return p.podiums >= 10;
      case 'untouchable':
        return stats.game === 'eripandhu' && stats.won && stats.lives >= 2;
      case 'sniper':
        return stats.game === 'eripandhu' && stats.hitsDealt >= 3;
      case 'close-call':
        return stats.nearMisses >= 3;
      case 'wave-rider':
        return stats.game === 'kalla-manna' && stats.waves >= 8;
      case 'clean-lane':
        return stats.game === 'pachai-kuthirai' && stats.cleanVaults >= 4;
      case 'builder':
        return stats.game === 'seven-stones' && stats.stonesPlaced >= 3;
      case 'chalk':
        return stats.game === 'paandi' && stats.sections >= 3;
      case 'combo-5':
        return stats.bestCombo >= MAX_MULTIPLIER;
      case 'streak-3':
        return p.dayStreak >= 3;
      case 'perfect-paandi':
        return stats.game === 'paandi' && stats.perfectGrids >= 3;
      case 'tyre-hopper':
        return stats.game === 'pachai-kuthirai' && stats.tyreJumps >= 3;
      case 'overtaker':
        return stats.overtakes >= 4;
      case 'legend-slayer':
        return stats.won && stats.difficulty === 'legend' && stats.skillXp > 1;
      case 'all-five':
        return ['kalla-manna', 'pachai-kuthirai', 'eripandhu', 'seven-stones', 'paandi'].every(
          (g) => (p.counters[`played:${g}`] ?? 0) > 0,
        );
      default:
        return false;
    }
  };
  const newBadges = BADGES.filter((b) => !p.badges.includes(b.id) && earned(b.id));
  p.badges.push(...newBadges.map((b) => b.id));
  const levelAfter = levelFor(p.xp).level;
  return {
    progress: p,
    summary: {
      key,
      lines,
      total,
      levelBefore,
      levelAfter,
      xpAfter: p.xp,
      newBadges,
      newBests,
      unlocks: HATS.filter((h) => h.level > levelBefore && h.level <= levelAfter).map(
        (h) => h.name,
      ),
      dayStreak: p.dayStreak,
    },
  };
}
// Festival Cup champions get a one-off bonus and badge.
export function applyCupWin(before: Progress): { progress: Progress; badge?: Badge } {
  const p = { ...before, badges: [...before.badges], xp: before.xp + 250 };
  const badge = BADGES.find((b) => b.id === 'festival')!;
  if (p.badges.includes(badge.id)) return { progress: p };
  p.badges.push(badge.id);
  return { progress: p, badge };
}
const STORAGE_KEY = 'theru.progress';
export function loadProgress(): Progress {
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const base = emptyProgress();
    return {
      ...base,
      ...Object.fromEntries(
        Object.entries(v).filter(([k, value]) =>
          k in base ? typeof value === typeof base[k as keyof Progress] : false,
        ),
      ),
      badges: Array.isArray(v.badges) ? v.badges.filter((b: unknown) => typeof b === 'string') : [],
    };
  } catch {
    return emptyProgress();
  }
}
let current: Progress | null = null;
const listeners = new Set<() => void>();
export function progress() {
  return (current ??= loadProgress());
}
export function saveProgress(next: Progress) {
  current = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* Storage can be unavailable in private windows; progress stays for this tab. */
  }
  for (const fn of listeners) fn();
}
export function subscribeProgress(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
