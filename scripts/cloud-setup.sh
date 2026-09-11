#!/bin/sh
# Cloud VM setup only. Never reads, copies, or prints credential values.
set -eu

cloud_target="${1:-}"
case "$cloud_target" in
  codex|cursor) ;;
  *) echo "Usage: sh scripts/cloud-setup.sh codex|cursor" >&2; exit 2 ;;
esac

if [ "${MLP_CLOUD_ENVIRONMENT:-}" != "$cloud_target" ]; then
  echo "Set MLP_CLOUD_ENVIRONMENT to the selected provider in its cloud settings." >&2
  exit 2
fi
if [ "$(uname -s)" != "Linux" ]; then
  echo "This setup is intended for the Linux cloud VM, not a laptop." >&2
  exit 2
fi
# The provider marker is an operator setting, not proof of cloud identity.
cd "$(dirname "$0")/.."
node -e 'if (Number(process.versions.node.split(".")[0]) < 22) { console.error("Configure Node 22 or newer in the cloud environment."); process.exit(2); }'
npm ci
if [ "$cloud_target" = "cursor" ]; then
  npx --no-install playwright install --with-deps chromium
fi
