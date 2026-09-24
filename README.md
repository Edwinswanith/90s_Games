# Theru Party

A local 3D multiplayer party game with five digital adaptations of Tamil childhood games: **Kalla Manna, Pachai Kuthirai, Eripandhu, Seven Stones, and Paandi**. One authoritative server supports up to eight humans/CPUs. Includes Single Game practice, Festival Cup, Knockout Cup, host ordering, shuffle, voting, spectators, reconnection, shared results, and rematches.

The desktop implementation is intended for **Mac Chrome first**. Original procedural characters, environments, animations, music and effects run locally. Personal settings and outfit choices stay on the device. No accounts, payment, chat, remote services, or persistent match database are involved.

## Start on this Mac

Dependencies and a project-specific Node **24.20.0** runtime have been installed. From this directory:

```sh
./start.command
```

Open **http://localhost:2567** in Chrome. Keep the terminal open. Stop with Control-C. The built launcher serves the application and game networking on the same port. If a development server already owns port 2567, stop it first.

## Fresh installation: macOS, Windows, Linux

Prerequisite: an existing Node installation capable of running the setup script (Node 22 or newer). The setup downloads and verifies the official project-local Node 24.20.0 archive, installs pnpm 10.29.2 locally, installs the frozen dependency lockfile, and builds the application. It does not change another project's Node runtime.

```sh
node scripts/setup.mjs
```

Then run `./start.command` on macOS, `start.cmd` on Windows, or `npm run local`. First installation needs internet access to obtain tools and dependencies. Once installed and built, local play needs no internet connection. Windows/Linux launcher paths are provided; execution on those operating systems remains unverified.

For development, activate Node 24 first, then run:

```sh
export PATH="$PWD/.runtime/node/bin:$PATH"
node .runtime/tools/node_modules/pnpm/bin/pnpm.cjs dev
```

Development uses browser port **5173** and server port **2567**. The terminal prints the machine's actual interface addresses. Use `pnpm build` after source changes before starting the built launcher; if pnpm is not on PATH, use the project-local command above with `build` instead of `dev`.

## Play together

1. Create a party, choose a mode, and open the courtyard. Festival is selected by default.
2. Give friends the room code and the **host computer's LAN URL**, such as `http://192.168.1.9:2567` for the built launcher. `localhost` on a friend's device points to their own device.
3. Friends choose Join, enter the code, and join explicitly. Sharing a URL prefills the code; it contains no reconnection token.
4. The host uses Players / Rounds / Rules to configure the room. Changing settings clears readiness. Every human, including the host, must ready before Start.
5. CPUs fill empty seats when enabled and are labelled CPU. Cups contain eight logical participants. Single Game accepts 2–8; Seven Stones accepts 4, 6, or 8 in balanced teams.
6. After results, the host returns to the same lobby. Ready again for a fresh match.

**Practice:** choose “Practise a game with CPUs” on Home, select the game, and open the courtyard. The Games library also offers a practice button for every game. In Festival, host order provides accessible up/down controls; Shuffle generates one server permutation; Vote opens ten-second ballots among unplayed games.

## Controls and settings

| Input | Action |
|---|---|
| WASD / arrows | Move |
| Space | Jump; contextual vault near a crouching NPC |
| E | Pick up, place, retrieve, or throw toward facing |
| Hold mouse on playground, then release | Aim and throw; click near a ball to pick up |
| Escape | Personal menu; the shared game keeps running |
| F | Fullscreen, with browser fallback |
| F3 in development | Read-only movement, prediction and rendering diagnostics |

Paandi requires hopping between highlighted groups. Use short movement taps for nearby groups and retain momentum for the marked-cell skip. On return, press E beside the marker before crossing its cell. Previously completed sections remain saved after a mistake.

The host chooses CPU skill in Rounds: Relaxed, Street or Legend. Harder CPUs pay more street XP, and every CPU gets a different seeded personality each round. Settings include draft Tamil UI/objectives, master/music/effects volume, three graphics presets, reduced motion, and optional screen shake. Wardrobe presets change appearance only. Touch controls provide an independent movement stick, Jump, and an Action/aim control on coarse-pointer devices. **Physical Android and iPhone testing is still pending**; responsive emulation is not device acceptance.

## Troubleshooting

- **Port occupied:** stop the other server. No process is killed automatically. See `.env.example` for port overrides.
- **Friend cannot connect:** use the host's actual Wi-Fi/Ethernet IPv4 address; keep both devices on the same LAN; permit Node through the local firewall. Guest Wi-Fi/client isolation can block device-to-device traffic. Details are in [LAN_SETUP.md](LAN_SETUP.md).
- **Room not found/full/started:** the code belongs to one running server, the selected seats may be occupied, or a match may already be active. New humans join in the lobby; only a valid reserved seat reconnects during a match.
- **Dropped connection:** the slot remains reserved for 15 seconds. Refresh uses private per-tab session storage. After expiry, a match slot becomes a CPU without restoring health or progress. Rooms disappear 30 seconds after no humans/reservations remain.
- **Missing assets:** rerun setup/build. A content-loading timeout returns the room to the lobby with a specific reason. Enable WebGL in Chrome if the capability screen reports it unavailable.
- **Audio silent:** click/tap once to activate browser audio, then check the personal volume sliders.

## Verification and project records

With the project runtime active:

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm test:integration
# Keep pnpm dev running for browser suites:
pnpm test:e2e
pnpm test:impairment
pnpm test:load               # Dedicated server, eight SDK clients, 30 minutes
```

With the built launcher running instead of development servers, `node tests/e2e/built-launcher.mjs` checks two independent Chrome clients on port 2567. `node tests/e2e/distribution.mjs` creates its own clean test installation and server on port 2589.

Browser tests use the installed Google Chrome channel. The focused game action runner is in `scripts/game-action-runner.mjs`; it supplements the multi-context browser tests. Its fallback waits in real time. The normal browser cannot advance the shared simulation clock.

Test captures and detailed run data live in `artifacts/` (generated and ignored by Git). See [TEST_REPORT.md](TEST_REPORT.md), [PERFORMANCE_REPORT.md](PERFORMANCE_REPORT.md), [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md), and [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md) for actual evidence and pending work. Architecture, rule definitions, dependencies and licensing are documented separately.
