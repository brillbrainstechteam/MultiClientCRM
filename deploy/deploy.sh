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
$COMPOSE up -d

echo "==> Health"
sleep 5
$COMPOSE ps
