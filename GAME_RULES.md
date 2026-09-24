# Game rules

These are digital adaptations, not claims of one universal traditional ruleset. The original master specification is retained in `docs/MASTER_SPECIFICATION.md`.

## Shared formats and results

- Single Game: 2–8 participants, except Seven Stones requires balanced teams of 4, 6 or 8 total. CPU fill supports practice.
- Festival: exactly eight logical participants return for all five games. Default order is Pachai Kuthirai → Kalla Manna → Paandi → Seven Stones → Eripandhu. Host ordering, one seeded shuffle, and ten-second vote-next are supported without repeats.
- Each connected human has one changeable vote. CPUs do not vote. Disconnected votes are excluded. Ties/empty votes choose among the tied/valid games using server randomness. One remaining game is selected directly.
- Festival individual points are 80,70,60,50,40,30,20,10. A tied group shares the average of occupied positions. Each round distributes 360; a complete Cup distributes 1,800.
- Seven Stones awards 65 per winning teammate, 25 per losing teammate, or 45 each for a draw in Festival.
- Knockout: selected Pachai Kuthirai or Paandi race → Kalla Manna → Eripandhu. Four and two qualifiers are targets. Complete boundary-tie groups advance; the next round accepts the actual count.
- Exact Cup-total ties share the title. A drawn final remains shared and offers the ordinary lobby/rematch flow. Names, join order and player IDs do not decide tied gameplay placements.

## Kalla Manna

The courtyard has 36 alternating stone/sand tiles. A call names the safe material; selected tiles receive cream borders and upward markers. Warning time decreases from about three seconds toward 1.8 seconds, reaching the floor by wave 9. CPUs sometimes hesitate on a call, more often as waves rise, so the courtyard thins out. Active hazards last two seconds, followed by a one-second recovery. Later calls may retain a reachable subset of the called material.

Standing or landing on an unsafe support during the active phase eliminates the player. Jumping can delay contact but cannot give continuing immunity. Going out of bounds eliminates. Resolve eliminations from the same tick together. Single/Festival ends with one survivor or at 75 s; survivors at the cap remain tied. Knockout ends at its qualification target or cap and retains complete boundary ties.

## Pachai Kuthirai

A roughly 100-unit street contains four ordered checkpoints and crouching NPC obstacles. Move and jump normally, or press Jump while approaching an eligible obstacle to attempt a collision-checked vault. A successful vault gives a temporary capped 10% speed bonus; bonuses do not accumulate.

The fork offers a longer safe route and a shorter difficult route. Falling returns to the last checkpoint. The server records ordered finish crossings once. The cap is 90 s; after the first finisher, remaining time is reduced to at most 25 s. Unfinished racers rank below finishers by validated route progress. Exact metrics remain tied.

## Eripandhu

Two lives each. Ball supply: one for 2–3 players, two for 4–5, three for 6–8. E/click picks up within 1.2 units. A second action throws at constant strength; mouse hold/release aims. Assistance is bounded to a small line-of-sight cone.

A ball travels at 11.5 units/s, up to 12 units, and damages once. Walls block it; jumping can avoid its capsule intersection. The owner cannot be hit by their own live ball. Throw recovery is 0.8 s. Possession expires after four seconds. A damaging hit stuns briefly and grants 1.25 s protection.

Resolve simultaneous hits together. After 90 s, a tied-survivor round gets at most 30 s sudden death: one hit eliminates and the marked rectangular boundary shrinks after a warning. At the final cap compare remaining lives, then valid hits dealt. Preserve exact ties/shared top placement.

## Seven Stones

Equal teams attack once each under mirrored scatter/spawn conditions. Festival uses 4v4. The scripted opening lasts one second; each attacking heat allows 90 s. Swap roles during a four-second briefing. Defenders receive one ball for 2v2/3v3 and two for 4v4.

Builders pick up one of seven uniquely identified stones. Carrying speed is 4.6 units/s. In the central circle, Action starts a 0.45 s placement. Leaving range, a hit, disconnect, or heat completion cancels placement. Hits cause a safe drop, brief stun and protection; they do not eliminate builders. Completed stack stones remain protected.

After both heats, more stacked stones wins. Equal positive counts compare the earlier time of final progress/completion. Equal zero progress is a draw. The team result awards once, after both heats.

## Paandi

Three short grids each require outward hopping, a marked-cell skip, a turnaround, adjacent marker retrieval on return, and a return to the start. Paired cells form one support group. The seed chooses the same marked group for every player; marker retrieval is personal progress.

The server checks takeoff support, landing support, ordered gate, direction and retrieval phase/range. Feet must land inside the chalk boundary, including a documented 0.12-unit tolerance. Walking across groups, skipped required groups, forbidden marker landings and invalid exits reset only the current section. Move along the safe side path between completed sections and to the final exit.

Use short steering taps for adjacent groups and a running approach for a longer marker skip. The actual shared controller completes all authored seed patterns in tests. The cap is 105 s, with the same 25 s post-first-finish grace as the race. Unfinished players rank by validated section/out-and-back progress.

## Recovery and fair play

CPUs use ordinary movement/action intentions, with reaction delays and bounded aiming/hopping error. They do not submit authoritative state. Cosmetics never change movement, lives, capsule dimensions or throw strength. Characters do not physically block each other.

A disconnected character remains vulnerable; input neutralizes and carried items drop. The 15-second reservation preserves the slot. CPU takeover does not revive an eliminated player. Final results wait for the host to return everyone to the lobby and create fresh match state.
