# Local network setup

Run one authoritative server on the host. Built mode serves both assets and networking on port 2567. Development serves the browser application on 5173 and game traffic on 2567. Leave the host process running throughout the party.

The development terminal prints actual interface addresses. On this test Mac the Wi-Fi address was **192.168.1.9**; this can change. Verify it in macOS Network settings or with `ipconfig getifaddr en0`. On Windows use `ipconfig` and choose the active Wi-Fi/Ethernet adapter's IPv4 address. Avoid VPN, loopback and disconnected interfaces.

A second device opens `http://HOST_IP:2567` in built mode or `http://HOST_IP:5173` in development. It uses the six-character code from that same server. The client derives its networking host from the browser URL; it never assumes another device's `localhost` refers to the server.

The invitation button copies the current application origin plus `?room=CODE`. When opened through localhost it warns that friends need the printed LAN address. Tokens are stored privately per browser tab, never in invitations or public synchronized state.

## Environment

Copy `.env.example` to `.env` if overrides are needed. The server reads it at startup; Vite reads project-root environment values at build/start time.

| Variable | Purpose |
|---|---|
| `GAME_SERVER_HOST` | Bind interface, default `0.0.0.0` |
| `GAME_SERVER_PORT` | Game networking and built assets, default `2567` |
| `CLIENT_PORT` | Vite development port, default `5173` |
| `ALLOWED_ORIGINS` | Comma-separated exact HTTP/WS origin allowlist; empty derives this machine's localhost and IPv4 LAN origins on both ports |
| `VITE_GAME_SERVER_URL` | Explicit browser-visible endpoint override; requires restarting/rebuilding the browser application |
| `VITE_ENABLE_DEV_TOOLS` | Optional read-only diagnostics in a built test build; disabled by default |

When changing the game port during development, also set `VITE_GAME_SERVER_URL`, for example `http://192.168.1.9:2600`. Built same-origin URLs derive the port from the address opened. For an explicit allowlist, include the actual LAN origin and any localhost origin used for testing. HTTP matchmaking, OPTIONS requests and gameplay WebSockets enforce the allowlist.

## Connection checks

1. Open `/health` on the host and on the second device.
2. Confirm both devices use the same network and that Node is allowed by the host firewall.
3. Try the actual IPv4 address rather than a hostname.
4. Guest Wi-Fi/client isolation can prevent LAN peer access. Choose a network that allows local peers.
5. If the host changes network/interface, restart the server to refresh automatic origins.

Clipboard, fullscreen and audio activation may be restricted on plain HTTP. Failures are handled without making those features prerequisites for play. This is a local-network application; no public hosting or router port forwarding is configured.

## Device acceptance

Two independent Chrome contexts on the host have been tested. Physical Android Chrome, iPhone Safari, and a second-machine LAN session have **not** been tested. Device/browser names, Wi-Fi configuration, background/resume behavior, touch aiming, audio and measured frame rate must be recorded during that next phase.
