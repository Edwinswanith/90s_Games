import { tr } from './gameCopy';
import { useState } from 'react';
import { GAMES, type GameId } from '../../../packages/shared/src/config';
import type { RoundOutcome } from '../../../packages/shared/src/state';
import { session, leave } from './network';
import { preferences } from './preferences';
import styles from './App.module.css';
export let spectatorId = '';
export function RoundUI() {
  const [follow, setFollow] = useState(0);
  const room = session.room!,
    s = room.state,
    me = s.players.get(room.sessionId),
    game = GAMES[s.selectedGame as GameId];
  const active = [...s.players.values()].filter((p) => p.alive && !p.qualified);
  const spectating = !me?.alive || me.qualified;
  spectatorId = spectating ? (active[follow % Math.max(1, active.length)]?.slotId ?? '') : '';
  const remaining = Math.max(0, Math.ceil((s.deadline - s.tick) / 60));
  if (s.phase === 'VOTING') {
    const remainingGames: GameId[] = JSON.parse(s.remaining),
      votes: Record<string, string> = JSON.parse(s.votes || '{}');
    return (
      <div className={styles.roundIntro}>
        <section className={styles.introCard}>
          <span className={styles.kicker}>
            {tr('CHOOSE THE NEXT COURTYARD')} · {remaining}s
          </span>
          <h2>{tr('What shall we play?')}</h2>
          <p>{tr('You can change your vote until the timer ends.')}</p>
          <div className={styles.voteGrid}>
            {remainingGames.map((id) => (
              <button
                key={id}
                aria-pressed={votes[room.sessionId] === id}
                onClick={() => room.send('vote', { game: id, match: s.matchId })}
              >
                <strong>{GAMES[id].title}</strong>
                <span>
                  {Object.values(votes).filter((v) => v === id).length} {tr('votes')}
                </span>
              </button>
            ))}
          </div>
          <small>{tr('Ties and empty votes use a server-seeded choice.')}</small>
        </section>
      </div>
    );
  }
  if (['ROUND_SELECTED', 'LOADING', 'BRIEFING', 'COUNTDOWN'].includes(s.phase))
    return (
      <div className={styles.roundIntro}>
        <div className={styles.introCard}>
          <span className={styles.kicker}>
            {s.phase === 'LOADING'
              ? tr('PREPARING THE COURTYARD')
              : `${tr('ROUND')} ${s.roundNumber} · ${tr(game.category)}`}
          </span>
          <h2>{game.title}</h2>
          <h3>{game.tamil}</h3>
          <p>{preferences.language === 'ta' ? game.objectiveTa : game.objective}</p>
          <div className={styles.controlHints}>{tr(game.controls)}</div>
          <strong className={styles.countdown}>
            {s.phase === 'COUNTDOWN'
              ? remaining
              : s.phase === 'LOADING'
                ? tr('Loading…')
                : s.phase === 'ROUND_SELECTED'
                  ? tr('Up next')
                  : tr('Get ready')}
          </strong>
          <small>
            {tr('Digital adaptation')} ·{' '}
            {s.format === 'festival'
              ? tr('You return in every round.')
              : s.format === 'knockout'
                ? tr('Target {count} qualifiers', { count: s.target })
                : tr('Play for the best round result.')}
          </small>
        </div>
      </div>
    );
  if (s.phase === 'ROUND_RESULTS' || s.phase === 'MATCH_RESULTS') {
    const outcome: RoundOutcome = JSON.parse(
      (s.phase === 'MATCH_RESULTS' ? s.matchResults : s.results) || '{}',
    );
    return (
      <div
        className={`${styles.roundIntro} ${s.phase === 'MATCH_RESULTS' ? styles.finalStage : ''}`}
      >
        <section className={styles.resultsCard}>
          <span className={styles.kicker}>
            {s.phase === 'MATCH_RESULTS' ? tr('THE STREET HAS SPOKEN') : tr('ROUND COMPLETE')}
          </span>
          <h2>{outcome.draw ? tr('A shared celebration!') : tr('Nicely played!')}</h2>
          <p>{tr(outcome.reason)}</p>
          {s.phase === 'ROUND_RESULTS' && s.target > 0 && (
            <p>
              {outcome.qualifiers.length > s.target
                ? tr('Tied for the last spot: the whole group advances.')
                : tr('{count} players advance.', { count: outcome.qualifiers.length })}
            </p>
          )}
          {outcome.heats && (
            <div className={styles.heatSummary}>
              {outcome.heats.map((h) => (
                <div key={h.team}>
                  {h.team === 0 ? tr('◆ Ocean') : tr('▲ Mango')} · {h.count}/7 {tr('stones')} ·{' '}
                  {h.count ? (h.tick / 60).toFixed(2) + 's' : tr('No progress')}
                </div>
              ))}
            </div>
          )}
          <div className={styles.resultRows}>
            {outcome.groups?.flatMap((g) =>
              g.slots.map((id) => (
                <div key={id} className={id === room.sessionId ? styles.yourResult : ''}>
                  <b>{g.place === 1 ? '★' : g.place}</b>
                  <span>
                    {s.players.get(id)?.name}
                    {s.players.get(id)?.cpu ? ' · CPU' : ''}
                  </span>
                  <strong>
                    {s.format === 'festival'
                      ? s.phase === 'MATCH_RESULTS'
                        ? `${s.players.get(id)?.score} pts`
                        : `+${g.points}`
                      : g.slots.length > 1
                        ? tr('TIED')
                        : `#${g.place}`}
                  </strong>
                </div>
              )),
            )}
          </div>
          {s.phase === 'MATCH_RESULTS' && s.format === 'festival' && (
            <details>
              <summary>{tr('Round-by-round points')}</summary>
              <div className={styles.breakdown}>
                <table>
                  <thead>
                    <tr>
                      <th>{tr('Player')}</th>
                      {(JSON.parse(s.history) as RoundOutcome[]).map((r) => (
                        <th key={r.id}>{GAMES[r.game as GameId].title}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...s.players.values()].map((p) => (
                      <tr key={p.slotId}>
                        <td>{p.name}</td>
                        {(JSON.parse(s.history) as RoundOutcome[]).map((r) => (
                          <td key={r.id}>
                            {r.groups.find((g) => g.slots.includes(p.slotId))?.points}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
          {s.phase === 'MATCH_RESULTS' ? (
            <>
              <button
                className={styles.primary}
                disabled={s.host !== room.sessionId}
                onClick={() => room.send('lobby')}
              >
                {s.host === room.sessionId
                  ? tr('Back to lobby · play again')
                  : tr('Waiting for the host')}
              </button>
              <button className={styles.textButton} onClick={() => void leave()}>
                {tr('Leave party')}
              </button>
            </>
          ) : (
            <small>{tr('Next screen in {count}s', { count: remaining })}</small>
          )}
        </section>
      </div>
    );
  }
  return (
    <>
      <div className={styles.gameLabel}>
        <span>
          {tr(game.category)} · {tr('ROUND')} {s.roundNumber}
        </span>
        <h2>{preferences.language === 'ta' ? game.tamil : game.title}</h2>
        <p>{preferences.language === 'ta' ? game.objectiveTa : game.objective}</p>
      </div>
      <div className={styles.timer}>
        {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
      </div>
      <div className={styles.aliveBadge}>
        {active.length} {tr('IN PLAY')}
        {s.target > 0 && <small>{tr('Target {count} qualifiers', { count: s.target })}</small>}
      </div>
      {s.selectedGame === 'kalla-manna' && (
        <div
          className={`${styles.surfaceCall} ${s.wavePhase === 'active' ? styles.dangerCall : ''}`}
        >
          <span>
            {s.wavePhase === 'recovery'
              ? tr('TAKE A BREATH')
              : s.wavePhase === 'warning'
                ? tr('REACH THE HIGHLIGHTED TILES')
                : tr('STAY SAFE')}
          </span>
          <strong>
            {s.wavePhase === 'recovery'
              ? tr('Next call soon')
              : s.safe === 'stone'
                ? tr('◆ STONE')
                : tr('● SAND')}
          </strong>
          <b>{Math.max(0, Math.ceil((s.waveDeadline - s.tick) / 60))}</b>
          <small>
            {tr('WAVE')} {s.wave}
          </small>
        </div>
      )}
      {s.selectedGame === 'eripandhu' && (
        <div className={styles.actionStatus}>
          <strong>
            {'●'.repeat(me?.lives ?? 0)}
            {'○'.repeat(Math.max(0, 2 - (me?.lives ?? 0)))}
          </strong>
          <span>
            {s.suddenDeath
              ? tr('SUDDEN DEATH · ONE HIT')
              : me?.item
                ? tr('HOLD MOUSE TO AIM · RELEASE TO THROW')
                : tr('E / CLICK NEAR A BALL TO PICK UP')}
          </span>
          {me && me.protectionUntil > s.tick && <b>{tr('PROTECTED')}</b>}
        </div>
      )}
      {s.selectedGame === 'pachai-kuthirai' && (
        <div className={styles.actionStatus}>
          <strong>{me?.checkpoint ?? 0} / 4</strong>
          <span>{tr('CHECKPOINTS · SPACE NEAR AN NPC TO VAULT')}</span>
        </div>
      )}
      {s.selectedGame === 'seven-stones' && (
        <>
          <div className={styles.surfaceCall}>
            <span>
              {tr('HEAT {count} OF 2', { count: s.heat })} ·{' '}
              {s.heatPhase === 'swap'
                ? tr('SWAP ROLES')
                : s.heatPhase === 'knockdown'
                  ? tr('SCRIPTED KNOCKDOWN')
                  : me?.team === s.builderTeam
                    ? tr('YOU ARE A BUILDER')
                    : tr('YOU ARE A DEFENDER')}
            </span>
            <strong>{s.stacked} / 7</strong>
            <small>{me?.team === 0 ? tr('◆ OCEAN TEAM') : tr('▲ MANGO TEAM')}</small>
          </div>
          <div className={styles.actionStatus}>
            <strong>{me?.item.startsWith('stone') ? '▰' : me?.item ? '●' : 'E'}</strong>
            <span>
              {me?.team === s.builderTeam
                ? me.item
                  ? tr('BRING YOUR STONE TO THE STACK · E TO PLACE')
                  : tr('PICK UP A STONE WITH E')
                : tr('PICK UP A BALL · AIM AND THROW')}
            </span>
          </div>
        </>
      )}
      {s.selectedGame === 'paandi' && (
        <div className={styles.actionStatus}>
          <strong>{Math.min(3, (me?.section ?? 0) + 1)} / 3</strong>
          <span>
            {me?.section === 3
              ? tr('FOLLOW THE SIDE PATH TO FINISH')
              : me?.returning
                ? tr('RETURN · NEXT {gate} · {marker}', {
                    gate: me.gate,
                    marker: me.markerRetrieved
                      ? tr('MARKER RETRIEVED')
                      : tr('E BESIDE THE MARKER TO RETRIEVE'),
                  })
                : tr('OUTWARD · NEXT {gate} · SKIP THE MARKER', { gate: me?.gate || tr('START') })}
          </span>
          <small>{tr('Land your feet inside the chalk edge · 12 cm tolerance')}</small>
        </div>
      )}
      {me?.notice && <div className={styles.notice}>{tr(me.notice)}</div>}
      {spectating && (
        <div className={styles.spectator}>
          <span>
            {s.format === 'festival'
              ? tr('You return next round.')
              : s.format === 'knockout'
                ? tr('Out of this match.')
                : tr('Watching the rest of the round.')}
          </span>
          <button
            aria-label="Previous spectator"
            onClick={() =>
              setFollow((f) => (f + Math.max(1, active.length) - 1) % Math.max(1, active.length))
            }
          >
            ←
          </button>
          <button onClick={() => setFollow((f) => f + 1)}>
            {tr('Following {name} · Next →', {
              name: active[follow % Math.max(1, active.length)]?.name || tr('the courtyard'),
            })}
          </button>
        </div>
      )}
    </>
  );
}
