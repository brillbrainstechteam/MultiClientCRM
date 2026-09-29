#!/usr/bin/env bash
# Update TalkTrack CRM on the VPS: pull, rebuild, migrate, restart.
# Usage:  cd /srv/talktrack && ./deploy/deploy.sh
set -euo pipefail

cd "$(dirname "$0")/.."
COMPOSE="docker compose -f deploy/docker-compose.vps.yml"

echo "==> Pulling latest code"
git pull --ff-only

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
