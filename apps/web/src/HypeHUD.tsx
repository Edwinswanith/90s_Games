import { useEffect, useState, useSyncExternalStore } from 'react';
import { hype, useHype, comboMultiplier } from './hype';
import { BADGES, COMBO_WINDOW_SECONDS, levelFor, progress, subscribeProgress } from './progression';
import { session } from './network';
import styles from './Hype.module.css';
export function useProgress() {
  return useSyncExternalStore(subscribeProgress, progress);
}
// Re-renders a few times a second so timed overlays expire without extra state plumbing.
function useClock(ms = 150) {
  const [, set] = useState(0);
  useEffect(() => {
    const id = setInterval(() => set((n) => n + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
  return performance.now() / 1000;
}
export function HypeHUD() {
  useHype();
  const t = useClock();
  const s = session.room?.state;
  if (!s) return null;
  const playing = s.phase === 'PLAYING';
  const seconds = Math.max(0, Math.ceil((s.deadline - s.tick) / 60));
  const multiplier = comboMultiplier(t);
  const comboLeft = Math.max(0, hype.combo.expires - t);
  const me = s.players.get(session.room!.sessionId);
  const danger =
    playing &&
    !!me?.alive &&
    (s.suddenDeath || seconds <= 10 || (hype.safety === 'unsafe' && s.wavePhase !== 'recovery'));
  const banner =
    hype.banner && t - hype.banner.at < (hype.banner.big ? 1.9 : 1.5) ? hype.banner : null;
  const { level } = levelFor(progress().xp);
  return (
    <div className={styles.layer} aria-live="polite">
      {danger && <div className={styles.vignette} />}
      {t - hype.flash.at < 0.5 && (
        <div key={hype.flash.at} className={`${styles.flash} ${styles[hype.flash.tone]}`} />
      )}
      {banner && (
        <div
          key={banner.id}
          className={`${styles.banner} ${styles[banner.tone]} ${banner.big ? styles.bigBanner : ''}`}
        >
          <strong>{banner.title}</strong>
          {banner.sub && <span>{banner.sub}</span>}
        </div>
      )}
      <div className={styles.popups}>
        {hype.popups
          .filter((p) => t - p.at < 1.6)
          .map((p) => (
            <div key={p.id} className={`${styles.popup} ${styles[p.tone]}`}>
              <b>{p.text}</b>
              <span>
                +{p.xp} XP{p.multiplier > 1 ? ` · x${p.multiplier}` : ''}
              </span>
            </div>
          ))}
      </div>
      {playing && multiplier > 1 && (
        <div className={`${styles.combo} ${multiplier >= 5 ? styles.onFire : ''}`}>
          <strong>x{multiplier}</strong>
          <span>COMBO</span>
          <i style={{ width: `${(comboLeft / COMBO_WINDOW_SECONDS) * 100}%` }} />
        </div>
      )}
      {playing && (
        <div className={styles.styleMeter}>
          <span>LV {level}</span>
          <b>+{Math.round(hype.round.style)}</b>
          <small>STYLE XP</small>
        </div>
      )}
      {playing && s.selectedGame === 'kalla-manna' && hype.safety && me?.alive && (
        <div className={`${styles.safety} ${hype.safety === 'safe' ? styles.safe : styles.unsafe}`}>
          {hype.safety === 'safe' ? '✓ SAFE GROUND' : '✗ MOVE! WRONG SURFACE'}
        </div>
      )}
      <div className={styles.feed}>
        {hype.feed
          .filter((f) => t - f.at < 4)
          .map((f) => (
            <div key={f.id}>{f.text}</div>
          ))}
      </div>
    </div>
  );
}
// Post-round XP breakdown shown inside the results card.
export function RewardCard({ outcomeId }: { outcomeId: string }) {
  useHype();
  const summary = hype.summary;
  const [shown, setShown] = useState(0);
  const target = summary?.key === outcomeId ? summary.total : 0;
  useEffect(() => {
    if (!target) return;
    const start = performance.now();
    let frame = 0;
    const step = () => {
      const k = Math.min(1, (performance.now() - start) / 900);
      setShown(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target]);
  if (!summary || summary.key !== outcomeId) return null;
  const { level, into, need } = levelFor(summary.xpAfter);
  return (
    <div className={styles.reward}>
      <div className={styles.rewardHead}>
        <span>STREET XP</span>
        <strong>+{shown}</strong>
      </div>
      <ul>
        {summary.lines.map((l) => (
          <li key={l.label}>
            <span>{l.label}</span>
            <b>+{l.xp}</b>
          </li>
        ))}
      </ul>
      <div className={styles.levelBar}>
        <span>
          LV {level}
          {summary.levelAfter > summary.levelBefore && <em> LEVEL UP!</em>}
        </span>
        <i>
          <u style={{ width: `${(into / need) * 100}%` }} />
        </i>
        <small>
          {into} / {need}
        </small>
      </div>
      {summary.dayStreak > 1 && <div className={styles.chip}>☀ {summary.dayStreak}-day streak</div>}
      {summary.newBests.map((b) => (
        <div key={b} className={styles.chip}>
          ▲ New personal best · {b}
        </div>
      ))}
      {summary.unlocks.map((u) => (
        <div key={u} className={`${styles.chip} ${styles.unlock}`}>
          ✦ Unlocked in Wardrobe · {u}
        </div>
      ))}
      {summary.newBadges.map((b) => (
        <div key={b.id} className={`${styles.chip} ${styles.badgeChip}`}>
          {b.icon} Badge earned · {b.title}
        </div>
      ))}
    </div>
  );
}
// Home-screen profile: level, XP progress, streak and badge count.
export function ProfileChip({ onOpen }: { onOpen: () => void }) {
  const p = useProgress();
  const { level, into, need } = levelFor(p.xp);
  return (
    <button className={styles.profile} onClick={onOpen} aria-label="Open trophies">
      <b>{level}</b>
      <span>
        <strong>STREET LEVEL {level}</strong>
        <i>
          <u style={{ width: `${(into / need) * 100}%` }} />
        </i>
        <small>
          {p.dayStreak > 0 ? `☀ ${p.dayStreak}-day streak · ` : ''}
          {p.badges.length}/{BADGES.length} badges · {p.wins} wins
        </small>
      </span>
    </button>
  );
}
export function TrophyShelf() {
  const p = useProgress();
  const { level, into, need } = levelFor(p.xp);
  const bests: [string, string][] = [
    ['kalla-waves', 'Kalla Manna waves'],
    ['race-time', 'Pachai Kuthirai time'],
    ['eri-hits', 'Eripandhu hits'],
    ['stones', 'Stones placed'],
    ['paandi-time', 'Paandi time'],
  ];
  return (
    <div className={styles.shelf}>
      <div className={styles.shelfStats}>
        <div>
          <b>{level}</b>
          <span>Level</span>
          <small>
            {into}/{need} XP
          </small>
        </div>
        <div>
          <b>{p.wins}</b>
          <span>Round wins</span>
        </div>
        <div>
          <b>{p.podiums}</b>
          <span>Podiums</span>
        </div>
        <div>
          <b>x{p.bestCombo || 1}</b>
          <span>Best combo</span>
        </div>
        <div>
          <b>{p.dayStreak}</b>
          <span>Day streak</span>
        </div>
      </div>
      <h3>Badges</h3>
      <div className={styles.badges}>
        {BADGES.map((b) => {
          const earned = p.badges.includes(b.id);
          return (
            <div key={b.id} className={earned ? styles.earned : styles.locked}>
              <b>{earned ? b.icon : '?'}</b>
              <strong>{b.title}</strong>
              <span>{b.detail}</span>
            </div>
          );
        })}
      </div>
      <h3>Personal bests</h3>
      <div className={styles.bests}>
        {bests.map(([key, label]) => (
          <div key={key}>
            <span>{label}</span>
            <b>
              {p.bests[key] === undefined
                ? '—'
                : key.endsWith('time')
                  ? `${p.bests[key].toFixed(2)}s`
                  : p.bests[key]}
            </b>
          </div>
        ))}
      </div>
    </div>
  );
}
