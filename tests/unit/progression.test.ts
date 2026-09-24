import { describe, expect, it } from 'vitest';
import {
  applyCupWin,
  applyRound,
  emptyProgress,
  levelFor,
  multiplierFor,
  nextStreak,
  xpToNext,
  STYLE_CAP,
  type RoundStats,
} from '../../apps/web/src/progression';
const base: RoundStats = {
  game: 'kalla-manna',
  format: 'single',
  place: 4,
  groupSize: 1,
  participants: 8,
  won: false,
  alive: false,
  lives: 0,
  style: 0,
  hitsDealt: 0,
  knockouts: 0,
  nearMisses: 0,
  cleanVaults: 0,
  stonesPlaced: 0,
  waves: 0,
  sections: 0,
  finishSeconds: 0,
  bestCombo: 1,
};
const day = new Date(2026, 8, 24, 18);
describe('street progression', () => {
  it('levels follow a rising XP curve', () => {
    expect(levelFor(0)).toEqual({ level: 1, into: 0, need: 120 });
    expect(levelFor(xpToNext(1)).level).toBe(2);
    expect(levelFor(xpToNext(1) + xpToNext(2) - 1)).toMatchObject({ level: 2 });
    expect(xpToNext(3)).toBeGreaterThan(xpToNext(2));
  });
  it('caps the combo multiplier', () => {
    expect(multiplierFor(0)).toBe(1);
    expect(multiplierFor(3)).toBe(3);
    expect(multiplierFor(12)).toBe(5);
  });
  it('rewards placement, wins and style, with a first-round-of-the-day bonus', () => {
    const last = applyRound(emptyProgress(), { ...base, place: 8 }, 'r1', day).summary;
    const win = applyRound(
      emptyProgress(),
      { ...base, place: 1, won: true, style: 90 },
      'r2',
      day,
    ).summary;
    expect(win.total).toBeGreaterThan(last.total);
    expect(win.lines.map((l) => l.label)).toContain('Style & combos');
    expect(last.lines.some((l) => l.label.startsWith('First round today'))).toBe(true);
    const again = applyRound(applyRound(emptyProgress(), base, 'a', day).progress, base, 'b', day);
    expect(again.summary.lines.some((l) => l.label.startsWith('First round today'))).toBe(false);
  });
  it('caps style XP so one hot round cannot skip the unlock curve', () => {
    const { summary } = applyRound(emptyProgress(), { ...base, style: 5000 }, 's', day);
    expect(summary.lines.find((l) => l.label === 'Style & combos')?.xp).toBe(STYLE_CAP);
    expect(summary.levelAfter).toBeLessThanOrEqual(3);
  });
  it('tracks daily streaks across consecutive days and resets after a gap', () => {
    expect(nextStreak('2026-09-23', 2, day)).toEqual({ streak: 3, first: true });
    expect(nextStreak('2026-09-24', 3, day)).toEqual({ streak: 3, first: false });
    expect(nextStreak('2026-09-20', 5, day)).toEqual({ streak: 1, first: true });
  });
  it('unlocks badges once and records personal bests', () => {
    const first = applyRound(
      emptyProgress(),
      { ...base, game: 'eripandhu', place: 1, won: true, lives: 2, hitsDealt: 3 },
      'e1',
      day,
    );
    const ids = first.summary.newBadges.map((b) => b.id);
    expect(ids).toEqual(expect.arrayContaining(['first-win', 'untouchable', 'sniper']));
    expect(first.progress.bests['eri-hits']).toBe(3);
    const second = applyRound(
      first.progress,
      { ...base, game: 'eripandhu', place: 1, won: true, lives: 2, hitsDealt: 5 },
      'e2',
      day,
    );
    expect(second.summary.newBadges.map((b) => b.id)).not.toContain('sniper');
    expect(second.summary.newBests).toEqual(['Most Eripandhu hits']);
    const race = applyRound(
      emptyProgress(),
      { ...base, game: 'pachai-kuthirai', finishSeconds: 40 },
      'p1',
      day,
    );
    const faster = applyRound(
      race.progress,
      { ...base, game: 'pachai-kuthirai', finishSeconds: 38.5 },
      'p2',
      day,
    );
    const unfinished = applyRound(
      faster.progress,
      { ...base, game: 'pachai-kuthirai', finishSeconds: 0 },
      'p3',
      day,
    );
    expect(unfinished.progress.bests['race-time']).toBe(38.5);
  });
  it('reports headwear unlocked by a level-up', () => {
    const { summary } = applyRound(
      { ...emptyProgress(), xp: 110 },
      { ...base, place: 1, won: true },
      'x',
      day,
    );
    expect(summary.levelAfter).toBeGreaterThan(summary.levelBefore);
    expect(summary.unlocks).toContain('Cricket cap');
  });
  it('grants the Festival badge only once', () => {
    const once = applyCupWin(emptyProgress());
    expect(once.badge?.id).toBe('festival');
    const twice = applyCupWin(once.progress);
    expect(twice.badge).toBeUndefined();
    expect(twice.progress.xp).toBe(500);
  });
});
