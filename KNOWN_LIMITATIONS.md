# Known limitations and remaining acceptance work

The five-game desktop application and all three match formats are implemented. These limits remain explicit:

1. **Physical phones are unverified.** Touch controls, responsive styles, a portrait rotation panel and independent pointer handling exist. Android Chrome and iPhone Safari must still be tested on named physical devices, including safe areas, aiming/jumping together, audio activation, background/resume and frame rate. Desktop emulation does not satisfy this.
2. **A second physical LAN device is unverified.** Multiple independent Chrome contexts and eight SDK clients were tested on the same Mac. Actual router/firewall/client-isolation behavior must be checked on the intended LAN.
3. **Tamil copy is draft.** Game names, essential controls, detailed game guides, HUD prompts, round-result explanations and gameplay failure feedback have centralized Tamil strings. Some decorative menu copy and administrative connection errors retain English fallback. Native-speaker review and the remaining non-gameplay copy pass are pending.
4. **Windows/Linux execution is unverified.** Reproducible setup and launch paths are provided, but the executed installation/build/browser evidence is macOS only.
5. **Human play balancing remains.** Movement and map routes are tested against the real shared controller; this is not a claim that the initial timings, difficulty, CPU skill, or rule adaptations have been validated by a group playtest. Paandi requires deliberate short steering taps and momentum for skips. Players can overlap because solid player blocking is intentionally disabled; nameplates can overlap in a crowd.
6. **Local-server lifetime.** Matches exist only in memory. Stopping the server ends the room; there is no migration between servers, persistent score database, public matchmaking, account system or online deployment.
7. **WebSocket networking.** The tested transport is ordered/reliable. Actual WebSocket traffic was tested with 100/200 ms added RTT and seeded jitter. This does not establish behavior on every Wi-Fi network or under arbitrary packet loss; there is no historical hit rewind or cross-region netcode target.
8. **Tooling warnings.** The installed rendering integration emits a Three.js Clock deprecation warning. Vite warns about the combined first-play bundle size; measured compressed resources remain below the target. The optional msgpack native extraction addon is not required for the verified path.

No incomplete store, fake currency, paid feature, external notification, chat, ranking service, database or mobile-store package is displayed as available.
