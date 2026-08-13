#!/usr/bin/env bash
# One-command deploy for the Vmacro VPS proxy.
#
# Run directly on the VPS, or remotely from anywhere with the vmacro-vps SSH alias:
#   ssh vmacro-vps 'bash /home/vmacro/vmacro/server/deploy/deploy.sh'
#
# Does: git pull -> npm install only if server/package-lock.json changed -> write
# server/deploy/version.json (commit + deploy time, served at GET /version) -> restart
# the systemd service -> curl /version to confirm the new commit is actually live.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_DIR"

LOCKFILE="server/package-lock.json"
lock_hash() {
  [ -f "$LOCKFILE" ] && sha256sum "$LOCKFILE" | cut -d' ' -f1 || echo "none"
}

LOCK_BEFORE="$(lock_hash)"

echo "==> git pull"
git pull origin main

if [ "$(lock_hash)" != "$LOCK_BEFORE" ]; then
  echo "==> server/package-lock.json changed — npm install"
  (cd server && npm install --omit=dev)
fi

echo "==> writing version file"
mkdir -p server/deploy
COMMIT="$(git rev-parse HEAD)"
DEPLOYED_AT="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
printf '{"commit":"%s","deployed_at":"%s"}\n' "$COMMIT" "$DEPLOYED_AT" >server/deploy/version.json

echo "==> restarting vmacro-proxy"
sudo systemctl restart vmacro-proxy

sleep 1
echo "==> verifying /version"
if ! curl -sf http://127.0.0.1:3000/version; then
  echo "!! /version check failed — service may not have restarted cleanly, check: sudo systemctl status vmacro-proxy"
  exit 1
fi
echo
echo "==> done — deployed commit $COMMIT"
