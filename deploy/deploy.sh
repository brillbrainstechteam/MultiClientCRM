#!/usr/bin/env bash
# Update TalkTrack CRM on the VPS: pull, rebuild, migrate, restart.
# Usage:  cd /home/talktrackcrm/app && ./deploy/deploy.sh
set -euo pipefail

cd "$(dirname "$0")/.."
# --env-file also feeds ${VAR} interpolation for the build args; without it
# Compose would look for a .env beside the compose file and silently pass blanks.
COMPOSE="docker compose --env-file .env.production -f deploy/docker-compose.vps.yml"

echo "==> Syncing code to origin/main"
# Force-match GitHub so a stray local edit or divergent commit on the server can
# never block the deploy (which, with `set -e`, previously aborted the whole run
# before the container was ever restarted). The server is a mirror of GitHub.
git fetch origin main
git reset --hard origin/main

echo "==> Building image"
# shellcheck disable=SC2086
$COMPOSE build

echo "==> Applying database migrations"
# migrate-if-prod.mjs only fires on Vercel, so migrations are explicit here.
$COMPOSE run --rm --no-deps talktrack npx prisma migrate deploy

echo "==> Restarting"
# Docker can still be tearing down the old container when compose asks for the
# new one, which fails with "removal of container ... is already in progress".
# It is a race, not a real error: the removal finishes within a few seconds and
# the same command then succeeds. Retrying beats leaving the site down because
# `set -e` aborted the deploy one step from the end.
restart() {
  local attempt
  for attempt in 1 2 3 4 5; do
    # shellcheck disable=SC2086
    if $COMPOSE up -d; then
      return 0
    fi
    echo "    restart attempt $attempt failed; waiting for Docker to settle…"
    sleep 5
  done
  return 1
}

if ! restart; then
  echo "!! Could not start the container after several attempts." >&2
  echo "   Check:  docker ps -a | grep talktrack" >&2
  echo "   Then:   $COMPOSE up -d" >&2
  exit 1
fi

echo "==> Health"
sleep 5
# shellcheck disable=SC2086
$COMPOSE ps

# Prove it actually serves, rather than just reporting a container exists. A
# container can be "Up" and still be failing to boot.
# APP_PORT is numeric, so keeping only the digits strips quotes, whitespace
# and any Windows CR in one step, with no escapes to get mangled.
PORT="$(grep -m1 '^APP_PORT=' .env.production | tr -cd '0-9')"
PORT="${PORT:-3000}"
if curl -fsS -o /dev/null -m 20 "http://127.0.0.1:${PORT}/login"; then
  echo "==> OK: serving on 127.0.0.1:${PORT}"
else
  echo "!! The container is running but /login did not respond on port ${PORT}." >&2
  echo "   Logs:  $COMPOSE logs --tail=50 talktrack" >&2
  exit 1
fi
