#!/usr/bin/env bash
# Run one TalkTrack cron endpoint.
#
#   ./deploy/cron.sh token-health
#   ./deploy/cron.sh plan-reminders
#   ./deploy/cron.sh calling-health
#
# The shared secret is read from .env.production rather than pasted into
# crontab. That matters more than it sounds: a single mistyped or dropped
# character produces a 403 that is indistinguishable from a genuinely wrong
# secret, and the hunt goes everywhere except the clipboard. Reading it from the
# file that the app itself reads removes the possibility.
#
# Crontab entries then carry no secret at all:
#
#   */15 * * * * /home/talktrackcrm/app/deploy/cron.sh plan-reminders >> /var/log/talktrack-cron.log 2>&1
#   0  8 * * *   /home/talktrackcrm/app/deploy/cron.sh token-health   >> /var/log/talktrack-cron.log 2>&1
#   30 8 * * *   /home/talktrackcrm/app/deploy/cron.sh calling-health >> /var/log/talktrack-cron.log 2>&1
#
# plan-reminders runs every 15 minutes rather than daily: an activity can ask
# to be reminded an hour or fifteen minutes ahead, and a once-a-day job cannot
# deliver either.
set -euo pipefail

JOB="${1:-}"
if [ -z "$JOB" ]; then
  echo "usage: $(basename "$0") <token-health|plan-reminders|calling-health>" >&2
  exit 2
fi

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$APP_DIR/.env.production"
BASE="${TALKTRACK_BASE:-https://talktrackcrm.brillbrainsconsultants.com}"

if [ ! -r "$ENV_FILE" ]; then
  echo "cron.sh: cannot read $ENV_FILE" >&2
  exit 1
fi

# Strip surrounding quotes and any trailing CR, so a file edited on Windows or
# written with quotes still yields the value the app compares against.
SECRET="$(grep -m1 '^CRON_SECRET=' "$ENV_FILE" | cut -d= -f2- | tr -d '\r' | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'\$//")"

if [ -z "$SECRET" ]; then
  echo "cron.sh: CRON_SECRET is not set in $ENV_FILE" >&2
  exit 1
fi

# -sS keeps it quiet when healthy but still prints errors into the cron log;
# deliberately NOT -f, so a 403 body (which says why) reaches the log instead of
# being swallowed.
printf '[%s] %s: ' "$(date -Is)" "$JOB"
curl -sS -m 300 -H "x-cron-secret: $SECRET" "$BASE/api/cron/$JOB"
printf '\n'
