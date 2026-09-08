import type { Player, RoundOutcome } from './state';
export function makeOutcome(
  id: string,
  game: string,
  players: Player[],
  metrics: (p: Player) => number[],
  reason: string,
  target = 0,
): RoundOutcome {
  const compare = (a: Player, b: Player) => {
    const x = metrics(a),
      y = metrics(b);
    for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return y[i] - x[i];
    return 0;
  };
  const sorted = [...players].sort(compare),
    groups: RoundOutcome['groups'] = [];
  for (const p of sorted) {
    const previous = groups.at(-1);
    const previousPlayer = previous
      ? players.find((x) => x.slotId === previous.slots[0])
      : undefined;
    if (previous && previousPlayer && compare(p, previousPlayer) === 0)
      previous.slots.push(p.slotId);
    else groups.push({ slots: [p.slotId], place: 0, points: 0, metric: metrics(p).join(' / ') });
  }
  let place = 1;
  const qualifiers: string[] = [];
  for (const g of groups) {
    g.place = place;
    g.points = 90 - 10 * (place + (g.slots.length - 1) / 2);
    if (target && qualifiers.length < target) qualifiers.push(...g.slots);
    place += g.slots.length;
  }
  return { id, game, groups, qualifiers, reason, draw: (groups[0]?.slots.length ?? 0) > 1 };
}
