# Desktop performance report

Measured on **2026-09-08** using the installed Google Chrome **152.0.7977.77** on an **Apple M1 Mac, 8 GB RAM, eight logical CPUs, macOS 14.5**. These are local desktop measurements, not physical-phone results.

## Rendering

Actual Chrome runs used a **1920×1080 viewport**, the **medium** preset and a maximum device pixel ratio of **1.5**. Every room contained eight logical participants: one human browser client and seven server-controlled CPUs. In the captured Eripandhu interval, five participants remained alive; the other games had eight. The browser used a real clock, not the game action runner's fallback timing.

| Game | Mean sampled FPS | Highest sampled rolling frame p95 | Maximum sampled draw calls |
|---|---:|---:|---:|
| Kalla Manna | 58.36 | 17.0 ms | 50 |
| Pachai Kuthirai | 58.91 | 24.6 ms | 37 |
| Eripandhu | 59.90 | 29.8 ms | 47 |
| Seven Stones | 59.95 | 32.2 ms | 50 |
| Paandi | 59.82 | 33.6 ms | 51 |

After a two-second gameplay warmup, the harness sampled seven times, approximately one second apart, while the phase was PLAYING. FPS and frame p95 use the latest 300 animation-frame intervals, so adjacent samples overlap. The table reports the mean of the sampled FPS values and the maximum sampled p95/draw-call values. This is a short rendering check, not a GPU profiler or a whole-match frame-time distribution. The slower p95 intervals in later scenes remain visible evidence of occasional uneven frames despite an approximately 60 FPS mean.

The approximate **60 FPS** and **100-or-fewer draw calls** desktop targets are met in these samples. Instanced procedural geometry and shared materials keep draw calls low. Captures and data are in `artifacts/performance/`; `node tests/e2e/capture-performance.mjs` reproduces the capture with development servers running. The final Tamil-copy and audio-cue wiring followed this capture; it did not change geometry or simulation. A final Chrome check covers that presentation wiring separately.

## Authoritative server

The real-clock load session ran **1,802.522 seconds** with **eight independent SDK connections**, completing **seven matches: four Festivals and three Knockouts**. Health was sampled 180 times.

- Highest reported rolling simulation-step **p95: 4.792 ms**, below the **8 ms** target.
- Eight character bodies at the sampled points; no growing character-body count across rounds or rematches.
- First sampled process RSS: **89.83 MiB**; last: **46.75 MiB**. Garbage collection affects these values; two endpoints alone are not a memory-leak proof.
- This measures the room's authoritative stepping, not browser rendering, network RTT or every possible simultaneous-room load.

See `artifacts/load/report.json` and `pnpm test:load`. Twenty additional deterministic complete Cup matches check duplicate awards and cleanup under repeated transitions.

## Installed resources and offline play

The final built client's conservative gzip-equivalent inventory is **2,004,518 bytes (2.005 MB decimal)**. This counts each JS/CSS file by the actual generated `.gz` size and every other file at its on-disk size. It includes all five thumbnails, all font alternatives, and license texts, even though these are not all needed for the first gameplay screen.

| Resource group | Bytes |
|---|---:|
| Main JS, generated gzip | 1,485,766 |
| CSS, generated gzip | 5,063 |
| WOFF2 font files | 74,996 |
| Five actual-scene WebP thumbnails | 187,972 |
| Bundled license/notice files | 155,289 |

The complete inventory is in `artifacts/resource-sizes.json`. The conservative total is below the **20 MB compressed first-play** target. Rapier is bundled with the client; fonts, visuals and audio need no external runtime requests. The built server actually serves gzip JS/CSS, verified in a clean-directory installation with non-local browser requests blocked. Dependencies and Node must first be downloaded or supplied from an existing cache.

## Subsequent measurements

Physical Android Chrome and iPhone Safari remain pending. Record device model, OS/browser, participant count, preset, frame-time samples, audio activation and background/resume results before assessing the approximately 30 FPS phone target. A second physical LAN client and human group balancing are also pending; localhost browser contexts cannot establish those results.
