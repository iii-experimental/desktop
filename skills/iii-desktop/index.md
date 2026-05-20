---
type: index
title: iii-desktop
---

# iii-desktop

Native macOS/Linux/Windows shell for the iii chat surface. The worker
registers under the `desktop::*` namespace on the backend engine bus
(default `ws://127.0.0.1:49134`) and exposes two responsibilities: a
liveness probe and a window-focus control surface. The renderer is a
separate iii-browser-sdk worker that drives the chat graph through
[`harness::status`](iii://harness/status) and the rest of the canonical
harness primitives — this skill bundle covers only the native-shell
surface.

- **Window** (`desktop::window::*`) — control the native window from any
  worker on the bus. Today: bring the window to the front. Future: deep
  link routing, badge, native menu sync.

## How-tos

### `desktop::*`

- [`desktop::status`](iii://iii-desktop/status) — liveness probe; returns
  the desktop worker name and version. Cheap. Safe to call from health
  checks.

### `desktop::window::*`

- [`desktop::window::focus`](iii://iii-desktop/window/focus) — show the
  main window and pull it to the front. Use this from approval prompts,
  long-running tool results, or any worker that needs to interrupt the
  user.
