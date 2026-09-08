# Desktop test report

Executed on **2026-09-08**, Apple M1 / 8 GB RAM / macOS 14.5, project Node 24.20.0. Browser automation uses the installed Google Chrome channel, with separate contexts where specified. A context is an independent client/session, not another physical device.

## Executed evidence

| Layer | Result | Scope / artifact |
|---|---|---|
| Strict TypeScript | Passed | `pnpm typecheck` |
| ESLint | Passed | `pnpm lint` |
| Unit/rule/soak suite | **31 tests passed, 9 files** | `artifacts/unit-results.json`; movement, gates, ownership, timers, ties, score conservation, obstructed vaults, repeated finishes, placement interruption and lifecycle |
| SDK integration | **6 tests passed** | `artifacts/integration-results.json`; eight independent clients, authority, origins, loading failure, host transfer and reservation expiry |
| Two Chrome foundation | Passed | `artifacts/foundation/result.json`; independent movement, jump, shared state and refresh into the same seat |
| Browser-to-browser ball interaction | Passed | `artifacts/hit-agreement/result.json`; actual pickup, throw, damage and matching observer state |
| Individual game journeys | Passed | `artifacts/kalla`, `artifacts/pachai-kuthirai`, `artifacts/eripandhu`, `artifacts/seven-stones`, `artifacts/paandi`; full rounds and lobby rematches |
| Two Chrome Cups | Passed | `artifacts/cups/report.json`; all five Festival rounds, a full Knockout, voting, matching outcomes, 1,800 points and rematches |
| Seeded real-traffic impairment | Passed | `artifacts/impairment/report.json`; 0 / 100 / 200 ms added RTT through a real WebSocket proxy, ±10 ms seeded jitter per direction |
| Repeated-match soak | Passed | Ten Festival Cups + ten Knockouts under isolated deterministic stepping; fresh IDs, no duplicate awards, no growing character-body count |
| 30-minute network load | Passed | `artifacts/load/report.json`; **1,802.522 s**, eight independent SDK connections, seven completed matches |
| Clean distribution | Passed | `artifacts/distribution/report.json`; separate fresh directory, offline frozen install, build, same-origin Chrome play, compressed assets, occupied port, server shutdown |
| Final built launcher | Passed | `artifacts/built-launcher/report.json`; `./start.command` on 2567, two independent Chrome contexts, Eripandhu, active-round refresh, gzip, local-only requests and explicit leaving |
| Desktop presentation | Passed | `artifacts/presentation`; 1920×1080 and 1280×720 screenshots, settings, draft Tamil toggle and gameplay |
| Essential Tamil and sound cues | Passed | `artifacts/localization-audio/report.json`; inspected 1280×720 Kalla/Paandi HUD and results; real countdown, hazard, jump, land, elimination and celebration audio events |
| Focused game action runner | Executed and inspected | `artifacts/action-foundation`, `artifacts/action-polish`, `artifacts/action-final`; complements the multi-client suites |

## Meaningful rule coverage

- Acceleration, jump height, landing, wall collision, diagonal clamp, finite input, held-jump suppression and jump buffering.
- Schema accessor input sanitization; stale-round movement and forged score/hit/item commands cannot set authority.
- Ordered race checkpoints, both authored branches through ordinary controls, contextual-vault entry and bounded bonus behavior.
- Kalla Manna warning/support rules, airborne transitions, simultaneous elimination groups and 360-point ties.
- Swept projectile intersection, world occlusion, owner exclusion, protected/jumping targets, one hit per ball, closest/tied pickup, four-second drops and throw cooldown.
- Simultaneous final hits and bounded sudden death preserve shared outcomes.
- Seven-stone identities, mirrored heats, disconnect drops, hits before same-tick placement completion, and one team award after both heats.
- Paandi route completion for all marker seeds, ordered outward/return progress, legal adjacent retrieval, walking/marker resets, edge tolerance and preserving completed sections.
- Festival point conservation and complete Knockout boundary groups across twenty repeated matches.

## Recovery and network details

The real SDK recovery tests verify rapid partial-setting updates, occupied-seat protection, selected room capacity, a 15-second reserved identity, five-second host transfer, refresh-style reconnection, named content-loading timeout, and rejecting an expired token. An eliminated slot remains eliminated after CPU takeover. HTTP and matchmaking origin checks share the WebSocket policy.

The impairment harness delays actual binary game messages in both directions, preserves WebSocket ordering, and uses a fixed jitter seed. Chrome movement/jump state converges between clients under each tested delay. Playwright's native WebSocket routing conflicted with the SDK's constructor-options probe; the final test uses an external local WebSocket proxy, not a mock game state.

The soak advances only isolated server instances in tests. The live SDK load and browser journeys use the real authoritative clock. The load run completed four Festivals and three Knockouts without a lost client. It exercised real movement/action streams; no browser or test command advanced the live clock or supplied authoritative results.

## Installation/offline boundary

The clean test creates a separate directory without `node_modules`, installs the exact lockfile from the populated pnpm cache with network-disabled package retrieval, and builds. It then blocks non-local browser requests, creates and plays a real room, verifies gzip assets and checks a visible server-stopped error. This proves offline installation from that populated cache and offline local play after installation. It does not claim that an entirely new machine can obtain Node/packages without a first download.

A duplicate server exits instead of choosing a hidden fallback port. The built application has no `advanceTime` hook and omits `render_game_to_text` unless diagnostics are explicitly enabled.

## Still pending

Physical Android Chrome, iPhone Safari, a second physical LAN device, Windows/Linux execution, Tamil editorial completion, and human group play balancing remain unverified. They are listed in the implementation checklist; the desktop tests do not mark them complete.
