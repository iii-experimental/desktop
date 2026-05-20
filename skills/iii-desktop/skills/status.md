---
type: how-to
function_id: desktop::status
title: Probe the desktop worker
---

# When to use

Call `desktop::status` when you need a cheap liveness signal for the
native shell. The function does no I/O and never blocks — it returns
immediately with the worker's name and crate version, which is enough to
confirm that the desktop binary is connected to the engine and serving
the `desktop::*` namespace.

Reach for it when:

- A health check or sentinel needs to verify the desktop process is up
  before routing approval prompts or window-focus calls through it.
- An onboarding script wants to confirm the shell installed correctly
  before kicking off any agent run.

Use [`engine::workers::list`](iii://harness/engine/workers/list) instead
when you need the full set of connected workers, their function counts,
or PIDs — `desktop::status` is the worker-private answer to "am I
alive?", not a system-wide directory.

# Inputs

```json
{}
```

No fields. The function ignores its payload.

# Outputs

```json
{
  "ok":      true,         // always true on a successful response
  "name":    "iii-desktop", // worker name as registered on the bus
  "version": "0.1.0"       // crate version of the running shell
}
```

- `name` is the static string `iii-desktop` for every build of the
  shell. Use it to discriminate from other native helpers on the same
  bus.
- `version` is the `CARGO_PKG_VERSION` baked in at compile time. Format
  is semver; pre-1.0 may include `-next.N` suffixes.

# Worked example

Confirm the desktop shell is responding:

```json
{}
```

# Related

- `desktop::window::focus` — pair with `status` in a health check before
  routing focus calls.
- `harness::status` — equivalent probe for the canonical harness bundle.
- `engine::workers::list` — directory-wide answer when one worker is not
  enough.
