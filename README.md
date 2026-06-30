# iii-desktop

Thin native shell for the iii harness console. Tauri 2 in Rust. The desktop
vendors no UI: it ensures the `console` worker is installed and points its
window at the console that worker serves. Worker installation (harness and the
rest) is the console's own job, so the desktop never re-implements or copies
any of it.

```
iii worker add harness    # the chat graph + providers
iii worker add console    # serves the UI at 127.0.0.1:3113
```

Launch the shell against a running engine and the window shows whatever console
the installed bundle ships: chat, traces, workers, and configuration.

## How it works

1. On launch the Rust shell runs `iii worker add console` (best effort,
   idempotent), so the engine serves the console UI at `127.0.0.1:3113` with
   `/ws` proxied to the engine.
2. The window loads a small loader page (`shell/index.html`) that waits for the
   console to answer, then hands the webview over to `http://127.0.0.1:3113`.
3. The shell registers a `desktop::*` worker on the engine for native actions
   (`desktop::window::focus`, `desktop::status`).

That is the whole renderer. There is no bundled web app; the UI is always the
console worker's, matched to the installed engine and harness.

## Status

`0.x`. Stays sub-1.0 until the shell is in real production use against a
running engine plus harness.

## Prerequisites

- Rust stable (`rustup toolchain install stable`)
- Tauri CLI (`cargo install tauri-cli --version "^2"`)
- A running iii engine. Bare `iii` runs the engine in the foreground (there is
  no `iii start` subcommand).

  ```bash
  curl -fsSL https://install.iii.dev/iii/main/install.sh | sh
  iii worker add harness    # chat graph + providers
  iii worker add console    # console UI worker (the shell also ensures this)
  iii                       # foreground engine; no subcommand
  ```

  Engine subcommands: `iii trigger`, `iii worker`, `iii console`,
  `iii sandbox`, `iii cloud`, `iii create`, `iii update`.

  Provider API keys: `auth-credentials` reads them from the environment of the
  process that spawns the workers, so export `ANTHROPIC_API_KEY` /
  `OPENAI_API_KEY` before running `iii`. The traces page needs
  `iii-observability` with `exporter: memory` (or `both`).

## Dev

```bash
cargo tauri dev
```

There is no web build step. `cargo tauri dev` serves the loader from `shell/`
and opens the window. Start the engine first; the shell ensures the console
worker and the window hands off once it answers on `127.0.0.1:3113`.

Engine survival on macOS: the included `scripts/run-engine.sh` raises
`ulimit -n 8192` (the default 256 kills the engine in seconds) and sources
either `./.env` or `~/agentsos/.env` so it inherits provider keys. Run it in
its own terminal beside `cargo tauri dev`.

## Build

```bash
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
| `III_BIN` | `iii` | Path to the `iii` binary used to ensure the console worker. |
| `III_CONSOLE_AUTOSTART` | `1` | Set `0` to skip `iii worker add console` and rely on an already-added console. |

The console worker serves the UI on `127.0.0.1:3113` (its default). The shell's
loader targets that origin.

## Wire shape

The renderer is the console worker; the shell adds only a `desktop::*` worker on
the engine:

- `desktop::status` — liveness probe; returns `{ name, version }`.
- `desktop::window::focus` — show the main window and bring it to the front,
  callable from any bus caller (approval gates, deep-link landings).

The skill bundle for the worker lives under
[`skills/iii-desktop/`](./skills/iii-desktop/) and is indexed by
`iii-directory`.

## Layout

```
.
├── src-tauri/             Rust shell (the whole app)
│   ├── src/
│   │   ├── main.rs        thin bin entry
│   │   ├── lib.rs         tauri::Builder + plugin wiring
│   │   ├── console.rs     ensures the console worker (iii worker add console)
│   │   ├── worker.rs      iii-sdk worker registration (desktop::*)
│   │   ├── menu.rs        native menu
│   │   └── functions/     Tauri IPC commands (window, dialog, engine)
│   ├── capabilities/      Tauri 2 capability scopes
│   └── tauri.conf.json    frontendDist points at ../shell
├── shell/index.html       loader: waits for the console, then hands off
├── skills/iii-desktop/    skill bundle (index + per-function how-tos)
├── scripts/run-engine.sh  ulimit + .env wrapper for engine boot
└── .github/workflows/     ci + release
```

## Versions

- `iii-sdk` `=0.19.4-alpha.5` (Rust shell worker)

## License

Apache-2.0
