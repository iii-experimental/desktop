#!/usr/bin/env bash
# Launches the iii engine for the desktop dev loop. Designed to be opened
# in its own Terminal window so it survives the IDE / Claude Code lifecycle.
#
# Usage: scripts/run-engine.sh
set -euo pipefail

cd "$(dirname "$0")/.."

# macOS soft FD limit is 256 by default — kills the engine within seconds.
ulimit -n 8192

# Load ANTHROPIC_API_KEY (and friends) without echoing them. Prefer .env
# in the repo root, fall back to ~/agentsos/.env if it exists.
if [[ -f .env ]]; then
  set -a; source .env; set +a
elif [[ -f "$HOME/agentsos/.env" ]]; then
  set -a; source "$HOME/agentsos/.env"; set +a
fi

echo "=== iii engine ==="
echo "  config: $(pwd)/config.yaml"
echo "  FD limit: $(ulimit -n)"
[[ -n "${ANTHROPIC_API_KEY:-}" ]] && echo "  ANTHROPIC_API_KEY: set (${#ANTHROPIC_API_KEY} chars)" || echo "  ANTHROPIC_API_KEY: UNSET"
echo

exec iii --no-update-check
