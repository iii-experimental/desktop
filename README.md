# iii-desktop

Native desktop shell for the iii harness console. Tauri 2 in Rust, React
renderer on `iii-browser-sdk`. The desktop's only job is to serve the console
that the harness bundle ships, as a native window, so
`iii worker add harness` plus this shell gives you the full chat, traces,
workers, and configuration surface on the desktop.

The renderer never speaks REST. Every action is a single `trigger(...)` over
the engine WebSocket against `harness::*`, `session::*`, `engine::traces::*`,
`configuration::*`, `approval::*`, and the locally registered `desktop::*`
worker.

## What ships

The renderer is the iii console verbatim (its `App`, pages, chat stack, and
component kit are ported from [`iii-hq/workers`](https://github.com/iii-hq/workers)
`console/web`):

- A collapsible left chat dock: conversation sidebar backed by `session::list`
  / `session::get` / `session::messages`, the Lexical composer with
  `plan | ask | agent` modes, model picker, and attachments.
- Chat turns sent with `harness::send`; the transcript is reconciled from
  session-manager events and the harness turn and approval triggers
  (`harness::turn-started` / `harness::turn-completed`,
  `approval::pending-created` / `approval::pending-resolved`).
- A `traces` page on `engine::traces::*` (flat list, search, status filters,
  attribute grouping) and a `workers` page, switched from the header, with a
  configuration page behind the gear.
- Inline function-call cards, coder diff views, thought blocks, and inline
  approval prompts resolved via `approval::resolve`.

The shell adds only what a native app needs: the macOS title-bar inset and
window drag, the `desktop::*` worker, native menu, deep links (`iii://`), and
file pickers.

## Design

The iii Schematic design system, sourced from the console `@theme`: cream
paper (`#f2f0ed`), ink (`#0a0a0a`), a single AA burnt-orange accent
(`#b8420f`), Chivo Mono everywhere, zero rounded corners, borders define every
container. Dark theme swaps to ink paper (`#111110`) and electric blue accent
(`#3ea8ff`). Light is canonical; the theme persists to `localStorage` and an
inline `<head>` script applies it before paint to avoid a flash. Styling is
Tailwind v4 driven by the console's `theme.css`.

## Status

`0.x`. Stays sub-1.0 until the shell is in real production use against a
running engine plus harness.

## Prerequisites

- Rust stable (`rustup toolchain install stable`)
- Tauri CLI (`cargo install tauri-cli --version "^2"`)
- Node 20 + pnpm 9 (`corepack enable && corepack prepare pnpm@9 --activate`)
- A running iii engine. Bare `iii` runs the engine in the foreground (there is
  no `iii start` subcommand).

  ```bash
  curl -fsSL https://install.iii.dev/iii/main/install.sh | sh
  iii worker add harness            # pulls the full console + chat-graph bundle
  iii worker add iii-observability  # span store for the traces page
  iii                               # foreground engine; no subcommand
  ```

  Engine subcommands: `iii trigger`, `iii worker`, `iii console`,
  `iii sandbox`, `iii cloud`, `iii create`, `iii update`.

  Provider API keys: `auth-credentials` reads them from the environment of the
  process that spawns the workers, so export `ANTHROPIC_API_KEY` /
  `OPENAI_API_KEY` before running `iii`. The traces page needs
  `iii-observability` with `exporter: memory` (or `both`), which
  `iii worker add iii-observability` writes for you.

## Dev

```bash
pnpm --dir web install
cargo tauri dev
```

`cargo tauri dev` is the canonical entry. It runs `pnpm --dir web dev` in the
background, watches `src-tauri/`, and rebuilds the shell on change.

Engine survival on macOS: the included `scripts/run-engine.sh` raises
`ulimit -n 8192` (the default 256 kills the engine in seconds) and sources
either `./.env` or `~/agentsos/.env` so it inherits provider keys. Run it in
its own terminal beside `cargo tauri dev`.

## Build

```bash
pnpm --dir web build
cargo tauri build
```

Output bundles land in `src-tauri/target/release/bundle/`. CI matrices across
macOS arm64 + x86_64, Linux x86_64, and Windows x86_64 are wired in
`.github/workflows/release.yml`, triggered on `v*` tags.

## Configuration

Environment variables read at launch:

| Var | Default | Meaning |
|---|---|---|
| `III_URL` | `ws://127.0.0.1:49134` | Engine WS the desktop worker connects to. |
| `VITE_III_BROWSER_URL` | unset | Override the renderer's engine WS. |
| `ANTHROPIC_API_KEY` etc | unset | Read by `auth-credentials`. Export before launching the engine. |

The desktop worker auto-detects the engine over `III_URL`. The renderer
defaults to the same `:49134` host; the engine RBAC layer routes browser
workers without a separate browser port on the canonical harness install.

## Wire shape

The renderer is an iii worker. On boot it opens one WebSocket via
`iii-browser-sdk::registerWorker`, mints a stable `browser_id`, and registers
per-browser handlers under `<functionId>::<browserId>`. From there:

- Sessions load through `session::list` / `session::get` / `session::messages`.
- A turn is `harness::send`; `harness::stop` cancels it. Transcript content is
  reconciled from session-manager events, not a delta stream.
- Approvals bind the `approval::pending-created` / `approval::pending-resolved`
  trigger types per session (with `approval::list-pending` on reconnect) and
  resolve via `approval::resolve { session_id, function_call_id, decision }`.

The Rust shell registers two functions on the engine:

- `desktop::status` — liveness probe; returns `{ name, version }`.
- `desktop::window::focus` — show the main window and bring it to the front,
  callable from any bus caller (approval gates, deep-link landings).

The skill bundle for the worker lives under
[`skills/iii-desktop/`](./skills/iii-desktop/) and is indexed by
`iii-directory`.

## Layout

```
.
├── src-tauri/             Rust shell
│   ├── src/
│   │   ├── main.rs        thin bin entry
│   │   ├── lib.rs         tauri::Builder + plugin wiring
│   │   ├── worker.rs      iii-sdk worker registration (desktop::*)
│   │   ├── menu.rs        native menu
│   │   └── functions/     Tauri IPC commands (window, dialog, engine)
│   ├── capabilities/      Tauri 2 capability scopes
│   └── tauri.conf.json
├── web/                   Vite + React renderer (console, ported verbatim)
│   └── src/
│       ├── App.tsx                  console App: header + chat dock + pages
│       ├── main.tsx                 QueryClient + Tooltip providers
│       ├── components/
│       │   ├── chat/                composer, message list, function cards
│       │   ├── ui/                  the iii component kit
│       │   ├── sidebar/             conversation list
│       │   └── permissions/         approval-gate controls
│       ├── pages/
│       │   ├── Traces/              engine::traces::* page
│       │   ├── Workers/             worker roster + config
│       │   └── Configuration/       settings
│       ├── hooks/                   conversations, dock, theme, catalogs
│       ├── lib/
│       │   ├── iii-client.ts        iii-browser-sdk transport (desktop tuned)
│       │   ├── backend/             harness-send, turn + approval events
│       │   ├── sessions/            transcript reconciliation
│       │   └── configuration.ts     configuration::get/set accessor
│       ├── types/                   chat + agent-event types
│       └── styles/                  theme.css (console @theme) + token bridge
├── skills/iii-desktop/    skill bundle (index + per-function how-tos)
├── scripts/run-engine.sh  ulimit + .env wrapper for engine boot
└── .github/workflows/     ci + release
```

## Versions

- `iii-sdk` `=0.19.4-alpha.5` (Rust shell worker)
- `iii-browser-sdk` `0.19.4-alpha.5` (renderer transport)
- React 19, Tailwind v4, Lexical (composer)

## License

Apache-2.0
