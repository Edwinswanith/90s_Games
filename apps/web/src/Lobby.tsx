import { useState } from 'react';
import {
  GAMES,
  GAME_IDS,
  FESTIVAL_ORDER,
  DIFFICULTIES,
  DIFFICULTY_INFO,
  type Difficulty,
  type GameId,
} from '../../../packages/shared/src/config';
import { rosterError } from '../../../packages/shared/src/validation';
import { session, leave } from './network';
import { avatarColors } from './Scene';
import { t } from './i18n';
import styles from './App.module.css';
export const availableGames: GameId[] = [...GAME_IDS];
export function Lobby() {
  const [tab, setTab] = useState('Players'),
    [invite, setInvite] = useState(''),
    [swap, setSwap] = useState<number | null>(null);
  const room = session.room!,
    s = room.state,
    me = s.players.get(room.sessionId),
    host = s.host === room.sessionId;
  const humans = [...s.players.values()].filter((p) => !p.cpu && p.connected),
    players = [...s.players.values()],
    teams: number[] = JSON.parse(s.teamOrder || '[]'),
    order: GameId[] = JSON.parse(s.order || JSON.stringify(FESTIVAL_ORDER));
  const blocked =
    rosterError(s.format, s.singleGame, s.slots, humans.length, s.botFill) ||
    ([...s.players.values()].some((p) => !p.cpu && !p.connected)
      ? 'A player is reconnecting.'
      : '') ||
    (humans.some((p) => !p.ready) ? 'Everyone, including the host, must be ready.' : '');
  const change = (patch: Record<string, unknown>) => room.send('settings', patch);
  function reorder(index: number, delta: number) {
    const next = [...order];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    change({ order: next });
  }
  async function share() {
    const link = `${location.origin}/?room=${s.roomCode}`;
    try {
      await navigator.clipboard.writeText(link);
      setInvite(
        ['localhost', '127.0.0.1'].includes(location.hostname)
          ? 'Copied. Use the printed LAN address for another device.'
          : 'Invite copied.',
      );
    } catch {
      setInvite(link);
    }
  }
  const teamGame = s.format === 'festival' || s.singleGame === 'seven-stones';
  return (
    <>
      <div className={styles.roomBadge}>
        <span>YOUR PARTY</span>
        <strong>{s.roomCode}</strong>
        <button onClick={() => void share()} aria-label="Copy invitation">
          ↗
        </button>
        {invite && <small>{invite}</small>}
      </div>
      <section className={styles.lobbyCard}>
        <span className={styles.kicker}>THE GANG IS GETTING TOGETHER</span>
        <h2>Meet in the courtyard.</h2>
        <p>Try WASD and Space while your friends join.</p>
        <div className={styles.tabs}>
          {['Players', 'Rounds', 'Rules'].map((t) => (
            <button key={t} aria-selected={tab === t} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>
        {tab === 'Players' ? (
          <>
            <div className={styles.roster}>
              {Array.from({ length: s.slots }, (_, i) => {
                const p = players[i];
                return (
                  <div key={i} className={styles.playerRow}>
                    <span
                      className={styles.avatarDot}
                      style={{ background: p ? avatarColors[p.cosmetic % 6] : '#C7D3EF' }}
                    >
                      {p ? i + 1 : '+'}
                    </span>
                    <span>
                      {p?.name || (s.botFill ? 'CPU fill' : 'Open spot')}
                      <small>
                        {p
                          ? p.cpu
                            ? 'CPU'
                            : p.slotId === s.host
                              ? 'HOST'
                              : 'PLAYER'
                          : s.botFill
                            ? 'A CPU joins when you start'
                            : 'Invite a friend'}
                      </small>
                    </span>
                    {teamGame && (
                      <button
                        className={styles.teamButton}
                        disabled={!host}
                        aria-label={`Swap team seat ${i + 1}`}
                        aria-pressed={swap === i}
                        onClick={() => {
                          if (swap === null) setSwap(i);
                          else {
                            room.send('team-swap', { a: swap, b: i });
                            setSwap(null);
                          }
                        }}
                      >
                        {teams[i] === 0 ? '◆' : '▲'}
                      </button>
                    )}
                    {host && p && !p.cpu && p.slotId !== s.host && (
                      <button
                        className={styles.removeButton}
                        aria-label={`Remove ${p.name}`}
                        onClick={() => room.send('kick', p.slotId)}
                      >
                        ×
                      </button>
                    )}
                    <b>{p ? (p.ready ? 'READY' : p.connected ? 'HERE' : 'AWAY') : ''}</b>
                  </div>
                );
              })}
            </div>
            {teamGame && (
              <small>◆ Ocean · ▲ Mango. {host ? 'Choose two seats to swap teams.' : ''}</small>
            )}
          </>
        ) : tab === 'Rounds' ? (
          <div className={styles.roomFields}>
            <label className={styles.label}>
              FORMAT
              <select
                aria-label="Format"
                value={s.format}
                disabled={!host}
                onChange={(e) => change({ format: e.target.value })}
              >
                <option value="festival">Festival Cup · all five games</option>
                <option value="knockout">Knockout Cup · three rounds</option>
                <option value="single">Single Game · practise</option>
              </select>
            </label>
            {s.format === 'single' ? (
              <>
                <label className={styles.label}>
                  GAME
                  <select
                    aria-label="Game"
                    value={s.singleGame}
                    disabled={!host}
                    onChange={(e) => change({ singleGame: e.target.value })}
                  >
                    {availableGames.map((id) => (
                      <option key={id} value={id}>
                        {GAMES[id].title}
                      </option>
                    ))}
                  </select>
                </label>
                <p>{GAMES[s.singleGame as GameId].objective}</p>
                <small>{GAMES[s.singleGame as GameId].controls}</small>
                <label className={styles.label}>
                  PARTICIPANTS
                  <select
                    aria-label="Participants"
                    value={s.slots}
                    disabled={!host}
                    onChange={(e) => change({ slots: Number(e.target.value) })}
                  >
                    {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                </label>
              </>
            ) : s.format === 'festival' ? (
              <>
                <label className={styles.label}>
                  ROUND SELECTION
                  <select
                    aria-label="Round selection"
                    disabled={!host}
                    value={s.policy}
                    onChange={(e) => change({ policy: e.target.value })}
                  >
                    <option value="host">Host order</option>
                    <option value="shuffle">Server shuffle</option>
                    <option value="vote">Vote for the next game</option>
                  </select>
                </label>
                {s.policy === 'host' ? (
                  <div className={styles.orderList}>
                    {order.map((id, i) => (
                      <div key={id}>
                        <span>
                          {i + 1}. {GAMES[id].title}
                        </span>
                        <button
                          disabled={!host || i === 0}
                          aria-label={`Move ${GAMES[id].title} up`}
                          onClick={() => reorder(i, -1)}
                        >
                          ↑
                        </button>
                        <button
                          disabled={!host || i === 4}
                          aria-label={`Move ${GAMES[id].title} down`}
                          onClick={() => reorder(i, 1)}
                        >
                          ↓
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>
                    {s.policy === 'vote'
                      ? 'One vote per connected human. Change it during the ten-second vote. Tied votes use a server-seeded choice.'
                      : 'The server shuffles all five games once. Every game appears once.'}
                  </p>
                )}
                <small>Eight participants return each round. Highest total wins.</small>
              </>
            ) : (
              <>
                <label className={styles.label}>
                  FIRST RACE
                  <select
                    aria-label="First race"
                    value={s.firstRace}
                    disabled={!host}
                    onChange={(e) => change({ firstRace: e.target.value })}
                  >
                    <option value="pachai-kuthirai">Pachai Kuthirai</option>
                    <option value="paandi">Paandi</option>
                  </select>
                </label>
                <p>Race → Kalla Manna → Eripandhu</p>
                <small>
                  Targets: four, then two. Tied boundary groups advance together. Seven Stones needs
                  balanced teams and is available in Single Game and Festival Cup.
                </small>
              </>
            )}
            <label className={styles.checkLabel}>
              <input
                type="checkbox"
                checked={s.botFill}
                disabled={!host}
                onChange={(e) => change({ botFill: e.target.checked })}
              />{' '}
              Fill empty places with CPUs
            </label>
            <label className={styles.label}>
              CPU SKILL
              <select
                aria-label="CPU skill"
                value={s.difficulty}
                disabled={!host}
                onChange={(e) => change({ difficulty: e.target.value })}
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {DIFFICULTY_INFO[d].label} · XP x{DIFFICULTY_INFO[d].xp}
                  </option>
                ))}
              </select>
              <small>{DIFFICULTY_INFO[s.difficulty as Difficulty]?.detail}</small>
            </label>
          </div>
        ) : (
          <div className={styles.roomFields}>
            <h3>Same rules for everyone.</h3>
            <p>CPUs use the same movement and actions. Outfits do not change speed or hitboxes.</p>
            <p>
              A disconnected player has 15 seconds to return. Their character remains vulnerable.
            </p>
            <p>
              Shared placements stay tied. Festival points are 80 to 10; tied groups share the
              average. Seven Stones awards 65 / 25, or 45 each for a draw.
            </p>
            <small>
              {s.format.toUpperCase()} · {s.slots} participants ·{' '}
              {s.botFill
                ? `CPU fill on · ${DIFFICULTY_INFO[s.difficulty as Difficulty]?.label ?? 'Street'} skill`
                : 'Humans only'}
            </small>
          </div>
        )}
        <button className={styles.primary} onClick={() => room.send('ready', !me?.ready)}>
          {me?.ready ? '✓ You are ready' : t('ready')}
        </button>
        {host && (
          <>
            <button
              className={styles.secondary}
              disabled={!!blocked}
              onClick={() => room.send('start')}
            >
              {t('start')}
            </button>
            {blocked && <small className={styles.startReason}>{blocked}</small>}
          </>
        )}
        <button className={styles.textButton} onClick={() => void leave()}>
          Leave party
        </button>
      </section>
    </>
  );
}
