# iii-desktop

Native desktop shell for the iii chat surface. Tauri 2 in Rust, React renderer
on `iii-browser-sdk`, runs against the canonical
[iii harness](https://github.com/iii-hq/workers/tree/main/harness) graph.

Two halves:

- `src-tauri/` — Rust shell. Owns the window, native menu, deep links, file
  dialogs. Registers a small `desktop::*` worker on the engine
  (`ws://127.0.0.1:49134` by default).
- `web/` — Vite + React renderer. Connects to the browser RBAC port
  (`ws://127.0.0.1:49135`) via `iii-browser-sdk` and drives the chat graph
  through `harness::call`.

The renderer never speaks REST. Every action is `iii.trigger(...)` against
either the harness or the desktop worker.

## Status

`0.x`. Stays sub-1.0 until the shell is in real production use against a
running engine + harness.

## Prerequisites

- Rust stable (`rustup toolchain install stable`)
- Node 20 + pnpm 9 (`corepack enable && corepack prepare pnpm@9 --activate`)
- A running iii engine with the `harness` worker installed:

  ```bash
  curl -fsSL https://install.iii.dev/iii/main/install.sh | sh
  iii worker add harness
  iii                  # runs the engine in the foreground
  ```

  Engine subcommands: `iii trigger`, `iii worker`, `iii console`, `iii sandbox`,
  `iii cloud`. Bare `iii` is the long-running engine process.

  Provider API keys: `auth-credentials` reads them from the environment of the
  process that spawns the workers, so export `ANTHROPIC_API_KEY` /
  `OPENAI_API_KEY` etc before running `iii`.

## Dev

```bash
# install renderer deps
pnpm --dir web install

# start Tauri + Vite together
cargo tauri dev
```

`cargo tauri dev` is the canonical entry. It runs `pnpm --dir web dev` in the
background, watches `src-tauri/`, and rebuilds the shell on change.

If `cargo tauri` is missing, install it once:

```bash
cargo install tauri-cli --version "^2"
```

## Build

```bash
pnpm --dir web build
cargo tauri build
```

Output bundles land in `src-tauri/target/release/bundle/`.

## Configuration

Environment variables read at launch:

| Var | Default | Meaning |
|---|---|---|
| `III_URL` | `ws://127.0.0.1:49134` | Backend engine port (for the desktop worker). |
| `VITE_III_BROWSER_URL` | unset | Override the browser worker WS. Skips `harness::info` round-trip. |
| `III_HARNESS_HTTP` | `http://127.0.0.1:39134` | HTTP base for the `harness::call` proxy used by Vite in dev. |

## Wire shape

The renderer is itself an iii worker. On boot it:

1. Fetches `harness::info` over HTTP to discover the browser WS endpoint
   (skipped if `VITE_III_BROWSER_URL` is set).
2. Connects via `iii-browser-sdk::registerWorker`.
3. Mints a stable `browser_id` for the page and registers
   `ui::session::event::<browser_id>` for live `agent::events`.
4. Calls `ui::subscribe { browser_id, session_id }` so the harness fanout
   knows which sessions to forward.
5. Sends turns via `harness::call { function_id: "run::start", payload }`.

The desktop worker registers two functions on the backend port:

- `desktop::status` — version + name liveness probe
- `desktop::window::focus` — bring the desktop window to the front (useful
  for cross-app deep links and approval prompts)

## Layout

```
.
├── src-tauri/             Rust shell
│   ├── src/
│   │   ├── main.rs        thin bin entry
│   │   ├── lib.rs         tauri::Builder + plugin wiring
│   │   ├── worker.rs      iii-sdk worker registration
│   │   ├── menu.rs        native menu
│   │   └── functions/     Tauri IPC commands
│   ├── capabilities/      Tauri 2 capability scopes
│   └── tauri.conf.json
├── web/                   Vite + React renderer
│   └── src/
│       ├── App.tsx
│       ├── components/
│       ├── lib/
│       │   ├── iii-client.ts      iii-browser-sdk wrapper
│       │   ├── useAgentStream.ts  agent::events subscription
│       │   ├── tauri.ts           Tauri IPC + menu event helpers
│       │   └── types.ts
│       └── styles/        vendored iii console design tokens
└── .github/workflows/     ci + release
```

## License

Apache-2.0
