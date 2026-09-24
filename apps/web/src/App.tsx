import { tr, gameGuide } from './gameCopy';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { GAMES } from '../../../packages/shared/src/config';
import {
  session,
  subscribe,
  snapshot,
  connect,
  restore,
  controls,
  clearControls,
  physicsReady,
} from './network';
import { Scene, avatarColors, runtime, renderMetrics } from './Scene';
import styles from './App.module.css';
import { RoundUI } from './RoundUI';
import { Lobby } from './Lobby';
import { Diagnostics } from './Diagnostics';
import { TouchControls } from './TouchControls';
import { Settings } from './Settings';
import { usePreferences, preferences, savePreferences } from './preferences';
import { activateAudio, sound, disposeAudio, audioDiagnostics } from './audio';
import { t } from './i18n';
import { HypeBoundary, HypeHUD, ProfileChip, TrophyShelf, useProgress } from './HypeHUD';
import { HATS, levelFor, progress } from './progression';
import { hype } from './hype';
import hypeStyles from './Hype.module.css';
export default function App() {
  useSyncExternalStore(subscribe, snapshot);
  const prefs = usePreferences();
  const [creating, setCreating] = useState(false),
    [format, setFormat] = useState('festival'),
    [practiceGame, setPracticeGame] = useState('kalla-manna'),
    [boot, setBoot] = useState('Loading local fonts and physics…');
  const [name, setName] = useState(localStorage.getItem('theru.name') || 'Street star'),
    [cosmetic, setCosmetic] = useState(Number(localStorage.getItem('theru.cosmetic') || 0) % 6),
    [hat, setHat] = useState(Number(localStorage.getItem('theru.hat') || 0));
  const streetLevel = levelFor(useProgress().xp).level;
  // Headwear only applies once unlocked; the server receives colour + 6 x hat.
  const look = cosmetic + 6 * ((HATS[hat]?.level ?? 99) <= streetLevel ? hat : 0);
  const [page, setPage] = useState('play'),
    [code, setCode] = useState(new URLSearchParams(location.search).get('room') || ''),
    [join, setJoin] = useState(false),
    [menu, setMenu] = useState(false);
  const room = session.room,
    state = room?.state;
  useEffect(() => {
    void Promise.all([physicsReady, document.fonts.ready])
      .then(() => {
        setBoot('');
        void restore();
      })
      .catch(() =>
        setBoot('Local assets did not load. Reload this page after checking the installation.'),
      );
    savePreferences({});
    const audio = (event: Event) => {
      void activateAudio();
      if ((event.target as HTMLElement)?.closest('button,select,input')) sound('click');
    };
    window.addEventListener('pointerdown', audio);
    window.addEventListener('keydown', audio);
    return () => {
      window.removeEventListener('pointerdown', audio);
      window.removeEventListener('keydown', audio);
      disposeAudio();
    };
  }, []);
  useEffect(() => {
    localStorage.setItem('theru.name', name);
    localStorage.setItem('theru.cosmetic', String(cosmetic));
    localStorage.setItem('theru.hat', String(hat));
  }, [name, cosmetic, hat]);
  useEffect(() => {
    const keys = new Set<string>();
    function refresh() {
      controls.moveX =
        (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) -
        (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
      controls.moveZ =
        (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) -
        (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
      controls.jump = keys.has('Space');
      controls.action = keys.has('KeyE');
    }
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.matches('input,select,textarea')) return;
      if (e.code === 'Escape') {
        setMenu((m) => !m);
        keys.clear();
        clearControls();
        return;
      }
      if (e.code === 'KeyF') {
        if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
        else void document.documentElement.requestFullscreen().catch(() => {});
        return;
      }
      if (e.code === 'Space' && !e.repeat) controls.jumpPulse = true;
      if (e.code === 'KeyE') {
        if (!e.repeat) controls.actionPulse = true;
        const p = session.room?.state.players.get(session.room.sessionId);
        if (p) {
          controls.aimX = Math.sin(p.facing);
          controls.aimZ = Math.cos(p.facing);
        }
      }
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
        e.preventDefault();
      keys.add(e.code);
      refresh();
    };
    const up = (e: KeyboardEvent) => {
      keys.delete(e.code);
      refresh();
    };
    const blur = () => {
      keys.clear();
      clearControls();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);
  useEffect(() => {
    controls.blocked = menu;
    if (menu) clearControls();
  }, [menu]);
  useEffect(() => {
    if (!import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV_TOOLS !== 'true') return;
    (window as any).render_game_to_text = () =>
      JSON.stringify({
        phase: session.room?.state.phase || 'HOME',
        game: session.room?.state.selectedGame,
        tick: session.room?.state.tick,
        deadline: session.room?.state.deadline,
        format: session.room?.state.format,
        round: session.room?.state.roundNumber,
        match: session.room?.state.matchId,
        results: session.room?.state.results ? JSON.parse(session.room.state.results) : null,
        performance: renderMetrics,
        audio: audioDiagnostics,
        settings: preferences,
        coordinates: 'meters; x right, y up, z toward camera; player y is feet',
        room: session.room?.state.roomCode,
        me: session.room?.sessionId,
        players: session.room
          ? Array.from(session.room.state.players.values()).map((p) => ({
              id: p.slotId,
              name: p.name,
              x: p.x,
              y: p.y,
              z: p.z,
              alive: p.alive,
              ready: p.ready,
              score: p.score,
              cpu: p.cpu,
              lives: p.lives,
              item: p.item,
              mode: p.mode,
              checkpoint: p.checkpoint,
              gate: p.gate,
              section: p.section,
              team: p.team,
              grounded: p.grounded,
              vx: p.vx,
              vy: p.vy,
              vz: p.vz,
              progress: p.progress,
              returning: p.returning,
              markerRetrieved: p.markerRetrieved,
              qualified: p.qualified,
              matchEligible: p.matchEligible,
              notice: p.notice,
            }))
          : [],
        items: session.room
          ? [...session.room.state.items.values()].map((b) => ({
              id: b.id,
              x: b.x,
              z: b.z,
              status: b.status,
              owner: b.owner,
            }))
          : [],
        wavePhase: session.room?.state.wavePhase,
        safeTiles: session.room ? JSON.parse(session.room.state.safeTiles || '[]') : [],
        hype: {
          style: Math.round(hype.round.style),
          combo: hype.combo.count,
          bestCombo: hype.round.bestCombo,
          safety: hype.safety,
          banner: hype.banner?.title ?? '',
          rewardXp: hype.summary?.total ?? 0,
          progressXp: progress().xp,
        },
        prediction: runtime?.sim?.drift,
        inputBacklog: runtime?.input.pendingCount,
        processedInputs: runtime?.input.lastProcessed,
      });
    return () => {
      delete (window as any).render_game_to_text;
    };
  }, []);
  async function enter() {
    if (!join && !creating) {
      setCreating(true);
      return;
    }
    const r = await connect(name, look, join ? code : undefined);
    if (r) {
      if (!join) r.send('settings', { format, singleGame: practiceGame, botFill: true });
      setPage('play');
      setJoin(false);
      setCreating(false);
    }
  }
  return (
    <main className={styles.app}>
      <div className={styles.scene}>{!boot && <Scene cosmetic={look} />}</div>
      <header className={styles.header}>
        <button className={styles.brand} onClick={() => setPage('play')}>
          <span className={styles.brandIcon}>தெ</span>
          <span>
            THERU<span className={styles.brandSmall}>PARTY</span>
          </span>
        </button>
        <div className={styles.topline}>
          <span className={styles.onlineDot} /> LOCAL PLAY{' '}
          <span className={styles.topDivider}>/</span> CHENNAI, AFTER SCHOOL
        </div>
        <button
          className={styles.settingsButton}
          onClick={() => setMenu(true)}
          aria-label="Open settings"
        >
          ⚙
        </button>
      </header>
      {!room ? (
        <>
          <nav className={styles.rail}>
            {[
              ['play', '▶'],
              ['games', '▦'],
              ['wardrobe', '♧'],
              ['trophies', '★'],
              ['settings', '⚙'],
            ].map(([key, icon]) => (
              <button
                key={key}
                aria-label={
                  key === 'settings'
                    ? 'Settings'
                    : key === 'trophies'
                      ? 'Trophies'
                      : t(key as 'play' | 'games' | 'wardrobe')
                }
                className={page === key ? styles.activeRail : ''}
                onClick={() => (key === 'settings' ? setMenu(true) : setPage(key))}
              >
                <b>{icon}</b>
                <span>
                  {key === 'settings'
                    ? t('settings')
                    : key === 'trophies'
                      ? 'Trophies'
                      : t(key as 'play' | 'games' | 'wardrobe')}
                </span>
              </button>
            ))}
          </nav>
          {page === 'play' ? (
            <>
              <div className={styles.homeCaption}>
                <span className={styles.eyebrow}>OUR STREET. OUR GAMES.</span>
                <h1>
                  A little mischief.
                  <br />A lot of memories.
                </h1>
                <p>Five childhood games. One neighbourhood party.</p>
              </div>
              <section className={styles.homeCard}>
                <ProfileChip onOpen={() => setPage('trophies')} />
                <span className={styles.kicker}>வாங்க விளையாடலாம்</span>
                <h2>
                  {creating ? (
                    'Pick your party.'
                  ) : (
                    <>
                      Round up
                      <br />
                      your people.
                    </>
                  )}
                </h2>
                <p>
                  {creating
                    ? 'Choose a format. You can change it in the lobby.'
                    : 'The courtyard is open. Bring your friends or practise with CPUs.'}
                </p>
                <label className={styles.label}>
                  {t('name')}
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={64}
                    placeholder="Your street name"
                  />
                </label>
                {creating && !join && (
                  <div className={styles.modeCards}>
                    {[
                      ['festival', 'Festival Cup', 'All 5 games. Highest total wins.'],
                      ['knockout', 'Knockout Cup', 'Qualify through 3 rounds. Win the final.'],
                      ['single', 'Single Game', 'Choose one game to practise or compete.'],
                    ].map(([id, title, description]) => (
                      <button key={id} aria-pressed={format === id} onClick={() => setFormat(id)}>
                        <strong>{title}</strong>
                        <span>{description}</span>
                      </button>
                    ))}
                    {format === 'single' && (
                      <select
                        aria-label="Practice game"
                        value={practiceGame}
                        onChange={(e) => setPracticeGame(e.target.value)}
                      >
                        {Object.values(GAMES).map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.title}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
                {join && (
                  <label className={styles.label}>
                    PARTY CODE
                    <input
                      aria-label="Party code"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      maxLength={6}
                      placeholder="ABC123"
                    />
                  </label>
                )}
                <button className={styles.primary} onClick={enter} disabled={session.connecting}>
                  {session.connecting
                    ? 'Connecting…'
                    : join
                      ? 'Join this party →'
                      : creating
                        ? 'Open courtyard →'
                        : `${t('create')} →`}
                </button>
                <button
                  className={styles.secondary}
                  onClick={() => {
                    setJoin(!join);
                    setCreating(false);
                  }}
                >
                  {join ? 'Back to create' : t('join')}
                </button>
                {!join && !creating && (
                  <button
                    className={styles.textButton}
                    onClick={() => {
                      setCreating(true);
                      setFormat('single');
                    }}
                  >
                    {t('practice')}
                  </button>
                )}
                <div className={styles.cardFoot}>
                  <span>UP TO 8 PLAYERS</span>
                  <span>SAME WI-FI</span>
                </div>
              </section>
            </>
          ) : (
            <section
              className={`${styles.browserPanel} ${page === 'wardrobe' ? styles.wardrobePanel : ''}`}
            >
              <span className={styles.kicker}>
                {page === 'games'
                  ? 'THE NEIGHBOURHOOD PLAYLIST'
                  : page === 'trophies'
                    ? 'YOUR STREET RECORD'
                    : 'MAKE YOURSELF AT HOME'}
              </span>
              <h2>
                {page === 'games'
                  ? 'Small streets. Big games.'
                  : page === 'trophies'
                    ? 'Trophies & bests.'
                    : 'Pick your colours.'}
              </h2>
              {page === 'trophies' ? (
                <TrophyShelf />
              ) : page === 'games' ? (
                <div className={styles.gamesGrid}>
                  {Object.values(GAMES).map((g) => (
                    <article className={styles.gameCard} key={g.id}>
                      <img
                        className={styles.thumbnail}
                        src={`/thumbnails/${g.id}.webp`}
                        alt={`${g.title} courtyard`}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <span style={{ color: g.color }}>{g.category}</span>
                      <h3>{g.title}</h3>
                      <div>{g.tamil}</div>
                      <p>{prefs.language === 'ta' ? g.objectiveTa : g.objective}</p>
                      <small>
                        {tr(g.controls)} · {g.seconds}s max
                        {g.id === 'eripandhu' ? ' + 30s sudden death' : ''} ·{' '}
                        {g.id === 'seven-stones' ? '4 / 6 / 8' : '2–8'} players
                      </small>
                      <details>
                        <summary>{tr('How to play')}</summary>
                        <p>{gameGuide(g.id)}</p>
                        <small>Digital adaptation. Cup points follow shared placements.</small>
                      </details>
                      <button
                        className={styles.secondary}
                        onClick={() => {
                          setPage('play');
                          setCreating(true);
                          setFormat('single');
                          setPracticeGame(g.id);
                        }}
                      >
                        Practise {g.title}
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <>
                  <p>Every outfit has the same speed, jump and hitbox.</p>
                  <div className={styles.swatches}>
                    {avatarColors.map((color, i) => (
                      <button
                        key={color}
                        style={{ background: color }}
                        aria-label={`Outfit ${i + 1}`}
                        aria-pressed={i === cosmetic}
                        onClick={() => setCosmetic(i)}
                      >
                        {i === cosmetic ? '✓' : ''}
                      </button>
                    ))}
                  </div>
                  <p>Headwear unlocks as your street level rises. You are level {streetLevel}.</p>
                  <div className={hypeStyles.hats}>
                    {HATS.map((h) => (
                      <button
                        key={h.id}
                        aria-pressed={h.id === hat}
                        disabled={h.level > streetLevel}
                        onClick={() => setHat(h.id)}
                      >
                        {h.level > streetLevel ? `🔒 ${h.name} · LV ${h.level}` : h.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </section>
          )}
        </>
      ) : state?.phase !== 'LOBBY' ? (
        <RoundUI />
      ) : (
        <Lobby />
      )}
      {(session.error || state?.error) && (
        <div className={styles.toast} role="alert">
          {session.error || state?.error}
        </div>
      )}
      {session.dropped && <div className={styles.connection}>Reconnecting to your seat…</div>}
      <footer className={styles.footer}>
        <span>✦ MADE FOR AFTER-SCHOOL LEGENDS</span>
        <span>
          {room ? 'WASD MOVE   ·   SPACE JUMP   ·   ESC MENU' : 'A local multiplayer playground'}{' '}
          <span className={styles.version}>v0.1</span>
        </span>
      </footer>
      {room && state?.phase !== 'LOBBY' && (
        <HypeBoundary>
          <HypeHUD />
        </HypeBoundary>
      )}
      {room && state?.phase === 'PLAYING' && !menu && <TouchControls />}
      {menu && <Settings close={() => setMenu(false)} />}
      {boot && (
        <div className={styles.scrim}>
          <section className={styles.dialog}>
            <h2>Theru Party</h2>
            <p role="status">{boot}</p>
          </section>
        </div>
      )}
      <Diagnostics />
    </main>
  );
}
