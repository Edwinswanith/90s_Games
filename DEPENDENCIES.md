# Dependencies

Runtime: **Node 24.20.0**, project-local under `.runtime/node`. Package manager: **pnpm 10.29.2**. `package.json`, `.nvmrc` and `pnpm-lock.yaml` are authoritative. The existing system Node 25 installation is not modified.

| Production dependency | Pinned version | Use |
|---|---|---|
| React / React DOM | 19.2.8 | Menus and application state |
| React Three Fiber | 9.7.0 | WebGL scene integration |
| Three.js | 0.185.1 | Original procedural geometry, materials and instancing |
| Rapier compatibility package | 0.20.0 | Shared kinematic character collision |
| Colyseus core | 0.18.11 | Authoritative room server and fixed input |
| Colyseus SDK | 0.18.2 | Create/join/reconnect, synchronization and native prediction |
| Colyseus WS transport | 0.18.2 | Local WebSocket networking |
| Colyseus schema | 5.0.27 | Typed synchronized state and inputs |
| Zod | 4.5.4 | Names, settings and command-boundary validation |
| Express | 5.1.0 | Health, room-code lookup and local static assets |
| dotenv | 17.2.3 | Optional local server environment |
| Fontsource Fredoka / Nunito Sans / Noto Sans Tamil | 5.3.0 | Bundled fonts |

Development tools: TypeScript 5.9.3, Vite 8.2.2, React Vite plugin 6.1.1, Vitest 5.0.0, Playwright 1.63.0, tsx 4.20.6, esbuild 0.27.3, ESLint 9.39.1, typescript-eslint 8.46.3 and Prettier 3.9.6. Type declaration packages and every transitive resolution are pinned in the lockfile.

The Colyseus packages deliberately have different patch versions. This exact combination passed real independent SDK and Chrome connections. Schema definitions use the installed `schema()` / `t` API with explicit defaults. Input sanitization reads schema accessor values explicitly; object spreading a decoded schema is not equivalent.

No account, cloud key, database, remote font CDN, hosted image or audio service is required. The optional `msgpackr-extract` native build is not needed for the tested JavaScript path and pnpm may report it as an ignored optional build. Three.js currently emits an upstream Clock deprecation warning through the rendering integration; browser page-error checks passed.

Use `node scripts/licenses.mjs` after dependency changes to refresh installed production-package/license records. The offline clean-install test uses the populated pnpm store with `--offline --frozen-lockfile`; a first installation on another computer still requires downloading the locked packages.
