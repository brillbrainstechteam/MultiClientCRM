# Moving TalkTrack CRM from Vercel to the VPS (CloudPanel + Cloudflare)

The domain does not change, so **nothing in Meta or Google needs reconfiguring** —
the webhook URL, OAuth redirect URI and JS SDK allowed domains stay valid. Only
the server answering `talktrackcrm.brillbrainsconsultants.com` changes.

The database stays on Neon for this move. Self-hosting Postgres is a separate
job — doing both at once means two things can break at the same time.

**Shape of it:** the app runs in Docker, listening on `127.0.0.1:3000`.
CloudPanel's nginx fronts it as a **Reverse Proxy** site, so TalkTrack sits
beside the other apps on the box instead of competing for ports 80/443.

## 0. Two settings that will break everything if you get them wrong

1. **`SESSION_SECRET` must be copied from Vercel exactly.** Stored WhatsApp
   access tokens are encrypted with a key derived from it (`lib/crypto.ts`). A
   different value makes every token undecryptable — the WhatsApp connection
   dies and everyone is logged out.
2. **`NEXT_PUBLIC_*` are compiled into the browser bundle at build time**, not
   read at runtime. They are Docker build args; changing them later needs a
   rebuild, not a restart.

## 1. Record the current DNS (your rollback)

In Cloudflare → `brillbrainsconsultants.com` → DNS, find the `talktrackcrm`
record and **write down its current value** (the Vercel IP) before changing
anything. Rollback is putting that value back.

Lower its **TTL to 1–2 minutes** now, an hour or so before cutover, so a
rollback propagates in minutes rather than hours.

## 2. SSH: Docker and directories

```bash
ssh root@<VPS_IP>

# Is Docker already here?
command -v docker && docker compose version

# If not, install from Docker's own apt repository. (The get.docker.com
# convenience script is quicker, but Docker say it "isn't recommended for
# production environments" — it installs dependencies without asking and can
# jump major versions on a box that is also running your other apps.)
. /etc/os-release                      # sets $ID (debian|ubuntu) and $VERSION_CODENAME
apt update && apt install -y ca-certificates curl
install -m 0755 -d /etc/apt/keyrings
curl -fsSL "https://download.docker.com/linux/$ID/gpg" -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/$ID $VERSION_CODENAME stable"   > /etc/apt/sources.list.d/docker.list
apt update && apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

docker --version && docker compose version   # both must print a version
systemctl is-active docker                   # expect: active

# App directory and the uploads volume (1001 = the uid the container runs as)
mkdir -p /srv /var/lib/talktrack/uploads
chown -R 1001:1001 /var/lib/talktrack
```

## 3. Clone the repository

The repo is private, so use a GitHub **personal access token** (or add a deploy
key first):

```bash
cd /srv
git clone https://<GITHUB_TOKEN>@github.com/brillbrainstechteam/MultiClientCRM.git talktrack
cd /srv/talktrack
```

## 4. Environment file

Copy the **Production** values out of Vercel (Project → Settings → Environment
Variables) into `/srv/talktrack/.env.production`:

```bash
nano /srv/talktrack/.env.production
```

| Key | Notes |
|---|---|
| `DATABASE_URL`, `DIRECT_URL` | Neon, unchanged |
| `SESSION_SECRET` | **identical to Vercel's** |
| `APP_URL` | `https://talktrackcrm.brillbrainsconsultants.com` |
| `NEXT_PUBLIC_META_APP_ID`, `NEXT_PUBLIC_META_CONFIG_ID`, `NEXT_PUBLIC_META_COEXISTENCE_FEATURE` | also used as build args |
| `META_APP_SECRET`, `META_GRAPH_VERSION` | |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | must match Meta → WhatsApp → Configuration |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Contacts/Sheets sync |
| `GEMINI_API_KEY`, `OPENAI_API_KEY` | Kundli briefs |
| `PLACES_API_KEY`, `PROSPECTING_TENANTS` | Find New Businesses |
| `STORAGE_DRIVER=local` | showroom photos |
| `STORAGE_DIR=/var/lib/talktrack/uploads` | must match the volume above |

`WHATSAPP_TEST_*` are local-dev only; leave them out.

```bash
chmod 600 /srv/talktrack/.env.production
```

## 5. Build, migrate, start

Run these from `/srv/talktrack`. `--env-file` matters: it feeds both the
container environment and the `${...}` build args.

```bash
cd /srv/talktrack
docker compose --env-file .env.production -f deploy/docker-compose.vps.yml build

# migrate-if-prod.mjs only fires on Vercel, so migrations are explicit here.
# This creates the CrmFile table used by showroom photos.
docker compose --env-file .env.production -f deploy/docker-compose.vps.yml \
  run --rm --no-deps talktrack npx prisma migrate deploy

docker compose --env-file .env.production -f deploy/docker-compose.vps.yml up -d
curl -I http://127.0.0.1:3000/login      # expect HTTP/1.1 200
```

If that curl returns 200, the app is running. The site is not reachable from
the internet yet — DNS still points at Vercel.

## 6. CloudPanel: the Reverse Proxy site

CloudPanel → **Sites → Add Site → Create a Reverse Proxy**:

| Field | Value |
|---|---|
| Domain Name | `talktrackcrm.brillbrainsconsultants.com` |
| Reverse Proxy URL | `http://127.0.0.1:3000` |
| Site User | `talktrack` |
| Site User Password | generate and save it |

Then **Sites → talktrackcrm… → Vhost Editor** and, inside the `server { }`
block, make sure these are present:

```nginx
client_max_body_size 12m;          # photos post as base64: an 8MB image is ~11MB
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-Host  $host;
```

Without `client_max_body_size`, photo uploads fail with a 413. The forwarded
headers matter because the Meta OAuth `redirect_uri` is derived from them.

CloudPanel's firewall leaves only 22, 80, 443 and 8443 open, which is correct
here — port 3000 is bound to localhost and must never be exposed.

## 7. Cutover: DNS and TLS

Pick one. **Option A avoids any window without a valid certificate.**

### Option A — Cloudflare Origin Certificate (recommended, no downtime)
1. Cloudflare → SSL/TLS → **Origin Server → Create Certificate**. Include
   `talktrackcrm.brillbrainsconsultants.com`. Copy the certificate and key.
2. CloudPanel → Sites → your site → **SSL/TLS → Add Custom Certificate**, paste
   both, save.
3. Cloudflare → SSL/TLS → Overview → set encryption mode to **Full (strict)**.
4. Cloudflare → DNS → change the `talktrackcrm` **A record to the VPS IP**,
   proxy **ON** (orange cloud).

The certificate is installed before the switch, so the site is valid the moment
DNS moves.

### Option B — Let's Encrypt through CloudPanel
1. Cloudflare → DNS → point the A record at the VPS IP with proxy **OFF**
   (grey cloud), so the HTTP-01 challenge reaches the box.
2. CloudPanel → Sites → your site → **SSL/TLS → New Let's Encrypt Certificate**.
3. Once issued, turn the proxy back on if you want Cloudflare in front.

## 8. Verify before you call it done

1. `https://talktrackcrm.brillbrainsconsultants.com/login` — sign in.
2. `/diagnostics/whatsapp` — every check green.
3. Send a WhatsApp message **to** the business number; confirm it appears in the
   Inbox (this proves Meta's webhook is reaching the new server).
4. Reply from the Inbox; confirm it arrives on the phone.
5. Templates screen lists the WABA's templates.
6. Customer 360 → **Showroom photos** → upload one, reload, confirm it renders.

## 9. After the move

- **Updates:** `cd /srv/talktrack && ./deploy/deploy.sh` (pull, rebuild, migrate, restart).
- **Logs:** `docker compose --env-file .env.production -f deploy/docker-compose.vps.yml logs -f talktrack`
- **Back up `/var/lib/talktrack/uploads` with the database.** A `CrmFile` row
  whose bytes are gone is a broken image.
- **Keep the Vercel project deployed for a few days.** Rollback is putting the
  old A record value back.
- Once settled, Postgres can move off Neon as its own project.
