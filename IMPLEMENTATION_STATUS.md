# Implementation status

Source of requirements: the supplied master specification in `docs/MASTER_SPECIFICATION.md` and the accepted desktop-first plan. Status is based on executed automated tests and inspected screenshots, not a claim of physical-phone or human-group acceptance.

| Milestone | Status | Evidence |
|---|---|---|
| 1 Foundation | Implemented; verified | Node 24.20.0, exact lockfile, native prediction, real two-Chrome movement/refresh, eight SDK clients, authority checks |
| 2 Kalla Manna | Implemented; verified | Shared calls, hazard support checks, CPU navigation, ties, real round/rematch and Cup journeys |
| 3 Pachai Kuthirai | Implemented; verified | Both routes complete via legal movement, checkpoint/vault tests, Chrome vault and Cup journey |
| 4 Eripandhu | Implemented; verified | Swept hits, atomic pickup, protection/timeouts/sudden death, two-browser pickup/throw/hit agreement |
| 5 Seven Stones | Implemented; verified | Two mirrored heats, seven identities, role restrictions, interruption before placement, one 360-point award |
| 6 Paandi | Implemented; verified | Three out-and-back sections, all marker seeds complete with shared physics, retrieval/reset/edge tests, Chrome round/Cup |
| 7 Cups and selection | Implemented; verified | Full two-Chrome Festival/Knockout; host order, shuffle, votes, full boundary ties, 1,800-point Cups and clean rematches |
| 8 Desktop presentation | Implemented; verified in Chrome | Original procedural assets/animation/audio, scene thumbnails, functional menus/wardrobe/settings, both desktop layouts |
| 9 Reliability and handoff | Implemented; verification recorded | Rule/soak and SDK recovery suites, traffic impairment, 30-minute eight-client session, clean offline install, built play and handoff docs |
| Physical Android / iPhone | Pending subsequent phase | Touch foundation exists; no physical-device result is claimed |
| Second physical LAN device | Pending | Host Chrome contexts and loopback SDK tests are complete |
| Tamil editorial review | Pending | Essential gameplay copy centralized in English/Tamil; decorative and administrative copy has English fallback |

## Subsequent device checklist

- [ ] Name and record Android device, OS and Chrome version.
- [ ] Name and record iPhone, iOS and Safari version.
- [ ] Join the host's actual LAN address from both devices.
- [ ] Verify independent movement, jump and aim pointers, cancellation and release.
- [ ] Check landscape HUD/safe areas and portrait rotation overlay.
- [ ] Check audio activation, browser optional-feature fallbacks and controls.
- [ ] Background/resume, disconnect/reconnect within and after 15 seconds.
- [ ] Run all five games and representative Cup/rematch journeys.
- [ ] Measure the low graphics preset against the approximate 30 FPS mobile target.
- [ ] Record human playtest feedback and review Tamil instructions.

See `TEST_REPORT.md`, `PERFORMANCE_REPORT.md` and `KNOWN_LIMITATIONS.md` for boundaries and measurements. `progress.md` retains the implementation record.
