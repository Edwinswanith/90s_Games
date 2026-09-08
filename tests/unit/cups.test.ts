import { beforeAll, expect, it } from 'vitest';
import { MatchEngine } from '../../apps/server/src/match/MatchEngine';
import { PartyState, Player } from '../../packages/shared/src/state';
import { initPhysics, neutralInput } from '../../packages/simulation/src/physics';
import { CONTENT, FESTIVAL_ORDER } from '../../packages/shared/src/config';
beforeAll(initPhysics);
function fixture(format = 'festival') {
  const s = new PartyState({ format, order: JSON.stringify(FESTIVAL_ORDER) }),
    p = new Player({ slotId: 'human', name: 'Tester', ready: true });
  s.players.set(p.slotId, p);
  const engine = new MatchEngine(s);
  return { s, engine, p };
}
it('completes ten Festival Cups and ten Knockouts without duplicate awards or growing worlds', () => {
  for (const format of ['festival', 'knockout']) {
    const { s, p, engine } = fixture(format);
    const ids = new Set<string>();
    for (let match = 0; match < 10; match++) {
      p.ready = true;
      s.policy = match % 3 === 0 ? 'vote' : match % 3 === 1 ? 'shuffle' : 'host';
      s.firstRace = match % 2 ? 'paandi' : 'pachai-kuthirai';
      expect(engine.begin()).toBe('');
      expect(ids.has(s.matchId)).toBe(false);
      ids.add(s.matchId);
      for (let step = 0; step < 50000 && s.phase !== 'MATCH_RESULTS'; step++) {
        if (s.phase === 'LOADING') engine.contentReady(p.slotId, s.roundId, CONTENT);
        if (s.phase === 'VOTING') engine.vote(p.slotId, engine.queue.at(-1)!, s.matchId);
        const commands = new Map([
          [
            p.slotId,
            s.phase === 'PLAYING' && p.matchEligible ? engine.controller!.bot(p) : neutralInput(),
          ],
        ]);
        engine.update(commands);
      }
      expect(s.phase).toBe('MATCH_RESULTS');
      expect(engine.history).toHaveLength(format === 'festival' ? 5 : 3);
      expect(new Set(engine.history.map((h) => h.id)).size).toBe(engine.history.length);
      expect(engine.physics.bodies.size).toBe(8);
      if (format === 'festival') {
        expect(new Set(engine.history.map((h) => h.game)).size).toBe(5);
        expect([...s.players.values()].reduce((sum, p) => sum + p.score, 0)).toBe(1800);
        for (const h of engine.history)
          expect(h.groups.reduce((sum, g) => sum + g.slots.length * g.points, 0)).toBe(360);
        const before = p.score;
        engine.finishRound(engine.history.at(-1)!);
        expect(p.score).toBe(before);
      } else {
        expect(engine.history[1].groups.flatMap((g) => g.slots)).toHaveLength(
          engine.history[0].qualifiers.length,
        );
        expect(engine.history[2].groups.flatMap((g) => g.slots)).toHaveLength(
          engine.history[1].qualifiers.length,
        );
      }
      engine.returnToLobby();
      expect(s.players.size).toBe(1);
      expect(s.items.size).toBe(0);
      expect(engine.physics.bodies.size).toBe(1);
      expect(p.ready).toBe(false);
    }
    engine.dispose();
  }
}, 120000);
it('keeps one changeable vote and rejects late or stale match votes', () => {
  const { s, p, engine } = fixture();
  s.policy = 'vote';
  engine.begin();
  expect(s.phase).toBe('VOTING');
  expect(engine.vote(p.slotId, 'paandi', s.matchId)).toBe(true);
  engine.vote(p.slotId, 'eripandhu', s.matchId);
  expect(Object.values(JSON.parse(s.votes))).toEqual(['eripandhu']);
  expect(engine.vote(p.slotId, 'paandi', 'stale')).toBe(false);
  p.connected = false;
  engine.publishVotes();
  expect(s.votes).toBe('{}');
  s.tick = s.deadline;
  expect(engine.vote(p.slotId, 'paandi', s.matchId)).toBe(false);
  engine.dispose();
});
