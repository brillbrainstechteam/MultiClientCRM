# Moving TalkTrack CRM from Vercel to our VPS

The domain does not change, so **nothing in Meta or Google needs reconfiguring** —
the webhook URL, OAuth redirect URI and JS SDK allowed domains all stay valid.
What changes is only which server answers `talktrackcrm.brillbrainsconsultants.com`.

The database stays on Neon for the move. Self-hosting Postgres too is a separate
job; doing both at once means two things can break at the same time.

## 0. Two settings that will break everything if you get them wrong

1. **`SESSION_SECRET` must be copied across exactly.** Stored WhatsApp access
   tokens are encrypted with a key derived from it (`lib/crypto.ts`). A new value
   means every stored token becomes undecryptable — the WhatsApp connection dies
   and everyone is logged out.
2. **`NEXT_PUBLIC_*` values are compiled into the browser bundle at build time**,
   not read at runtime. They are passed as Docker build args; changing them later
   needs a rebuild, not a restart.

## 1. On the VPS: prerequisites

```bash
docker --version && docker compose version     # Docker + compose plugin
sudo mkdir -p /var/lib/talktrack/uploads       # showroom photos live here
sudo chown -R 1001:1001 /var/lib/talktrack     # uid the container runs as
sudo mkdir -p /srv/talktrack
```

Clone into `/srv/talktrack` and check out `main`.

## 2. Environment

Create `/srv/talktrack/.env.production` with the values from the current Vercel
project (Settings → Environment Variables → Production). Every key in use today:

| Key | Notes |
|---|---|
| `DATABASE_URL`, `DIRECT_URL` | Neon, unchanged |
| `SESSION_SECRET` | **must be identical to Vercel's** |
| `APP_URL` | `https://talktrackcrm.brillbrainsconsultants.com` |
| `NEXT_PUBLIC_META_APP_ID`, `NEXT_PUBLIC_META_CONFIG_ID`, `NEXT_PUBLIC_META_COEXISTENCE_FEATURE` | build args too |
| `META_APP_SECRET`, `META_GRAPH_VERSION` | |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | must match Meta → WhatsApp → Configuration |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Contacts/Sheets sync |
| `GEMINI_API_KEY`, `OPENAI_API_KEY` | Kundli briefs |
| `PLACES_API_KEY`, `PROSPECTING_TENANTS` | Find New Businesses |
| `STORAGE_DRIVER=local`, `STORAGE_DIR=/var/lib/talktrack/uploads` | new — showroom photos |

`WHATSAPP_TEST_*` are local-dev only and can be left out.

## 3. Build, migrate, run

```bash
cd /srv/talktrack
docker compose -f deploy/docker-compose.vps.yml build
docker compose -f deploy/docker-compose.vps.yml run --rm --no-deps talktrack npx prisma migrate deploy
docker compose -f deploy/docker-compose.vps.yml up -d
curl -I http://127.0.0.1:3000/login     # expect 200
```

The migration step is not optional: `scripts/migrate-if-prod.mjs` only runs on
Vercel, so on the VPS migrations are applied by hand. The pending
`CrmFile` migration (showroom photos) is applied by this step.

## 4. Reverse proxy

The app listens on `127.0.0.1:3000` only, so it sits behind the proxy already
serving the other apps on the box. Copy `deploy/nginx-talktrack.conf` to
`/etc/nginx/sites-available/talktrack`, symlink it into `sites-enabled`, then
`sudo nginx -t && sudo systemctl reload nginx`.

`client_max_body_size 12m` matters: photos are posted as base64, so an 8MB image
is ~11MB of body and the default 1MB limit would reject it with a 413.

**TLS** depends on how Cloudflare is set up:
- **DNS-only (grey cloud):** `sudo certbot --nginx -d talktrackcrm.brillbrainsconsultants.com`.
- **Proxied (orange cloud):** an HTTP-01 challenge cannot reach the box. Use a
  Cloudflare **Origin Certificate** on the VPS and set SSL mode to **Full (strict)**,
  or issue the certificate with a DNS-01 challenge.

## 5. Cutover

1. Test through the VPS **before** moving DNS: add
   `<vps-ip> talktrackcrm.brillbrainsconsultants.com` to your laptop's hosts file
   and walk through login, Inbox, Templates and `/diagnostics/whatsapp`.
2. Lower the record's TTL an hour ahead, so a rollback takes minutes.
3. In Cloudflare, repoint the record from Vercel to the VPS (`A` → VPS IP).
4. Watch `docker compose -f deploy/docker-compose.vps.yml logs -f` and confirm a
   real inbound WhatsApp message reaches the Inbox.
5. Leave the Vercel project deployed for a few days. **Rollback = point DNS back.**

## 6. After the move

- Updates: `./deploy/deploy.sh` (pull, rebuild, migrate, restart).
- **Back up `/var/lib/talktrack/uploads` together with the database.** A `CrmFile`
  row whose bytes are missing is a broken image.
- Logs: `docker compose -f deploy/docker-compose.vps.yml logs -f talktrack`.
- Once settled, Postgres can move off Neon onto the VPS as its own step.
