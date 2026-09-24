// Client-side "hype" layer: turns authoritative state changes into moment-to-moment feedback
// (announcements, combo multiplier, style XP, particles, camera kicks). It only observes state;
// nothing here is sent to the server or affects placements and Cup points.
import { useSyncExternalStore } from 'react';
import { cellAt } from '../../../packages/shared/src/maps';
import type { RoundOutcome } from '../../../packages/shared/src/state';
import {
  COMBO_WINDOW_SECONDS,
  MAX_MULTIPLIER,
  applyCupWin,
  applyRound,
  multiplierFor,
  progress,
  saveProgress,
  type Badge,
  type RoundStats,
  type RoundSummary,
} from './progression';
import { sound, setIntensity } from './audio';
import { preferences } from './preferences';
export type Tone = 'gold' | 'coral' | 'cyan' | 'mint' | 'ink';
export interface Popup {
  id: number;
  text: string;
  xp: number;
  multiplier: number;
  tone: Tone;
  at: number;
}
export interface Banner {
  id: number;
  title: string;
  sub?: string;
  tone: Tone;
  at: number;
  big?: boolean;
}
export interface FeedLine {
  id: number;
  text: string;
  at: number;
}
export interface Burst {
  x: number;
  y: number;
  z: number;
  color: string;
  count: number;
  power: number;
}
const TONE_COLORS: Record<Tone, string> = {
  gold: '#FFD34E',
  coral: '#E86762',
  cyan: '#45C8F5',
  mint: '#45C486',
  ink: '#152347',
};
function freshRound(key = '') {
  return {
    key,
    style: 0,
    hitsDealt: 0,
    knockouts: 0,
    nearMisses: 0,
    cleanVaults: 0,
    stonesPlaced: 0,
    waves: 0,
    sections: 0,
    finishSeconds: 0,
    bestCombo: 0,
    startTick: 0,
    participants: 0,
  };
}
export const hype = {
  version: 0,
  popups: [] as Popup[],
  banner: null as Banner | null,
  feed: [] as FeedLine[],
  combo: { count: 0, expires: 0 },
  flash: { tone: 'gold' as Tone, at: -10 },
  shake: 0,
  fovKick: 0,
  bursts: [] as Burst[],
  round: freshRound(),
  summary: null as RoundSummary | null,
  cupBadge: null as Badge | null,
  safety: '' as '' | 'safe' | 'unsafe',
};
let nextId = 1;
const listeners = new Set<() => void>();
function changed() {
  hype.version++;
  for (const fn of listeners) fn();
}
export function useHype() {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => hype.version,
  );
}
const now = () => performance.now() / 1000;
export function comboMultiplier(t = now()) {
  return t < hype.combo.expires ? multiplierFor(hype.combo.count) : 1;
}
// Awards style XP. Skill actions ("chain") build the combo multiplier when landed inside the
// window; rhythm rewards such as surviving a Kalla wave pay a flat amount and leave it untouched.
export function reward(
  text: string,
  xp: number,
  tone: Tone = 'gold',
  { chain = true, t = now() }: { chain?: boolean; t?: number } = {},
) {
  let multiplier = 1;
  if (chain) {
    hype.combo.count = t < hype.combo.expires ? hype.combo.count + 1 : 1;
    hype.combo.expires = t + COMBO_WINDOW_SECONDS;
    multiplier = multiplierFor(hype.combo.count);
    hype.round.bestCombo = Math.max(hype.round.bestCombo, multiplier);
  }
  hype.round.style += xp * multiplier;
  hype.popups = [
    ...hype.popups.slice(-4),
    { id: nextId++, text, xp: xp * multiplier, multiplier, tone, at: t },
  ];
  sound('reward', multiplier);
  if (chain && hype.combo.count === 3) announce('COMBO x3!', 'Keep the chain alive', 'gold');
  if (chain && hype.combo.count === MAX_MULTIPLIER)
    announce('ON FIRE! x5', 'Maximum combo', 'coral', true);
  changed();
  return multiplier;
}
export function announce(title: string, sub = '', tone: Tone = 'gold', big = false) {
  hype.banner = { id: nextId++, title, sub, tone, at: now(), big };
  changed();
}
export function feed(text: string) {
  hype.feed = [...hype.feed.slice(-3), { id: nextId++, text, at: now() }];
  changed();
}
export function flash(tone: Tone) {
  hype.flash = { tone, at: now() };
  changed();
}
export function kick(amount: number) {
  if (preferences.reducedMotion || !preferences.shake) return;
  hype.shake = Math.min(1, hype.shake + amount);
}
export function burst(
  at: { x: number; y: number; z: number },
  tone: Tone | string,
  count = 18,
  power = 1,
) {
  if (preferences.reducedMotion) count = Math.min(count, 6);
  hype.bursts.push({
    x: at.x,
    y: at.y,
    z: at.z,
    color: TONE_COLORS[tone as Tone] ?? tone,
    count,
    power,
  });
}
// ---------------------------------------------------------------------------------------------
// Detector: compares the previous frame's authoritative snapshot with the current one.
interface PlayerSnap {
  alive: boolean;
  lives: number;
  hits: number;
  checkpoint: number;
  section: number;
  finishTick: number;
  qualified: boolean;
  notice: string;
  markerRetrieved: boolean;
  x: number;
  y: number;
  z: number;
}
interface Snapshot {
  key: string;
  phase: string;
  wavePhase: string;
  wave: number;
  stacked: number;
  suddenDeath: boolean;
  seconds: number;
  active: number;
  players: Map<string, PlayerSnap>;
  near: Map<string, number>;
}
let prev: Snapshot | null = null;
const committed = new Set<string>();
function snap(p: any): PlayerSnap {
  return {
    alive: p.alive,
    lives: p.lives,
    hits: p.hits,
    checkpoint: p.checkpoint,
    section: p.section,
    finishTick: p.finishTick,
    qualified: p.qualified,
    notice: p.notice,
    markerRetrieved: p.markerRetrieved,
    x: p.x,
    y: p.y,
    z: p.z,
  };
}
const ELIMINATION_GAMES = ['kalla-manna', 'eripandhu'];
export function resetHype() {
  prev = null;
  hype.round = freshRound();
  hype.combo = { count: 0, expires: 0 };
  hype.popups = [];
  hype.banner = null;
  hype.feed = [];
  hype.safety = '';
  setIntensity(0);
  changed();
}
export function detect(s: any, meId: string) {
  const key = `${s.matchId}:${s.roundId}`;
  const participants = [...s.players.values()].filter((p: any) => p.matchEligible);
  const active = participants.filter((p: any) => p.alive && !p.qualified).length;
  const seconds = Math.max(0, Math.ceil((s.deadline - s.tick) / 60));
  const cur: Snapshot = {
    key,
    phase: s.phase,
    wavePhase: s.wavePhase,
    wave: s.wave,
    stacked: s.stacked,
    suddenDeath: s.suddenDeath,
    seconds,
    active,
    players: new Map(participants.map((p: any) => [p.slotId, snap(p)])),
    near: new Map(prev?.key === key ? prev.near : []),
  };
  if (!prev || prev.key !== key) {
    if (hype.round.key !== key) {
      hype.round = freshRound(key);
      hype.combo = { count: 0, expires: 0 };
      hype.safety = '';
      hype.summary = s.phase === 'ROUND_RESULTS' ? hype.summary : null;
    }
    prev = cur;
    return;
  }
  const me = s.players.get(meId),
    was = prev.players.get(meId),
    game = s.selectedGame;
  // Phase transitions.
  if (cur.phase !== prev.phase) {
    if (cur.phase === 'PLAYING') {
      hype.round.startTick = s.tick;
      hype.round.participants = participants.length;
      announce('GO!', '', 'mint', true);
      sound('go');
    }
    if (cur.phase === 'ROUND_RESULTS') commitRound(s, meId);
    if (cur.phase === 'MATCH_RESULTS') commitCup(s, meId);
    if (cur.phase !== 'PLAYING') {
      setIntensity(0);
      hype.safety = '';
    }
  }
  if (cur.phase === 'PLAYING' && prev.phase === 'PLAYING') {
    // Tension: last ten seconds tick like a heartbeat and the music speeds up.
    if (cur.seconds !== prev.seconds && cur.seconds <= 10 && cur.seconds > 0) {
      sound('tick', cur.seconds);
      if (cur.seconds === 10 && me?.alive) announce('10 SECONDS!', 'Make it count', 'coral');
    }
    setIntensity(s.suddenDeath ? 2 : cur.seconds <= 15 || cur.active <= 2 ? 1 : 0);
    if (cur.suddenDeath && !prev.suddenDeath) {
      announce('SUDDEN DEATH', 'One hit and you are out', 'coral', true);
      sound('stinger');
      flash('coral');
    }
    if (ELIMINATION_GAMES.includes(game) && hype.round.participants >= 3) {
      if (cur.active === 3 && prev.active > 3 && hype.round.participants >= 5)
        announce('FINAL THREE!', 'The street is watching', 'gold');
      if (cur.active === 2 && prev.active > 2) {
        announce('FACE-OFF!', 'Last two standing', 'coral', true);
        sound('stinger');
      }
    }
    // Everyone: eliminations, finishes and knockouts become a feed and world-space puffs.
    let myKnockout = false;
    const myHits = me && was ? me.hits - was.hits : 0;
    for (const p of participants) {
      const before = prev.players.get(p.slotId);
      if (!before) continue;
      if (before.lives > p.lives && p.slotId !== meId) {
        burst(
          { x: p.x, y: p.y + 1.1, z: p.z },
          myHits > 0 ? 'gold' : 'coral',
          myHits > 0 ? 26 : 12,
          1.2,
        );
      }
      if (before.alive && !p.alive) {
        burst({ x: p.x, y: p.y + 0.8, z: p.z }, 'ink', 16, 0.8);
        if (p.slotId !== meId) {
          feed(`${p.name} is out`);
          if (myHits > 0) myKnockout = true;
        }
      }
      if (before.finishTick < 0 && p.finishTick >= 0 && p.slotId !== meId)
        feed(`${p.name} finished`);
      if (!before.qualified && p.qualified && p.slotId !== meId) feed(`${p.name} qualified`);
    }
    if (me && was) {
      const at = { x: me.x, y: me.y + 0.3, z: me.z };
      if (myHits > 0) {
        hype.round.hitsDealt += myHits;
        if (myKnockout) {
          hype.round.knockouts++;
          reward('KNOCKOUT!', 50, 'coral');
          announce('KNOCKOUT!', 'You sent them home', 'coral', true);
          kick(0.5);
        } else {
          reward('DIRECT HIT!', 30, 'gold');
          kick(0.25);
        }
      }
      if (me.lives < was.lives && me.alive) {
        flash('coral');
        kick(0.8);
        burst(at, 'coral', 20, 1.3);
        announce('HIT!', me.lives === 1 ? 'One life left. Stay sharp.' : '', 'coral');
        hype.combo = { count: 0, expires: 0 };
      }
      if (was.alive && !me.alive) {
        flash('coral');
        kick(1);
        announce('OUT!', 'Watch, learn, come back stronger', 'ink', true);
        hype.combo = { count: 0, expires: 0 };
        setIntensity(0);
      }
      if (me.checkpoint > was.checkpoint && me.checkpoint < 4) {
        reward(`CHECKPOINT ${me.checkpoint}/4`, 20, 'cyan');
        burst(at, 'cyan', 22);
      }
      if (me.notice === 'Clean vault' && was.notice !== 'Clean vault') {
        hype.round.cleanVaults++;
        reward('CLEAN VAULT!', 15, 'mint');
        hype.fovKick = 1;
        burst(at, 'mint', 14, 0.9);
      }
      if (me.notice === 'Stone placed' && was.notice !== 'Stone placed') {
        hype.round.stonesPlaced++;
        reward('STONE STACKED!', 30, 'cyan');
        burst({ x: 0, y: 1, z: 0 }, 'cyan', 24);
      }
      if (me.section > was.section) {
        hype.round.sections = me.section;
        reward(me.section >= 3 ? 'ALL GRIDS CLEAR!' : `GRID ${me.section} CLEAR!`, 40, 'mint');
        burst(at, 'mint', 26, 1.2);
      }
      if (me.markerRetrieved && !was.markerRetrieved) reward('MARKER GRABBED', 15, 'gold');
      if (me.finishTick >= 0 && was.finishTick < 0) {
        const place = participants.filter(
          (p: any) => p.finishTick >= 0 && p.finishTick <= me.finishTick,
        ).length;
        hype.round.finishSeconds = +((me.finishTick - hype.round.startTick) / 60).toFixed(2);
        reward(
          place === 1 ? 'FIRST TO FINISH!' : `FINISHED #${place}`,
          place === 1 ? 80 : 50,
          'gold',
        );
        announce(
          place === 1 ? 'FIRST PLACE!' : `FINISHED #${place}`,
          `${hype.round.finishSeconds}s`,
          'gold',
          place === 1,
        );
        burst(at, 'gold', 40, 1.6);
        sound('fanfare');
      }
      if (me.qualified && !was.qualified) {
        announce('QUALIFIED!', 'You are through to the next round', 'mint', true);
        burst(at, 'mint', 36, 1.4);
      }
      // Kalla Manna: surviving an active hazard is a reward; show whether you stand on safe ground.
      if (game === 'kalla-manna' && me.alive) {
        if (prev.wavePhase === 'active' && cur.wavePhase === 'recovery') {
          hype.round.waves++;
          reward(`WAVE ${cur.wave} SURVIVED`, Math.min(30, 8 + cur.wave * 2), 'mint', {
            chain: false,
          });
          burst(at, 'mint', 12, 0.8);
        }
        const safeIds: number[] = JSON.parse(s.safeTiles || '[]');
        const cell = cellAt(me.x, me.z);
        const next: typeof hype.safety =
          cur.wavePhase === 'recovery' || !cell
            ? ''
            : safeIds.includes(cell.index)
              ? 'safe'
              : 'unsafe';
        if (next !== hype.safety) {
          hype.safety = next;
          changed();
        }
      }
      // Eripandhu / Seven Stones: a live enemy ball that passes close without hitting you.
      if (me.alive) {
        for (const item of s.items.values()) {
          if (item.kind !== 'ball') continue;
          const owner = s.players.get(item.owner);
          if (
            item.status !== 'LIVE' ||
            item.owner === meId ||
            (game === 'seven-stones' && owner?.team === me.team)
          ) {
            cur.near.delete(item.id);
            continue;
          }
          const d = Math.hypot(item.x - me.x, item.z - me.z);
          const closest = cur.near.get(item.id);
          if (closest === undefined) cur.near.set(item.id, d);
          else if (closest >= 0 && d < closest) cur.near.set(item.id, d);
          else if (closest >= 0 && d > closest + 0.4) {
            if (closest < 1.15 && me.lives === was.lives && me.protectionUntil <= s.tick) {
              hype.round.nearMisses++;
              reward('CLOSE CALL!', 25, 'cyan');
              sound('whoosh');
            }
            cur.near.set(item.id, -1);
          }
        }
      }
    }
    if (cur.stacked > prev.stacked && cur.stacked === 7) {
      announce('TOWER COMPLETE!', 'All seven stones stacked', 'cyan', true);
      burst({ x: 0, y: 2, z: 0 }, 'gold', 50, 2);
    }
  }
  prev = cur;
}
function commitRound(s: any, meId: string) {
  const outcome: RoundOutcome | null = s.results ? JSON.parse(s.results) : null;
  if (!outcome || committed.has(outcome.id)) return;
  committed.add(outcome.id);
  const group = outcome.groups.find((g) => g.slots.includes(meId));
  if (!group) return;
  const me = s.players.get(meId);
  const stats: RoundStats = {
    game: outcome.game,
    format: s.format,
    place: group.place,
    groupSize: group.slots.length,
    participants: outcome.groups.reduce((n, g) => n + g.slots.length, 0),
    won: group.place === 1,
    alive: !!me?.alive,
    lives: me?.lives ?? 0,
    style: hype.round.style,
    hitsDealt: hype.round.hitsDealt,
    knockouts: hype.round.knockouts,
    nearMisses: hype.round.nearMisses,
    cleanVaults: hype.round.cleanVaults,
    stonesPlaced: hype.round.stonesPlaced,
    waves: hype.round.waves,
    sections: hype.round.sections,
    finishSeconds: hype.round.finishSeconds,
    bestCombo: hype.round.bestCombo,
  };
  const { progress: next, summary } = applyRound(progress(), stats, outcome.id, new Date());
  saveProgress(next);
  hype.summary = summary;
  if (summary.levelAfter > summary.levelBefore) {
    announce(
      `LEVEL ${summary.levelAfter}!`,
      summary.unlocks.length ? `Unlocked: ${summary.unlocks.join(', ')}` : 'Street cred rising',
      'gold',
      true,
    );
    sound('fanfare');
  } else if (stats.won) sound('fanfare');
  changed();
}
function commitCup(s: any, meId: string) {
  if (s.format !== 'festival') return;
  const outcome: RoundOutcome | null = s.matchResults ? JSON.parse(s.matchResults) : null;
  if (!outcome || committed.has(outcome.id)) return;
  committed.add(outcome.id);
  if (outcome.groups[0]?.slots.includes(meId)) {
    const { progress: next, badge } = applyCupWin(progress());
    saveProgress(next);
    hype.cupBadge = badge ?? null;
    announce('FESTIVAL CHAMPION!', '+250 street XP', 'gold', true);
    sound('fanfare');
  }
}
