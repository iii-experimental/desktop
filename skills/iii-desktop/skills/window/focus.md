---
type: how-to
function_id: desktop::window::focus
title: Pull the desktop window to the front
---

# When to use

Call `desktop::window::focus` when a worker needs the user's attention
in the native shell — most commonly when an approval gate has paused a
turn, a long-running tool has finished, or a deep-link route just
landed. The call shows the main window if it was hidden and raises it
above other applications.

Reach for it when:

- `approval-gate` has emitted an approval request and the desktop is
  backgrounded; pair this call with the request fanout so the prompt
  surfaces immediately.
- A scheduled job (cron-triggered turn, completed sandbox) needs the
  user to inspect the result.
- A deep link (`iii://session/<id>`) has just routed to a session and
  the renderer should be visible.

Do not use this as a noisy "ping" — it interrupts the user's current
workspace. One call per genuinely user-blocking event.

# Inputs

```json
{}
```

No fields. The shell focuses the `main` window regardless of payload.

# Side effects

- The native `main` window is shown if hidden (no-op if already
  visible).
- The window is raised above all other application windows and given
  focus. The user's prior key-focus is taken away.

# Outputs

```json
{
  "ok": true   // always true on a successful response
}
```

- `ok` is the only field. The shell does not report whether the window
  was previously visible or focused — callers that need that detail
  must track state themselves.

# Worked example

Bring the window forward after an approval request lands:

```json
{}
```

Pair with the approval handler:

```json
{
  "function_id": "desktop::window::focus",
  "payload": {}
}
```

# Related

- `desktop::status` — confirm the shell is alive before relying on the
  focus call.
- `approval-gate::resolve` — typical caller; resume a paused turn once
  the user has approved or rejected in the now-focused window.
