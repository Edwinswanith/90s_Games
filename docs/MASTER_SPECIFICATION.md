# THERU PARTY: MASTER BUILD PROMPT
## Local-first 3D multiplayer Tamil childhood party game

**Specification version:** 1.0  
**Research checked:** 8 September 2026  
**Working product name:** Theru Party  
**Deliverable:** A runnable browser-based LAN multiplayer prototype, not a promotional website or a collection of non-functional screens.

---

# 0. Instructions to the coding agent

You are the lead gameplay engineer, multiplayer engineer, technical artist, and UI engineer for this project. Build the product described in this document in the current workspace.

Read the entire document before editing. Inspect the workspace and preserve unrelated existing work. When starting in an empty directory, create the project. When starting in an existing compatible project, integrate rather than overwriting it. Explain a genuine stack conflict before changing an existing application's foundation.

Implement the five games as modules of ONE application with shared movement, networking, lobby, round management, visual language, and results. Do not build five separate applications.

The scope includes these games, in recommendation order:

1. Kalla Manna / கல்லா மண்ணா: called-surface survival.
2. Pachai Kuthirai / பச்சைக் குதிரை: progressive leapfrog racing.
3. Eripandhu / எறிபந்து: arcade dodgeball elimination.
4. Seven Stones / Ezhu Kal / ஏழு கல்: two-team rebuilding and defending.
5. Paandi / பாண்டி: precision hopscotch racing.

Use Stumble Guys as the reference for the **party-game format**, playful 3D presentation, readable controls, lobby-to-round flow, map reveal, qualification feedback, spectating, and podium celebration. Create original characters, geometry, map layouts, icons, animations, sound, branding, and interface compositions. Do not extract or redistribute Stumble Guys assets or reproduce its branded screens pixel for pixel.

The priority is a playable, understandable, responsive multiplayer game. A beautiful menu with fake opponents or client-invented winners does not satisfy the brief.

Work in the milestone order near the end of this document. First provide a concise implementation plan, then begin Milestone 1 unless a genuine blocker requires clarification. Do not attempt all five games in one untested change. Do not stop after scaffolding and claim the product is complete. Maintain IMPLEMENTATION_STATUS.md so another session can continue accurately.

All movement values, timings, scores, dimensions, and performance budgets below are **initial design specifications to implement and test**, not claims that playtesting has validated them. Put tunable values in configuration files. Do not silently change the rules to make a broken implementation pass.

---

# 1. Research foundation and interpretation

Stumble Guys' official support documents describe races, solo elimination, team elimination, and collection maps. Its custom-party flow supports party codes, choosing modes and maps, and filling empty positions with bots. These are the structural references for this project. [R1, R2]

This is not a claim that our proposed engine or networking stack is Stumble Guys' internal technology.

Tamil Virtual Academy documents Pachai Kuthirai as progressively increasing jumping challenges, including vaulting over a bent player. It also records Kalla Manna among group children's games. Preserve the recognisable ideas while clearly describing the five implementations as **digital adaptations**, not universal historical rulebooks. [R3]

Specific adaptations in this brief include called-surface survival without a human catcher, NPC leapfrog obstacles, two-hit dodgeball, a scripted Seven Stones opening knockdown, and assisted character animations for hopscotch. Do not present those inventions as mandatory traditional rules.

A room, a round, a heat, and a match are different:

- A **room** persists while the group chooses settings and plays rematches.
- A **match** is Single Game, Festival Cup, or Knockout Cup.
- A **round** is one selected mini-game.
- A **heat** is one role assignment inside the Seven Stones round. Two heats make one round.

---

# 2. Scope and assumptions

## 2.1 Meaning of local

Develop and run the server on one Windows or macOS computer. Players join using desktop browsers or mobile browsers on the same Wi-Fi/LAN. Each player has their own screen and controller input.

This does not mean split-screen, sharing one keyboard among eight people, peer-to-peer hosting inside a browser, or public internet matchmaking.

The host computer runs two local processes: the frontend development server and the authoritative game server. The person with lobby-host permission is not necessarily the machine that runs the server.

After dependencies and assets have been installed, playing should not require external APIs, cloud accounts, CDNs, or internet access. The host computer and local server still need to remain on.

## 2.2 Player count

Support a maximum of eight gameplay slots in version 1. Do not claim 32-player support.

Festival Cup and Knockout Cup start with exactly eight logical participants. A participant can be a human or a clearly labelled CPU. Enable initial bot fill by default. One human plus seven CPUs is valid for practice. Disabling bot fill requires eight human participants before a Cup can start.

Single Game supports two to eight participants, except Seven Stones, which requires four, six, or eight, divided equally. Reject invalid counts before starting.

Eight slots are a scope choice, not an asserted engine limit. Increase capacity only after measured load and gameplay tests.

## 2.3 Match formats

Provide three formats:

| Format | Round count | Who stays in the match? | Initial purpose |
|---|---:|---|---|
| Single Game | 1 | Participants play the selected game | Isolated practice and debugging |
| Festival Cup | 5 | All eight return for every round | Default local playtest format; includes all five games |
| Knockout Cup | 3 | Only qualifiers advance | Short party-knockout experience |

An eliminated Festival player spectates only the rest of the current round, then rejoins the next round. Do not accidentally eliminate them from the whole Cup.

Do not force Seven Stones into a two-player final. It is selectable in Single Game and Festival Cup. It is not part of Knockout Cup version 1.

## 2.4 Explicit non-goals

Do not add public matchmaking, accounts, email login, chat, voice chat, payments, ads, battle passes, loot boxes, paid abilities, global leaderboards, an open world, a map editor, native app-store packages, or 32-player rooms in this prototype.

Do not add Redis, Kubernetes, a database, cloud deployment, microservices, or an external AI service simply because a template offers them.

---

# 3. Technical stack and dependency policy

## 3.1 Required architecture

Use a TypeScript monorepo with:

| Layer | Technology | Responsibility |
|---|---|---|
| Runtime | Node.js 24 LTS family | Local authoritative server and development scripts |
| Workspace | pnpm workspaces | Shared packages and reproducible installation |
| Client tooling | Vite + TypeScript | Browser client development and bundling |
| UI | React 19 compatible release | Menus, lobby, HUD, settings, results |
| 3D rendering | Three.js + React Three Fiber 9 compatible release | Scene rendering, cameras, visual animation |
| Physics/query layer | @dimforge/rapier3d-compat | Character collision, queries, projectile collision support |
| Multiplayer server | Colyseus 0.18 compatible stable release | Rooms, transport, state, fixed-step authority |
| Multiplayer client | @colyseus/sdk matching the server | Joining, input, synchronization, reconnection |
| Synchronized schema | @colyseus/schema matching the chosen Colyseus version | Explicit network state |
| Validation | Zod or an equivalently small typed runtime validator | Untrusted commands and settings |
| Unit/integration testing | Vitest | Rules, scoring, scheduling, simulated clients |
| Browser testing | Playwright | Real browser contexts, UI flows, input integration |
| UI styling | CSS variables + CSS Modules | Explicit design system without a dashboard template |
| Audio | Web Audio API plus locally bundled licensed files | Effects, music, and audio mixing |

Node's release page currently identifies the 24 family as LTS. React Three Fiber's official guidance pairs its 9 family with React 19. Check compatible current patch releases before installing and record exact resolved versions. [R4, R5]

Do not use the package family descriptions above as permission to mix incompatible versions. Commit pnpm-lock.yaml, declare the package-manager version, and provide an engines field and .nvmrc.

## 3.2 Version-sensitive Colyseus rules

The researched documentation is the 0.18 documentation. It includes newer input/prediction APIs and explicitly warns about code generated from old examples. Use the installed package's documentation and type definitions. Do not paste older `colyseus.js` imports or obsolete Room generic declarations into a 0.18 application. [R6, R7]

Start from the official real-time-action preset or adapt its verified patterns when useful. Do not run a generator with overwrite enabled in a non-empty workspace. Do not import account/database/admin features that this project does not need.

Use one prediction mechanism. Prefer the compatible native Colyseus prediction path rather than writing a second competing sequence/rollback system around it. This document specifies the required behaviour, not permission to invent framework methods.

## 3.3 Rendering and simulation separation

React Three Fiber renders the game. It does not own the authoritative simulation.

Use one authoritative Rapier world per active room/round. Await physics initialization before accepting a round as ready. Rapier's JavaScript runtime initializes asynchronously, and its character controller provides collision-corrected movement rather than a complete game movement system. [R8, R9]

Do not mount an independently stepping client physics wrapper and accidentally simulate gameplay twice. A client prediction world is separate and restricted to the local player's reproducible movement against relevant world geometry. Other players' rendered transforms do not become authoritative collisions.

Use React state for menus and meaningful UI changes. Update high-frequency object transforms through the rendering/game layer, not a React setState call for every entity on every frame.

---

# 4. Repository organization

Use a structure close to the following. Small justified changes are acceptable; retain these responsibility boundaries.

```text
theru-party/
  apps/
    web/
      src/
        app/                    # boot, screen shell, navigation
        ui/
          components/           # buttons, cards, badges, dialogs, tabs
          screens/              # home, create, join, lobby, results, settings
          hud/                  # common and game-specific HUD
          styles/               # tokens, typography, layout
        game/
          runtime/              # game lifecycle and fixed-step integration
          input/                # keyboard, pointer, touch adapters
          network/              # SDK connection and read-only view adapters
          camera/
          characters/
          environments/
          effects/
          audio/
          rounds/
            kalla-manna/
            pachai-kuthirai/
            eripandhu/
            seven-stones/
            paandi/
        i18n/
      public/
        assets/
          models/
          textures/
          audio/
          fonts/
      vite.config.ts
    server/
      src/
        index.ts
        rooms/PartyRoom.ts
        state/
        match/                  # lifecycle, selection, scoring, eligibility
        rounds/                 # authoritative controllers for the five games
        bots/
        http/                   # health and room-code resolution
        diagnostics/
  packages/
    shared/
      src/
        protocol/
        config/
        round-manifests/
        maps/
        scoring/
        validation/
        localization-keys/
    simulation/
      src/
        movement/
        physics/
        projectiles/
        checkpoints/
        math/
  tests/
    unit/
    integration/
    e2e/
    fixtures/
  scripts/
  docs/
    ARCHITECTURE.md
    GAME_RULES.md
    LAN_SETUP.md
    DEPENDENCIES.md
    TEST_REPORT.md
    PERFORMANCE_REPORT.md
    KNOWN_LIMITATIONS.md
  ASSET_LICENSES.md
  IMPLEMENTATION_STATUS.md
  README.md
  .env.example
  .nvmrc
  pnpm-workspace.yaml
  pnpm-lock.yaml
  package.json
```

Shared simulation code must not depend on DOM, React, or browser globals. Server code must not import browser rendering modules.

Every round should have:

- A manifest: ID, title, category, supported formats, player-count constraints, duration configuration, instruction keys, and content version.
- A map definition: collision geometry, spawn points, safe areas, path/checkpoint graph, and relevant interaction locations.
- An authoritative controller: initialize, start, fixed-step update, validate actions, finish, and dispose.
- A client view: meshes, animations, HUD bindings, and effects.
- A bot policy using the same legitimate action interface as human input.
- Rules tests and at least one multiplayer integration test.

Use a round registry. Avoid a single enormous component containing all game logic.

---

# 5. Local setup and launch behaviour

## 5.1 Commands to implement

Provide working scripts with these roles. These are required project scripts to create, not commands that are assumed to exist before implementation.

```bash
pnpm install
pnpm dev
pnpm build
pnpm start:local
pnpm typecheck
pnpm lint
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm test:load
```

`pnpm dev` starts the client and game server together, terminates both cleanly, and prints reachable addresses. `pnpm start:local` serves built client assets and the local game server without depending on the Vite development process. Document its actual port arrangement.

Initial development ports:

```text
Browser application: 5173
Game server:        2567
```

Use strict ports so another occupied port produces a clear error rather than silently breaking invitation links.

## 5.2 LAN access

Bind the development frontend and game server to the configured LAN-capable interface. Vite documents `0.0.0.0` for listening on LAN addresses. Do not set unrestricted allowed hosts or unrestricted CORS just to make networking work. Explicitly allow the development origins that are actually used. Validate WebSocket origins as well as HTTP origins. [R10]

Derive the default game-server host from the hostname used to open the client, with a documented environment override. Never hard-code `localhost` into the phone client's connection path.

Example addresses, using an illustrative private IP that must be replaced with the actual host IP:

```text
Host computer opens:  http://localhost:5173
Other devices open:   http://192.168.1.20:5173
Game connection:      http://192.168.1.20:2567
```

A room code identifies a room on this server. It does not make the computer publicly reachable.

Show a warning when copying a localhost invite for another device. Print the actual LAN URLs in the terminal. When several interfaces exist, show them and let the developer select the correct one rather than guessing that a VPN address is usable.

Document private-network firewall permissions, guest Wi-Fi/client isolation, keeping the host awake, and the fact that a device's own localhost is not the host computer.

Do not require HTTPS-only optional browser features to join or play on a plain-HTTP LAN prototype. Clipboard, fullscreen, and orientation-lock failures must have graceful fallbacks. Never recommend publicly exposing an unprotected development server.

## 5.3 Configuration example

Create an .env.example with actual variable names used by the implementation:

```dotenv
GAME_SERVER_HOST=0.0.0.0
GAME_SERVER_PORT=2567
CLIENT_PORT=5173
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
VITE_GAME_SERVER_URL=
MAX_PLAYERS=8
ENABLE_DEV_TOOLS=true
```

Explain how to add the host's actual LAN origin. Browser-visible variables must contain no secrets. Do not put reconnection tokens, private credentials, or admin permissions in shared public configuration.

Provide a health endpoint and a small room-code lookup endpoint if the selected Colyseus setup needs a code-to-room-ID resolver. Do not implement an independent REST transport for live movement.

---

# 6. Visual direction and color system

## 6.1 Overall look

Create a bright, tactile, toy-like 3D party game set in a stylised Chennai neighbourhood during an informal street-games festival.

The world should feel playful, not photorealistic or gritty. Use rounded forms, broad color areas, readable silhouettes, soft directional lighting, gentle contact shadows, and restrained surface detail.

The visual connection to a party-knockout game comes from the composition, approachable characters, oversized interactive elements, readable danger, and celebratory feedback. Do not rely on copying another game's character silhouette or exact menu arrangement.

Avoid a SaaS dashboard, white corporate cards, website hero sections, stock photography, photorealistic children, neon cyberpunk effects, heavy bloom, and visually noisy rainbow decoration.

## 6.2 Required palette

Create shared CSS and material tokens. Use these initial values consistently:

| Token | Hex | Usage |
|---|---|---|
| Ink Navy | #152347 | Text on bright buttons, outlines, deep shadows |
| Menu Indigo | #203E91 | Main menu panels and backdrop base |
| Primary Blue | #3168E0 | Selected tabs and secondary actions |
| Sky Cyan | #45C8F5 | Header accents, sky, highlights |
| Festival Yellow | #FFD34E | Main Play/Start/Ready action, trophy accents |
| Warm Cream | #FFF4DD | Instruction cards, plaster surfaces |
| UI White | #F7FBFF | Text on dark panels |
| Muted Light | #C7D3EF | Secondary text on dark panels |
| Success Mint | #45C486 | Positive state icon and outline |
| Warning Coral | #E86762 | Hazard warnings and elimination accents |
| Sand | #E8C894 | Dirt and sand gameplay surfaces |
| Stone | #8996A5 | Stone gameplay surfaces |
| Terracotta | #C66F4A | Roofs, low walls, environmental accent |
| Leaf Green | #6EA675 | Background foliage only |
| Team Ocean | #269AC7 | Team A, always accompanied by a diamond icon |
| Team Mango | #E8A23B | Team B, always accompanied by a triangle icon |

Use Ink Navy text on Festival Yellow, Sky Cyan, Warm Cream, and other bright fills. Do not assume white text is readable on every accent color. Test actual text contrast and adjust the relevant text/surface pairing without changing the overall design direction.

Limit each environment to two main material families plus small accents. The common UI remains consistent across all five games.

Stone and sand must differ in texture, icon, and label, not only hue. Team affiliation must differ in shape and label, not only color. Do not reuse team colors as the sole indication of danger or safety.

## 6.3 Typography and UI geometry

Use Fredoka for large English display headings, Nunito Sans for compact English UI, and Noto Sans Tamil or a verified equivalent for Tamil. Bundle only appropriately licensed project assets and record licenses. The text must shape correctly; do not simulate Tamil with a decorative font that lacks its glyphs.

Initial UI scale:

- Desktop major title: 40–52 px.
- Desktop panel heading: 24–30 px.
- Desktop body: 16–18 px.
- Mobile landscape title: 24–32 px.
- Mobile body: 15–17 px.
- Body line-height: approximately 1.4; allow additional space for Tamil when needed.
- Major buttons: 52–60 px high on desktop; at least 48 px high for mobile menus.
- Gameplay touch controls: 64–80 px, not tiny icon buttons.
- Button radius: 14 px. Panel radius: 20 px.
- Outline: 2–3 px Ink Navy where needed for separation.
- Pressed state: short 2–3 px downward movement and reduced bottom shadow.

Use a slightly tactile bottom edge on primary buttons, subtle card depth, clear hover/focus/selected states, and visible keyboard focus.

## 6.4 Characters

Create an original, small, stylised human character with a large expressive head, compact torso, short limbs, simple readable hands, and a visibly different silhouette from the reference game's branded characters.

Target roughly 1.65 world units of gameplay height. Cosmetic proportions can differ from the invisible capsule, but must not mislead players about collision.

Include several skin tones and a small selection of original T-shirts, shorts, sportswear, and simple casual outfits. Cosmetics do not alter speed, jump, health, hitbox, or throw strength.

Provide idle, run, jump, fall, land, vault, throw, carry, place, stumble, eliminated, and celebration states. Procedural animation is acceptable for the prototype when it is readable. Greybox capsules are acceptable only for early engineering milestones, not as a claimed finished character presentation.

Use an unobtrusive marker and outline for the local player. Keep nameplates short and legible. Show CPUs honestly.

## 6.5 Environment kit

Build one reusable low-poly kit: plaster walls, roof sections, shutters, a fictional petty shop, a school boundary, chalk markings, benches, a parked bicycle, pots, bunting, and a few trees.

Decorative props must not become invisible gameplay blockers. Clearly distinguish scenery from collision surfaces. Avoid unverified business names, real advertisements, film references, political imagery, or stereotypes as a shortcut to cultural identity.

---

# 7. Screens, tabs, and user flow

## 7.1 Full flow

```text
Boot and capability check
  -> Home / guest identity
  -> Create Party or Join Party
  -> Room lobby
  -> Configure players, format, and rounds
  -> All human players ready
  -> Host starts
  -> Optional round vote
  -> Server locks the next round
  -> Map reveal
  -> Asset loading barrier
  -> How to play + countdown
  -> Gameplay
  -> Spectating when applicable
  -> Round result
  -> Next round, or final podium
  -> Same room lobby for a rematch
```

No gameplay outcome is derived from a client-side route or local timer. The server phase determines the in-room screen.

## 7.2 Boot screen

Show a short original title treatment and genuine loading progress for required assets. Check graphics support and show a useful error when unavailable. Do not show a fake progress bar while silently failing to initialize physics or networking.

Audio must initialize/resume after a user gesture, with graceful failure handling. Browsers can block unsolicited audio playback. [R14]

## 7.3 Home

Use a full-screen game composition, not a website landing page.

Center or slightly left: the player's animated character on a small street-festival podium.

Right: a large yellow Create Party button and a blue Join Party button. A smaller Practice entry opens Single Game creation with bots enabled.

Top left: original product mark and compact guest identity. Top right: connection indicator and Settings.

A small menu rail contains Play, Games, Wardrobe, and Settings. Every enabled item must work. Do not display fake currency, fake rewards, unavailable stores, or fabricated profile progression.

Ask for a display name with a short Unicode-aware length limit. Preserve Tamil names. Trim whitespace, reject control characters, and render the name as text rather than HTML. A reconnecting player must not become a new identity solely because the page refreshed.

## 7.4 Create Party

Show three large mode cards:

- Festival Cup: “Play all 5 games. Highest total score wins.” Default selected.
- Knockout Cup: “Qualify through 3 rounds. Win the final.”
- Single Game: “Choose one game to practise or compete.”

Show eight slots for either Cup, bot fill toggle, and the applicable round count. Single Game exposes valid participant counts and a game picker.

Do not expose advanced settings that do not work. Use meaningful defaults rather than asking the player to configure simulation parameters.

## 7.5 Join Party

Provide a six-character code field, join button, clear server connection status, and helpful errors: invalid code, room not found, room full, match already started, incompatible build, and server unreachable.

A share link can prefill the code, but joining remains an explicit user action. Explain that this local invitation works only while the host server is running and reachable on the LAN.

## 7.6 Lobby

On desktop, use a central character stage with compact side panels. Do not obscure the group with configuration controls.

Include room code, copy/invite action, human/CPU count, host badge, readiness, and participant connection state.

The configuration area has exactly these tabs:

### Players

Eight participant slots, names, CPU labels, ready badges, and host-only slot management before the match. Seven Stones team assignments can be previewed and edited here when relevant. Teams must remain equal.

### Rounds

Show the selected match format, actual round count, selection policy, and appropriate map controls described in Section 8. Show game title, category, estimated maximum duration, player constraints, and a How to Play link.

### Rules

Show player-count requirement, bot-fill state, disconnect behaviour, scoring summary, and the fact that cosmetic differences have no gameplay effect. Audio, language, and graphics preferences belong in personal Settings, not shared rules.

Non-hosts can inspect shared settings, but only the host can change them. Enforce this on the server. Changing settings increments a settings revision and clears human readiness.

A non-host has a large Ready/Not Ready button. The host also readies themselves, then receives Start Match only when every connected human is ready, the roster is valid, and assets/build versions are compatible. Show exactly why Start is disabled.

## 7.7 Game picker and game detail

Use original thumbnails rendered from our own scenes. Each card has the bilingual title, category chip, control icons, player range, and a brief objective.

The detail panel contains objective, controls, how the round ends, scoring/qualification, and a small “Digital adaptation” note. Instructions must match the implemented rules.

An ineligible game is visibly disabled with a reason. Never let a player select an invalid configuration and discover the problem after the countdown.

## 7.8 Map reveal

A short, roughly two-second presentation can cycle thumbnails and land on the selected game. The server must have already chosen the round. The animation must not independently select a different map on each client.

Reduce or skip camera motion when Reduced Motion is enabled. The server start time remains common to everyone.

## 7.9 Loading and briefing

Preload the selected map and its dependencies, report readiness, then show a five-second briefing and a three-second countdown.

The server starts only after the participating human clients are ready for that content version. Use a finite loading deadline. On failure, return to the lobby with the affected player and reason shown rather than starting an invisible game or waiting forever.

Display one large objective, two or three control hints, and the current format's win condition. First-time local instructions can be more detailed; do not make every round require a long tutorial.

## 7.10 In-game HUD

Top left: game name and short objective.

Top center: authoritative remaining time; a prominent called surface or role notice when needed.

Top right: qualification count, remaining lives, or team/stone progress, as appropriate.

Bottom left on touch: virtual movement stick.

Bottom right on touch: Jump and the game-specific Action button. Hide or clearly disable an irrelevant action rather than showing a mysterious icon.

Top corner: small menu button and a discreet connection warning. Opening this menu does not pause the other players.

Show no decorative HUD element over a jump landing area or a projectile aiming line.

## 7.11 Spectating

When a player is out or has finished, provide a clean spectator camera, the followed player's name, previous/next controls, and an honest phase status.

In Festival Cup, say “You return next round.” In Knockout Cup, say “Out of this match.” Do not confuse the two.

Do not invent a countdown for an end condition that has not happened. Show the actual current round timer or “Waiting for remaining players.” A server timer still ends the round within its cap.

## 7.12 Results and podium

Round results show real placements, ties, qualifiers, and awarded points. Team results show both heats and explain the winning comparison. Only display metrics that the server actually recorded.

Final Festival results show total points and the round breakdown. Knockout results show the final outcome. Provide original podium animation, modest confetti, Rematch/Return to Lobby, and Leave.

Rematch preserves the room and chosen configuration, clears readiness, resets match-specific state, and gives new match/round IDs. It must not duplicate previously awarded points.

Support shared placements and genuine draws. Never quietly decide an exact gameplay tie using a player's name, join order, or arbitrary player ID.

## 7.13 Settings and responsive layout

Settings include language, master/music/effects volume, graphics quality, Reduced Motion, screen shake, and controls help. Persist local preferences without treating them as server permissions.

Support desktop 1920×1080 and 1280×720, tablet landscape, and phone landscape around 844×390. Menus can adapt to portrait; show a rotate-device panel for gameplay in portrait without crashing or resetting the room. Respect device safe areas.

Provide functional touch input on the actual canvas and controls. A desktop screen shrunk to phone width is not mobile support.

---

# 8. How the group chooses rounds

## 8.1 Single Game

The host chooses one of the five games. Validate player count. Start, play, show results, and return to the same lobby. Offer optional CPUs to make practice possible.

## 8.2 Festival Cup: default five-round experience

All eight participants play all five games exactly once. Recommendation rank is not necessarily match order.

Initial fixed order:

```text
1. Pachai Kuthirai
2. Kalla Manna
3. Paandi
4. Seven Stones
5. Eripandhu
```

This alternates race, survival, precision, team play, and direct competition. It is an initial design, not a measured optimal sequence.

Implement these selection policies in order, after the fixed playlist works:

### Host order

The host reorders all five cards in the lobby. Provide Move Up/Move Down controls as well as optional drag-and-drop. No duplicate game IDs and no missing games.

### Shuffle

The server generates one seeded permutation of all five games when the match starts. No repeats. All clients receive the same sequence.

### Vote next

At the start and between rounds, the server opens a ten-second vote showing the unplayed games. Connected humans can each have one active vote and may change it before the deadline. CPUs do not vote. Late or duplicate packets cannot create extra votes.

Most votes wins. A tied vote uses a documented server-seeded choice among the tied games. With no votes, choose from the valid pool using that same server-owned policy. Randomness is appropriate here because this selects content, not a winner.

Publish the result, remove the selected game from the remaining pool, and proceed to reveal. When one game remains, select it directly without an unnecessary vote.

Do not show Shuffle or Vote as enabled until they are implemented and tested.

## 8.3 Festival scoring

For an eight-player individual round, award:

```text
1st: 80    2nd: 70    3rd: 60    4th: 50
5th: 40    6th: 30    7th: 20    8th: 10
```

Tied placements share the average of the positions they occupy. Example: a tie occupying second and third gives each 65 points. A group of simultaneous eliminations shares its occupied positions rather than being separated by array order.

For Seven Stones:

```text
Each member of the winning team: 65
Each member of the losing team:  25
If the team round is a draw:     45 each
```

These are the averages of the top four and bottom four individual finishing slots. A normal eight-player round distributes 360 points either way. Do not award extra Cup points for delivering the last stone or landing the final team hit; that would encourage selfish play.

At the end, total points determine the Cup standings. Exact total ties share that position and the Cup title when applicable. Display this explicitly instead of inventing an arbitrary hidden tiebreaker.

In Single Game, show the round's actual result; no persistent Cup score is required.

## 8.4 Knockout Cup

Initial structure:

```text
Round 1: Pachai Kuthirai OR Paandi, chosen by the host
         Eight participants, target four qualifiers.
Round 2: Kalla Manna
         Target two qualifiers.
Round 3: Eripandhu
         Remaining finalists compete for the match outcome.
```

Single Game and Festival Cup still expose all five games. Seven Stones is disabled in the knockout picker with an explanatory label.

Do not implement arbitrary knockout playlists in version 1. They require additional eligibility and tie-resolution design that is outside the initial scope.

At a qualification boundary, evaluate all results from the same simulation tick before selecting qualifiers. If an exact boundary tie remains after the game's defined performance ordering, advance the tied boundary group together. The following round must accept the actual participant count, up to eight. Label it “Tied for the last spot: both advance.” Four and two are targets, not permission to arbitrarily discard a tied player.

If a round produces no meaningful contest because all participants are absent or initialization failed, mark it no-contest and return to the lobby rather than awarding a fabricated winner.

---

# 9. Shared controls, movement, camera, and collision

## 9.1 Controls

Desktop:

```text
WASD / arrow keys: move relative to the gameplay camera
Space: jump / attempt a contextual vault
E: context action, or throw toward facing/assisted direction
Mouse action: hold and aim, release to throw when applicable
Escape: personal menu; never pauses the authoritative match
```

Touch:

```text
Left virtual stick: movement
Right Jump button: jump / contextual vault
Right Action button: pickup, place, retrieve, or hold-drag-release throw
```

Pointer IDs must allow movement plus jump plus aiming without stealing each other's touches. Use pointer capture appropriately. Prevent scrolling and unwanted browser gestures only in gameplay interaction regions, not throughout menu content.

Neutralize local input on blur, menu opening, pointer cancellation, and disconnect. Do not leave a character running forever because a key-up event was missed.

No global punch, grab, dive, double-jump, or special abilities in the first version. Projectile attacks belong to the appropriate game rules.

## 9.2 Initial movement configuration

Use meters as approximate world units:

```text
Character total collider height: 1.65
Capsule radius:                  0.35
Ground maximum speed:            5.5 units/second
Ground acceleration:            30 units/second²
Gravity:                       -24 units/second²
Jump vertical velocity:          7.8 units/second
Air steering factor:             0.55
Coyote window:                   100 milliseconds
Jump buffer:                     120 milliseconds
Step height:                     0.25 units maximum
```

These values imply an unobstructed jump of approximately 1.27 units in height and 0.65 seconds of flight at equal launch/landing height. Design required jumps to fit the actual controller, with margin, and validate them through simulation. Do not place mandatory gaps beyond the reachable range and hide the problem with teleportation.

Keep the movement model shared between client prediction and server authority. Implement grounded state, acceleration, gravity, jump eligibility, coyote time, and buffers explicitly. Do not assume a collision helper supplies all of them.

## 9.3 Player collision policy

Disable solid player-to-player blocking in version 1. Characters can overlap slightly; offset visual presentation when needed without moving the authoritative hitbox. Do not let random crowds make small hopscotch tiles impossible.

World obstacles, ground, valid projectile hits, and game-specific hazards remain authoritative. Decorative stumbles can be cosmetic; gameplay stuns must have documented durations.

Physical pushing and player stacking are future experiments, not hidden dependencies of the first five games.

## 9.4 Camera

Use a third-person, elevated chase camera with roughly 7–9 units distance and 4.5–6 units height. Keep the local character and next landing region visible. Use collision-aware camera placement and smooth recovery after respawn.

Race maps primarily follow the route. Paandi uses a stable elevated angle so turning back does not suddenly reverse the visual layout. Arena games use a higher angle with enough forward view for aiming.

Do not use cinematic camera movement during live input. Screen shake is small, optional, and disabled by Reduced Motion.

---

# 10. GAME 1: KALLA MANNA

## 10.1 Identity and player-facing objective

**Tamil:** கல்லா மண்ணா  
**Subtitle:** Stone or Sand  
**Category:** Survival  
**Controls:** Move + Jump  
**Initial maximum gameplay duration:** 75 seconds

Objective: **“Reach the called safe surface before the countdown ends.”**

This is an adaptation of the surface-choice idea, not a claim that traditional Kalla Manna always used disappearing floors.

## 10.2 Arena and appearance

Create a compact open courtyard with a roughly 6×6 arrangement of broad surface cells. Initial cell width is about 2.7 units. Use Stone and Sand materials, shallow height differences, clear footprints, and an unobstructed camera.

Stone surfaces have a stone icon and block-like pattern. Sand surfaces have a grain pattern and sand icon. A safe target has a cream outline and upward marker during warning time. Unsafe surfaces use a coral warning pattern, not just a red tint.

Keep scenery outside the active play area. Do not use real lava or lethal-looking realistic hazards; a playful sinking or tumble effect is enough.

## 10.3 Round sequence

Spawn players at fair distributed positions and show the briefing. After the shared countdown, the server repeats waves:

```text
Announce safe surface
  -> Visible travel countdown
  -> Unsafe surfaces activate
  -> Evaluate continued support/landing safety
  -> Neutral recovery window
  -> Next wave
```

Start with generous warning time near three seconds. Later waves can shorten toward roughly 1.8 seconds, subject to actual reachability. Unsafe periods last approximately two seconds, longer than a normal jump. The recovery interval is around one second.

For early waves, all tiles of the called material can be safe. Later authored patterns may narrow the highlighted safe set. When only a subset is safe, the instruction must change to **“Reach a highlighted stone tile”** or its sand equivalent. Do not call all stone safe while secretly making some stone lethal.

Use authored pattern sets and a server seed. Every player must have a physically reachable safe destination when the warning begins. Validate distance/path requirements against movement speed, warning time, obstacles, and jump range. Do not introduce an impossible randomly chosen pattern.

## 10.4 Failure and round ending

A player is eliminated when they land on or remain supported by an unsafe surface during its active interval, or fall out of bounds.

Jumping at the activation instant does not grant immunity. Airborne players may complete a legitimate jump, but landing on an active unsafe surface eliminates them. A two-second active interval prevents permanent avoidance by timing one jump.

In Festival/Single, play until one remains or the time cap ends. Rank by survival time, preserving simultaneous-elimination ties. Survivors at the cap share the highest remaining positions.

In Knockout, finish when the qualification target is reached or the cap expires, using the shared boundary-tie policy. Do not process players one by one and award survival merely because one appears later in an array.

## 10.5 HUD and feedback

Large central call: STONE or SAND, its icon, and a readable countdown. Add Tamil text in the selected locale. Sound reinforces the call but is never required.

Show remaining players, wave number, and the qualification target when relevant. On failure, show the specific reason briefly: “Landed on sand while stone was safe.”

## 10.6 Bot behaviour

Bots react only after the public announcement. Give them a seeded reaction delay and route to a reachable highlighted destination. They cannot access future calls, teleport, or move faster than humans. Vary route quality, not rule privileges.

## 10.7 Required tests

Test matching calls on every client, no early elimination during warning, correct airborne handling, simultaneous eliminations, boundary ties, map reachability, timer expiry with multiple survivors, out-of-bounds handling, and a complete eight-client round.

## 10.8 Intended appeal and risk

Test whether last-second escapes and route choices create repeat play. Do not assume nostalgia makes alternating between two surfaces entertaining indefinitely. Record whether later patterns add decisions without becoming unreadable.

---

# 11. GAME 2: PACHAI KUTHIRAI

## 11.1 Identity and objective

**Tamil:** பச்சைக் குதிரை  
**Subtitle:** Leapfrog Lane  
**Category:** Race  
**Controls:** Move + Jump/contextual vault  
**Initial maximum gameplay duration:** 90 seconds

Objective: **“Time your vaults, pass the checkpoints, and reach the finish.”**

## 11.2 Map and appearance

Create a fictional festival street race about 90–110 route units long, divided into four short checkpointed sections. Use cream walls, terracotta roofs, sand ground, and limited blue/yellow bunting.

Rows of original animated NPCs crouch in leapfrog poses. They are obstacles, not participating players who must wait. Their collision bounds are consistent with the visible pose.

The first section teaches low jumps. The second combines vaults. The third offers a longer safer route and a shorter harder sequence. The last section combines learned patterns, not an unintroduced surprise.

Use initial obstacle heights around 0.55, 0.9, and 1.15 units, then validate them against the controller. Provide broad landings and visible checkpoint arches.

## 11.3 Vault mechanic

A normal Jump always remains available. Near an eligible NPC, a correctly timed jump while approaching at sufficient speed enters a short VAULT state.

Initial eligibility: in the authored approach region, moving toward the obstacle, enough momentum, and a valid landing region. The server derives eligibility from actual state. The client cannot request a successful vault by supplying an arbitrary obstacle ID.

A vault uses a short authored arc and readable hand-over-back animation. Starting values can use about 0.4–0.5 seconds, subject to collision testing. Do not teleport through other geometry.

A clean sequence preserves momentum and may grant a small, temporary speed advantage capped near 10%. Bonuses do not stack indefinitely. A late or bad attempt produces a brief stumble or a checkpoint reset as appropriate.

Ordinary jumps may clear some low obstacles, but well-timed vaulting should feel smoother and faster. The mechanic must not reduce to a normal block with a decorative human model.

## 11.4 Progress and results

Validate checkpoint order on the server. A finish is valid only after all required checkpoints. Use server crossing time for finish ordering.

In Festival, let other racers finish until all complete, the main cap is reached, or the configured post-first-finish grace of 25 seconds expires, whichever occurs first. Display the updated remaining time honestly. Unfinished racers rank below finishers by validated route progress. Exact ties share occupied placements.

In Single, the same placement screen can show all participants. In Knockout, end after the target is filled, while evaluating same-tick finishes together.

Falling off the route resets to the last checkpoint with a short recovery animation. Do not reset the entire race for one late mistake. Reset velocity and input buffering safely to avoid repeated instant falls.

## 11.5 HUD and feedback

Show position, checkpoint progress, remaining time, and qualifiers when relevant. Display a brief “Clean vault” confirmation for an actual validated success, not every jump.

Sound should distinguish normal landing, clean vault, stumble, checkpoint, and finish. No copyrighted song is required.

## 11.6 Bots and tests

Bots follow route nodes, decide between safe/hard branches using configured skill, and time normal legal jump inputs. They do not jump to the next waypoint position.

Test checkpoint skipping, repeated finish packets, vault entry outside its approach zone, vault path obstruction, safe reset points, no infinite speed stacking, client/server vault agreement, and valid completion of both route branches.

## 11.7 Intended appeal and risk

Test whether players improve their timing and choose riskier routes on rematches. The main risk is a forgiving automatic animation that removes all skill, or an overly strict trigger that makes correct-looking jumps fail.

---

# 12. GAME 3: ERIPANDHU

## 12.1 Identity and objective

**Tamil:** எறிபந்து  
**Subtitle:** Dodgeball Yard  
**Category:** Individual elimination  
**Controls:** Move + Jump + Pick Up/Aim/Throw  
**Initial regular duration:** 90 seconds  
**Maximum sudden-death extension:** 30 seconds

Objective: **“Dodge incoming balls. Two valid hits knock you out.”**

## 12.2 Arena and balls

Create a compact schoolyard arena around 20×16 units with an open center and a few low, clearly visible cover pieces. Use warm cream, terracotta, and sand, with blue UI accents.

Use three balls for six to eight players, two for four or five, and one for two or three. In a two-player final, use symmetric spawns and a central ball at equal travel distance.

Seed and rotate initial spawn assignments rather than always giving one player the nearest ball. Keep ball pads outside permanent trapping locations.

## 12.3 Interaction

Each player can carry one ball. Action near an available ball requests pickup. The server selects and assigns a valid ball atomically; two players cannot carry the same ball.

Hold and drag the Action control to aim; release to throw. Desktop pointer aiming uses the world ground plane, not raw screen coordinates. Keyboard E throws toward facing, with the same limited assist policy offered on touch.

Use a visible aim line and a narrow, line-of-sight-limited assist cone. Initial assist range may be about 12 units with a 12–15 degree cone. Do not target through walls or snap to players behind the thrower.

Use constant throw strength initially. Do not add charge mechanics, catching, parrying, ball types, or ability upgrades.

Initial values to configure:

```text
Lives:                         2
Pickup distance:               approximately 1.2 units
Throw speed:                   approximately 11–12 units/second
Maximum live travel distance:  approximately 12 units
Throw recovery:                approximately 0.8 seconds
Post-hit protection:           approximately 1.25 seconds
Post-hit stun:                 approximately 0.3 seconds
Maximum held-ball time:        4 seconds
```

If a player holds a ball beyond the limit, it drops with a visible warning. This prevents indefinite stalling.

## 12.4 Projectile and hit rules

Use an arcade kinematic projectile path with a consistent, jump-dodgeable height, initially around 0.9 units. A small cosmetic arc is acceptable only when the collision trajectory remains visually consistent. Do not add unrestricted vertical aiming.

The server performs swept-volume collision checks or an equivalent continuous approach. A visible fast ball must not pass through a player between simulation steps.

A live ball damages at most one opponent. On a valid hit, wall impact, or maximum travel, it becomes spent and then available as a pickup after a short recovery. A ball cannot repeatedly damage the same player while resting against their capsule. It does not damage its owner during its live throw.

The first valid hit removes one life and causes a brief stumble and protection period. The second eliminates the player. A protected player has an unmistakable outline/timer, not hidden immunity.

Do not implement hitscan or casually apply hitscan rewind logic to these travelling projectiles. Current server simulation is the initial authority for collisions. Client animation can anticipate a throw, but only the server awards a hit. Measure delayed-network behaviour before claiming competitive latency compensation.

## 12.5 End conditions

The last surviving player wins. If more than one survives at 90 seconds, start at most 30 seconds of clearly announced sudden death: one-hit elimination and a gradually contracting legal area.

The arena never shrinks to an invisible point. Show its actual boundary and warning period before contraction.

After the extension, rank remaining tied survivors by the published rule: remaining lives first, then valid hits dealt. Preserve an exact tie as a draw/shared top placement. In Knockout, a drawn final offers a rematch rather than fabricating a sole winner.

Process simultaneous hits as a batch. Two players hit in the same fixed step can both be eliminated. Do not use iteration order to decide who was allowed to throw.

Earlier elimination groups receive lower places. Apply the shared tie-scoring policy in Festival Cup.

## 12.6 HUD and effects

Show two large life pips, carried-ball state, clear aim feedback, time, and surviving count. Hit feedback is comic and non-graphic. Show a direction indicator for nearby incoming balls only if it is derived from actual state and not cluttered.

## 12.7 Bots and tests

Bots search for available balls, reposition, aim with bounded error, and dodge after a plausible reaction delay. They do not see hidden information or receive instant perfect aim.

Test simultaneous pickup, repeated throw commands, possession timeout, projectile tunneling, wall collision, no owner hit, invulnerability, simultaneous final hits, shrinking boundary, timer/draw handling, and two-browser agreement on every registered hit.

## 12.8 Intended appeal and risk

Test whether baiting, dodging, and counter-throwing feel readable and skillful. The main failure is an apparent successful dodge that the server scores as a hit. Test this on phones and delayed connections before adding effects or extra mechanics.

---

# 13. GAME 4: SEVEN STONES / EZHU KAL

## 13.1 Identity and objective

**Tamil:** ஏழு கல்  
**Subtitle:** Stack and Scatter  
**Category:** Team objective  
**Controls:** Move + Jump + contextual Pick Up/Place or Pick Up/Aim/Throw  
**Participants:** 4, 6, or 8, in equal teams  
**Festival size:** 4 versus 4  
**Round structure:** Two heats, each up to 90 seconds, with a short role swap

Attackers: **“Rebuild all seven stones while dodging the defenders.”**  
Defenders: **“Use the balls to interrupt the builders before time runs out.”**

## 13.2 Arena and team readability

Build a compact sand courtyard around 22×18 units with a central stack base, clear collection routes, low cover, and separated spawn regions.

Team Ocean uses a diamond badge. Team Mango uses a triangle badge. Show color, shape, and the role word BUILDER or DEFENDER. Role is not permanently tied to team color.

Use an authored, mirrored scatter pattern with seven reachable stone locations. Give both teams the same pattern, mirrored appropriately, during their attacking heat. Do not randomly give one team a much easier layout.

## 13.3 Heat start

For version 1, begin each heat with a short **scripted** knockdown animation. Then scatter stones into validated positions and start the 90-second interactive rebuilding window.

This deliberately removes a separate opening-throw subgame. Label it as an adaptation. Do not pretend a player's input caused the scripted opening. An interactive knockdown can be evaluated later.

Builders and defenders receive the same countdown and a brief, visible opening protection window for builders if needed by the authored spawn layout. Apply that same rule in both heats.

## 13.4 Builder rules

Each builder carries at most one stone. Within roughly 1.2 units, Action picks up an available stone. Carrying reduces speed modestly, initially from 5.5 to about 4.6 units/second.

Near the central stack, Action starts a placement lasting about 0.45 seconds. The player must remain in range and not be stunned. A completed placement snaps the stone into the next valid slot.

All seven stones are equivalent gameplay items. Their identity prevents duplication, but players do not need to solve a size-order puzzle. The renderer can show a visually stable tapered stack.

A hit drops the carried stone at a reachable position, causes a short stun around 0.65 seconds, and gives visible protection around 1.5 seconds. The builder quickly returns to play; no player sits out the entire heat.

Once placed, a stone stays placed during that heat. Defenders cannot repeatedly knock the completed portion down. The challenge is interrupting deliveries, not making progress infinitely reversible.

## 13.5 Defender rules

Provide two shared balls for 4v4, and tune one or two for smaller valid teams. A defender carries only one. Reuse the Eripandhu aiming/projectile component with a different hit consequence.

Only defenders can use these balls. Only builders can pick up stones. Friendly hits do not stun defenders. Defenders cannot steal stones or physically body-block the stack because solid player blocking is disabled.

No permanent ability lets a defender stand on the stack and make delivery impossible. Test cover placement, throw angles, placement duration, and post-hit protection together.

## 13.6 Atomic item state

Each stone has exactly one of these states:

```text
GROUND(position)
CARRIED(playerSlotId)
STACKED(stackSlotIndex)
```

Transitions are server-owned. A stone cannot simultaneously be on the ground and in a hand. A repeated packet cannot add it to the stack twice.

Cancel a placement safely when the carrier is hit, disconnects, moves away, or the heat ends. Dropped stones must recover to a nearby valid ground position if their previous position is unreachable.

Use slot-based stacking. Do not simulate seven freely balancing rigid bodies and make network wobble decide the round.

## 13.7 Role swap and winner

The first heat ends when seven stones are placed or 90 seconds elapse. Clear live projectiles and transient state, show a short role-swap briefing, and run the second heat with roles reversed.

Compare the teams' attacking performances in this order:

1. More stones successfully stacked.
2. If both completed seven, lower completion time.
3. If both stopped at the same positive partial count, earlier time at which that count was reached.
4. If still exactly equal, declare a draw.

A team with zero stones has no artificial best completion time. Equal zero-progress performances are a draw.

Festival scoring is 65 per winning teammate, 25 per losing teammate, or 45 per player for a draw. The round awards once after both heats, not once per heat.

Seven Stones is not eligible for the initial Knockout Cup. Do not invent an arbitrary individual finalist from a team result.

## 13.8 HUD

Show role, heat number, remaining time, seven distinct stack slots, carried item, teammate labels, and a short role-specific instruction. At role swap, replace the instructions and Action label immediately.

The result panel shows both attacking counts and relevant times, followed by the reason one team won or the round drew.

## 13.9 Bots and tests

Builder bots spread across available stones, avoid selecting the same item where possible, and attempt legal deliveries. Defender bots seek balls and choose targets based on visible positions. They must obey pickup range and inventory limits.

Test duplicate pickup, simultaneous placement, hit during placement, disconnect while carrying, all seven item identities, completed stack protection, end-of-heat cleanup, mirrored reset, role permissions, scoring only once, equal-team validation, and a complete two-heat 4v4 match.

## 13.10 Intended appeal and risk

Test whether distraction, delivery, and defense create meaningful teamwork, especially near the final stone. The major risks are confusing roles, impossible stack camping, and one selfish player receiving all the reward. The UI and equal team scoring must directly address those risks.

---

# 14. GAME 5: PAANDI

## 14.1 Identity and objective

**Tamil:** பாண்டி  
**Subtitle:** Chalk-Hop Challenge  
**Category:** Precision race  
**Controls:** Move + Jump + Retrieve marker  
**Initial maximum gameplay duration:** 105 seconds

Objective: **“Hop through the grid, skip the marker, return, and collect it.”**

Unlike Pachai Kuthirai's momentum and vaulting, this game emphasises landing placement, route reading, and the out-and-back sequence.

## 14.2 Map and art

Use a clean chalk playground in a fictional school courtyard. The main materials are warm stone/earth and cream chalk, with restrained cyan/yellow route markers.

Build three short grid sections connected by safe paths. Each section has an outward leg, turnaround, return leg, marker retrieval, and exit checkpoint.

Use a recognisable single/double-cell pattern. Treat a paired row as one wide support group with a drawn internal chalk division, so a character landing centrally is not punished by an invisible gap.

Initial cell size can be around 1.35 units with about 0.1 units between successive groups. A required skipped single row spans approximately 2.9 units between landing centers, which must remain reachable with the shared controller.

## 14.3 Marker and route

Choose a marked single cell from a validated set using the round seed. Every player receives the same challenge sequence. Do not randomize an easier course independently for each player.

On the outward leg, the marked cell is forbidden. The player must hop over it and continue through the required ordered groups to the turnaround.

On the return leg, the player reaches the designated neighbouring group, uses Action to retrieve the marker, and may then pass through the previously marked cell on the way back.

Marker possession is per-player progress for this race, not a single shared object another player can steal. Make each local player's marker state visually clear without misleading others about their own progress.

## 14.4 Hopping validation

The animation handles one-foot and two-foot poses. Do not require independent limb controls or one-foot physical balancing.

The gameplay controller still requires a legal hop between the appropriate groups. Merely walking across every line or running around the outside must not complete the puzzle.

Track takeoff group, landing group, leg, required next gate, and retrieval state. Use the character's foot-center/ground-support position with a modest documented edge tolerance, not its full body width, to determine a valid landing.

Do not use pixel-perfect chalk lines as collision rules. The visible target and legal landing region must agree.

Skipping a required unmarked group, landing on the forbidden marker, or leaving the grid incorrectly resets the current section after a short, readable failure animation. Keep previously completed sections.

## 14.5 Progress and finishing

The server validates outward gates, turnaround, return gates, and marker retrieval before completing a section. A player cannot press Retrieve from the other end of the map.

After all three sections, cross the final finish gate. Use authoritative completion time for finishers.

Apply the same race cap and post-first-finish grace principle as Pachai Kuthirai. Rank unfinished players by validated section, leg, and gate progress, not straight-line distance to the finish, because this is an out-and-back course. Exact ties share places.

Support Festival, Single, and the first round of Knockout.

## 14.6 HUD and camera

Show section 1/3, OUTWARD or RETURN, the next required group, and the marker retrieval prompt when legal. Use a stable elevated camera, short route arrows, and enough ground visibility to judge the next landing.

Do not rotate the camera abruptly at the turnaround. Touch movement should remain understandable.

## 14.7 Bots and tests

Bots follow the gate graph, jump legally, skip the designated marker, turn, and retrieve it at the correct point. Use ordinary inputs and plausible timing error.

Test forbidden landings, walking shortcuts, skipped required gates, paired-row landings, edge tolerance, retrieval distance/phase, current-section-only reset, synchronized marker seeds, and correct progress ordering on both legs.

## 14.8 Intended appeal and risk

Test whether clean sequences feel satisfying and visibly improve with practice. The major risks are strict invisible landing rules and a camera that makes touch players misjudge the grid. Fix those before adding harder patterns.

---

# 15. Multiplayer authority, state, and lifecycle

## 15.1 Authority model

```text
Browser A ─┐
Browser B ─┼─ Input commands -> Local Colyseus PartyRoom
Phone C   ─┤                     -> authoritative fixed simulation
Other users┘                     -> validated round state/results
            <- state patches and events <-
```

One PartyRoom owns the group from lobby through every round and rematch. Changing games does not require every user to independently find a new room.

Clients send intentions: movement, jump, action, aim, ready, allowed vote, or host settings requests. They do not send authoritative position, score, finish time, damage, winner, or ownership claims.

Colyseus synchronizes server-owned room state to clients. Keep important phase and result data in recoverable state, not only transient messages that a reconnecting client might miss. [R11]

## 15.2 Phase machine

Use explicit legal transitions:

```text
LOBBY
  -> VOTING (Festival vote policy only)
  -> ROUND_SELECTED
  -> LOADING
  -> BRIEFING
  -> COUNTDOWN
  -> PLAYING
  -> ROUND_RESULTS
  -> next round selection, or MATCH_RESULTS
  -> LOBBY
```

Seven Stones has internal heat phases inside PLAYING; its role swap is not a sixth Festival round.

Handle initialization failure, cancellation before play, no-contest, and cleanup explicitly. Every asynchronous callback checks the current match/round ID before mutating state.

## 15.3 Timing

Initial fixed simulation rate: 60 steps/second. Initial state patch rate: around 20 updates/second. Rendering follows the device's animation loop.

Generate input consistently with the chosen Colyseus fixed-input integration. One authoritative fixed-step timeline owns movement and game timers. Do not create another independent input loop when using the framework's prediction driver. [R7, R12]

Use simulation ticks for hazard activation, cooldowns, placements, projectile life, gameplay deadlines, and event ordering. Use monotonic wall time for connection/loading deadlines where appropriate, not the user's editable wall clock.

Do not advance gameplay using a variable browser frame delta or client-supplied delta. Cap catch-up work safely, expose overload diagnostics, and do not skip lethal hazards silently after a server stall.

## 15.4 Prediction and reconciliation

Predict only responsive local movement and safe anticipatory presentation. Reconcile against authoritative state and acknowledged input, replaying legitimate pending inputs through the same movement rules.

Interpolate remote transforms using a small configurable buffer, initially around 100 milliseconds. Tune after measurements. Do not extrapolate an absent player indefinitely.

Use the installed Colyseus version's physics/composite prediction integration where appropriate. Do not pretend that copying position alone restores every relevant character-controller state. Velocity, grounded/buffer state, movement mode, and predictable obstacle phase must reconcile as well. [R13]

Start with static arena collision and server-owned game interactions. Never promise zero correction or full deterministic rollback without testing the actual implementation and package combination.

## 15.5 State contents

Maintain server-owned identifiers and fields for:

```text
Room:
  roomCode, buildVersion, contentVersion, settingsRevision, hostSlotId,
  phase, matchId, roundId, roundNumber, format, selectionPolicy,
  selectedGameId, roundSeed, serverTick, phaseDeadlineTick,
  remainingGameIds, targetQualifiers, resultRevision

Player slot:
  slotId, displayName, controllerKind, connected, ready,
  teamId, position, velocity, facing, movementMode,
  alive, qualified, lives, carriedItemId, checkpoint/progress,
  stunUntilTick, protectionUntilTick, totalCupPoints

Round-specific:
  surface wave, race progress, projectile/ball state,
  Seven Stones heat/roles/stone states, Paandi gate/marker progress

Results:
  immutable outcome ID, placement/tie groups, qualifiers,
  metric evidence, awarded points, reason/draw/no-contest status
```

Synchronize only what clients actually require. Keep reconnection credentials private. Future hidden hazard choices do not belong in bot observations.

## 15.6 Command validation

Reject commands with invalid schemas, excessive size, impossible values, stale round IDs, invalid phase, insufficient permission, or duplicated action identity.

Normalize movement magnitude, clamp aim values, enforce jump/cooldown eligibility, and validate interaction range and line of sight. Reject NaN/infinity. Do not allow a modified browser to award itself inventory or health.

Rate-limit input and room-management requests. Bound input queues. If input stops arriving, replace held movement with neutral input after roughly 250 milliseconds.

Order command handling by the authoritative tick and documented action resolution, not arbitrary client timestamps. Resolve simultaneous item claims atomically.

## 15.7 Reconnection and departure

Use the compatible SDK's reconnection mechanism rather than creating a second room on every network drop. A page reload and a temporary drop require different client handling; preserve and refresh the valid reconnection token privately, and reattach listeners when a new client Room object is created. [R15]

Initial policy:

- Reserve a disconnected human's seat for 15 seconds.
- Stop stale input quickly; the character remains vulnerable and does not become invincible.
- Cancel pending placement and release carried items safely on confirmed drop.
- Reconnection within the grace period resumes the same slot, lives, progress, and current phase.
- After expiry, a CPU may take over that existing slot for the remainder of this casual prototype match, preserving its actual health/alive state. An already eliminated slot is not revived.
- Label the replacement as CPU. Do not attribute its later win to a human who has left.
- No new human joins an active match in version 1; only valid reserved-seat reconnection is allowed.

After five seconds of host disconnection, transfer lobby-host permission to the longest-connected remaining human. A rejoining old host does not automatically steal that permission back.

Host permission transfer is not server migration. If the server process or host machine stops, show a clear lost-server screen. Do not claim the match continued elsewhere.

Dispose of rooms that have no human connections/reservations after a short documented timeout. CPUs must not keep abandoned rooms alive forever.

## 15.8 Cleanup

At round end, remove old projectiles, controllers, event listeners, physics bodies, pending interactions, render resources, and timers. Keep only the persisted match/room information that is meant to survive.

Test several complete Cups and rematches without growing listeners, duplicated action handlers, extra physics worlds, or repeated score awards.

---

# 16. Bots, audio, accessibility, and performance

## 16.1 Bots

Implement server-side bots with the same legal movement/action pathway, speed, cooldown, inventory, and collision rules as humans.

Use map-authored navigation/gate graphs for the initial environments rather than introducing a large navigation system without need. Give bots bounded reaction delays, aim error, and route preferences. Do not use an external language model to play a real-time round.

Separate **server CPUs** used to fill gameplay slots from **network test clients** used to test connections. Eight server CPUs do not prove eight independent clients can connect correctly.

## 16.2 Audio and localization

Provide menu feedback, countdown, jump/land, vault, surface call cue, ball throw/hit, stone pickup/place, qualification, elimination, and celebration sounds.

Use original or properly licensed audio. An optional Tamil voice call must be clearly intelligible and text-backed. Do not synthesize unsupported cultural lyrics or use popular film music as a shortcut.

Use one music loop at a time, restrained volume, and separate master/music/effects controls. Respect the initial audio user-gesture requirement. [R14]

Localize the five game names and essential gameplay instructions in English and Tamil. Centralize strings. Mark unreviewed translations for human review rather than claiming native-language quality verification.

## 16.3 Accessibility

Support color-plus-shape cues, legible text, reduced motion, optional shake, strong focus states, keyboard menus, remappable/configurable control bindings where practical, and touch targets that do not overlap.

Never make an audio-only call decide a round. Do not hide the reason for a failed jump or disallowed action.

## 16.4 Initial performance targets

Treat these as goals to measure on named devices, not guaranteed results:

```text
Desktop target:       approximately 60 FPS during an eight-player round
Mobile low preset:    sustained approximately 30 FPS on the tested phone
Server step budget:   preferably below 8 ms at the 95th percentile
Draw-call budget:     aim near/below 100 for the initial active scene
Initial asset budget: aim below 20 MB of compressed first-play resources
```

Record actual hardware, browser, participant count, quality, median/p95 frame and server timings, and correction frequency.

Use instancing for repeated props, simple colliders, modest textures, limited shadow casters, and a capped render pixel ratio. Scale visual quality rather than changing movement or hitboxes. Three.js' responsive rendering guidance explains the need to handle canvas size and drawing-buffer resolution deliberately. [R16]

Do not require WebGPU. Provide a supported WebGL rendering path and a friendly unsupported-device message. Do not claim mobile performance from desktop viewport emulation.

---

# 17. Test plan and acceptance criteria

## 17.1 Automated test layers

Unit tests cover state transitions, readiness, settings revisions, eligibility, vote counts, seeded selection, scoring, ties, action validation, item state, race progress, and reset behaviour.

Headless integration tests create actual SDK connections to a real local server. Test rooms with eight independent clients, not just eight objects in one array.

Playwright tests use at least two separate browser contexts for create/join/ready/start/play/results/reconnect. Browser fixtures may launch both frontend and backend processes; Playwright supports multiple local web-server configurations. [R17]

Provide eight-client load sessions and a repeated-Cup cleanup soak. Add a test-only latency/jitter mechanism or transport/proxy harness that actually affects game messages. Browser offline toggling is not a substitute for a real delayed-message test.

## 17.2 Acceptance matrix

| Area | Required evidence |
|---|---|
| Clean installation | Fresh install, lockfile, documented runtime, no missing asset dependencies |
| Startup | One command starts client/server; health and LAN URLs are correct |
| Real multiplayer | Two browsers see and affect the same authoritative round |
| Eight connections | Eight independent test clients complete valid room flow |
| Host permissions | Non-host cannot edit settings, start, or change selected map |
| Readiness | Settings change invalidates readiness; bad roster cannot start |
| Round selection | Fixed, shuffle, and implemented vote policy produce one shared selection |
| Loading | No client starts before the content barrier; failures return clearly to lobby |
| Controls | Keyboard and real multi-touch actions operate correctly |
| Authority | Clients cannot forge position, points, hits, item ownership, or finish |
| Kalla Manna | Calls, safe support, airborne handling, ties, and cap are correct |
| Pachai Kuthirai | Legal vaults, ordered checkpoints, resets, and finish ordering work |
| Eripandhu | Atomic balls, reliable collisions, two hits, protection, and draw handling work |
| Seven Stones | Two fair heats, atomic seven-stone states, role swap, and single scoring work |
| Paandi | Ordered out/back gates, skipped marker, retrieval, and section reset work |
| Festival Cup | All five played once, eight return each round, correct totals and ties |
| Knockout Cup | Eligible race -> survival -> dodgeball, including boundary ties |
| Reconnect | Same slot/health/progress returns within grace; no duplicate entity |
| Host departure | Permission transfers without pretending the game server migrated |
| Server shutdown | Honest error rather than an endless fake loading screen |
| Rematch | New IDs and clean round state; no extra point awards or listeners |
| Mobile | Actual device tested separately from browser viewport screenshots |
| Performance | Named-device results, not unsupported FPS claims |
| Assets | Original/licensed assets recorded; no copied branded game files |

## 17.3 Manual playtest questions

Run exploratory sessions with both people familiar with these childhood games and people unfamiliar with them. Do not treat a small convenience sample as a market forecast.

Observe whether players can explain the objective after trying a round, understand why they lost, voluntarily request another attempt, and still enjoy it after several repetitions. Vary presentation order so the first game does not receive all the novelty benefit.

For each game, record confusing moments, repeated failure points, time spent spectating, rematch preference, controller complaints, and whether the recognisable childhood mechanic survived the adaptation.

## 17.4 Honest reporting

Do not mark an item passed merely because it compiled or a screen exists. Distinguish:

```text
Implemented and automatically tested
Implemented and manually tested
Implemented but not verified on a physical device
Partially implemented
Not implemented
Blocked, with a concrete reason
```

If physical phones, multiple machines, a particular browser, or network impairment tools are unavailable, say so. Do not invent test results, screenshots, frame rates, or successful LAN sessions.

---

# 18. Milestone execution order

## Milestone 1: Foundation and actual shared movement

Create the repository, dependency/version record, local scripts, minimal home/create/join/lobby, one PartyRoom, fixed-step movement, basic camera, original placeholder character, readiness, and a shared test courtyard.

Exit evidence: two independent browsers join the same room, move separately, see consistent positions, and reconnect without creating duplicate players. All security/validation basics apply already.

Do not begin five map implementations before this works.

## Milestone 2: Kalla Manna vertical slice

Implement the first complete round from lobby through selection, loading, play, spectating, results, and rematch. Add its bots and rules tests.

Exit evidence: a playable eight-participant round with authoritative calls and eliminations. This establishes the reusable round shell.

## Milestone 3: Pachai Kuthirai

Add race progress, checkpoints, controlled vaults, bots, and ranking. Reuse shared movement and results rather than forking them.

Exit evidence: two route branches are actually completable and results agree across clients.

## Milestone 4: Eripandhu

Add shared ball/item and projectile systems, aiming controls, lives, stun/protection, collision tests, and final-round handling.

Exit evidence: actual browser-versus-browser play with matching hit outcomes and tested possession edge cases.

## Milestone 5: Seven Stones

Reuse the ball system. Add stone ownership, carry/place state, fair team assignment, mirrored heats, role swapping, and team scoring.

Exit evidence: a full 4v4 two-heat round without duplicate items or duplicate scoring.

## Milestone 6: Paandi

Add the hopscotch gate graph, marker state, out/back progress, retrieval, section resets, and legal bot navigation.

Exit evidence: legitimate full completion plus rejection of walking and retrieval shortcuts.

## Milestone 7: Match formats and selection

Connect the fixed five-round Festival Cup, correct scoring, and the three-round Knockout Cup. Then add server shuffle and voting. Implement corresponding lobby controls only when their behaviours are real.

Exit evidence: a complete five-game Cup, a complete Knockout Cup, exact tie handling, and stable rematches.

## Milestone 8: Presentation and device polish

Apply the full palette, original character polish, animation, environmental kit, actual map thumbnails, sound, Tamil strings, responsive HUD, settings, and mobile touch polish.

The basic visual direction exists from Milestone 1; this milestone improves it without replacing working rules.

Exit evidence: inspected desktop and mobile layouts, and honest notes separating physical-device testing from emulation.

## Milestone 9: Reliability and handoff

Run integration, load, soak, delayed-message, and manual tests. Fix failures before adding more features. Complete documentation, known limitations, dependency versions, and asset licenses.

Exit evidence: reproducible local startup, real test outputs, and an accurate implementation checklist for every game and format.

---

# 19. Required handoff

Deliver the working source plus README, LAN_SETUP, ARCHITECTURE, GAME_RULES, DEPENDENCIES, ASSET_LICENSES, TEST_REPORT, PERFORMANCE_REPORT, KNOWN_LIMITATIONS, and IMPLEMENTATION_STATUS.

The README must answer:

- What is implemented and what is not?
- How do I install and start it on Windows or macOS?
- Which local address should a second device open?
- How do I create/join a room and choose the round policy?
- How do I practise a specific game with CPUs?
- What are the keyboard and touch controls?
- What should I do when a firewall, Wi-Fi isolation, or a missing asset blocks play?
- How do I run the automated tests and inspect the results?

At the end of each milestone, report changed files, commands actually run, tests and outcomes, unresolved issues, and the next milestone. Do not claim “production ready” for a local prototype.

The final standard is not resemblance in a screenshot. It is a group of players joining, understanding the round, controlling their characters, seeing the same outcomes, completing all five games, and starting another match without the system breaking.

---

# 20. Research references

These references ground the external facts and framework capabilities mentioned above. The actual game rules, palette, layout, scope, timing values, scoring, and build order are proposed design decisions in this specification.

**R1. Stumble Guys Help Center: New Custom Party.** Custom modes, map selection, rounds, codes, and CPU fill.  
`https://stumbleguys.helpshift.com/hc/en/4-stumble-guys/faq/261-new-custom-party/`

**R2. Stumble Guys Help Center: What are the available Maps?** Race, solo elimination, team elimination, and collection categories.  
`https://stumbleguys.helpshift.com/hc/en/4-stumble-guys/faq/103-what-are-the-available-maps/`

**R3. Tamil Virtual Academy: இளையோர் விளையாட்டுகள்.** Traditional children's game context and progressive Pachai Kuthirai description.  
`https://www.tamilvu.org/ta/courses-diploma-a081-a0814-html-a0814553-38218`

**R4. Node.js: Releases.** Runtime release/LTS status.  
`https://nodejs.org/en/about/previous-releases`

**R5. React Three Fiber: Introduction.** React/Fiber version pairing and rendering framework.  
`https://r3f.docs.pmnd.rs/getting-started/introduction`

**R6. Colyseus: Getting Started.** Current scaffolding, version-sensitive guidance, and real-time-action preset.  
`https://docs.colyseus.io/getting-started`

**R7. Colyseus: Netcode.** Authoritative simulation, native prediction, and version requirements.  
`https://docs.colyseus.io/netcode`

**R8. Rapier: Getting Started.** JavaScript compatibility package and asynchronous initialization.  
`https://rapier.rs/docs/user_guides/javascript/getting_started_js/`

**R9. Rapier: Character Controller.** Collision-corrected kinematic movement and controller capabilities.  
`https://rapier.rs/docs/user_guides/javascript/character_controller/`

**R10. Vite: Server Options.** LAN binding, strict ports, allowed hosts, CORS, and WebSocket origin considerations.  
`https://vite.dev/config/server-options`

**R11. Colyseus: State Synchronization.** Server-owned synchronized room state.  
`https://docs.colyseus.io/state`

**R12. Colyseus: Server Input & Fixed Timestep.** Fixed-step input integration.  
`https://docs.colyseus.io/netcode/server-input`

**R13. Colyseus: Client Prediction & Reconciliation.** Prediction, interpolation, and composite/physics simulation integration.  
`https://docs.colyseus.io/netcode/client-prediction`

**R14. MDN: Web Audio API Best Practices.** User-gesture/audio playback considerations and audio control.  
`https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices`

**R15. Colyseus: Reconnection.** Seat reservation, temporary drop, page reload, token refresh, and restored state.  
`https://docs.colyseus.io/room/reconnection`

**R16. Three.js Manual: Responsive Design.** Canvas sizing and rendering resolution.  
`https://threejs.org/manual/en/responsive.html`

**R17. Playwright: Web Server.** Starting one or multiple local servers for browser tests.  
`https://playwright.dev/docs/test-webserver`

Before implementing, verify installed versions against these official sources. Do not treat a date-stamped specification as a substitute for checking the actual dependency APIs.

---

# 21. First action

Read this entire specification, inspect the workspace, write the milestone plan and dependency choices, then implement Milestone 1. Demonstrate actual two-browser shared movement and reliable room lifecycle before continuing into the five mini-games. Keep the complete five-game scope visible in IMPLEMENTATION_STATUS.md throughout the build.
