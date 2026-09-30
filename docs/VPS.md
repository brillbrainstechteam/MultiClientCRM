# Moving TalkTrack CRM from Vercel to the VPS (CloudPanel + Cloudflare)

The domain does not change, so **nothing in Meta or Google needs reconfiguring** —
the webhook URL, OAuth redirect URI and JS SDK allowed domains stay valid. Only
the server answering `talktrackcrm.brillbrainsconsultants.com` changes.

The database stays on Neon for this move. Self-hosting Postgres is a separate
job — doing both at once means two things can break at the same time.

**Shape of it:** the app runs in Docker, listening on `127.0.0.1:3000`.
CloudPanel's nginx fronts it as a **Reverse Proxy** site, so TalkTrack sits
beside the other apps on the box instead of competing for ports 80/443.

## Status: migrated 30 Sep 2026

TalkTrack runs on the VPS. `talktrackcrm.brillbrainsconsultants.com` → `187.127.176.187`,
**DNS-only (grey cloud)** with a CloudPanel **Let's Encrypt** certificate (issued
30 Sep, renews automatically) — the same pattern as every other site on this box.
Vercel is kept deployed purely as a rollback: set the A record back to
`76.76.21.21` and it takes effect within the TTL.

**Deploying changed.** Pushing to GitHub no longer deploys anything. To ship:

```bash
ssh root@187.127.176.187
cd /home/talktrackcrm/app && ./deploy/deploy.sh
```

## This box at a glance (surveyed 30 Sep 2026)

Ubuntu 24.04, 96GB disk, 7.8GB RAM, Docker 29.7 already installed. CloudPanel
serves every site from `/home/<site-user>/htdocs/<domain>`, with nginx on
80/443 and CloudPanel itself on 8443.

**Ports already taken:** 3000, 3001, 8000 (Next apps), 8001, 8100, 7000, 9000
(Node apps), 5432 + 55432 (Postgres), 3306 (MySQL), 6379 (Redis), 6081
(Varnish), 8080 (nginx), 11211 (memcached). TalkTrack therefore uses
**`APP_PORT=3002`** — check it is still free before deploying:

```bash
ss -tlnp | grep -E ':3002' || echo "3002 is free"
```

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

# App directory and the uploads volume (10001 = the uid the container runs as)
mkdir -p /home/talktrackcrm/app /var/lib/talktrack/uploads
chown -R 10001:10001 /var/lib/talktrack
```

## 3. Clone the repository

The repo is private. Prefer a **deploy key** over a token: it is scoped to this
one repository, can be read-only, does not expire, and carries none of a
person's account access. A token in the clone URL also ends up in plaintext in
`.git/config` on the server.

**On the VPS — make the key:**
```bash
ssh-keygen -t ed25519 -C "talktrack-vps" -f /root/.ssh/talktrack_deploy -N ""
ssh-keyscan github.com >> /root/.ssh/known_hosts     # avoids the interactive prompt
cat /root/.ssh/talktrack_deploy.pub                   # copy this line
```

**On GitHub:** repo → **Settings → Deploy keys → Add deploy key**. Paste the
public key, title `talktrack-vps`, and **leave "Allow write access" unticked** —
the server only ever pulls.

**Back on the VPS — teach SSH which key to use, then clone:**
```bash
cat >> /root/.ssh/config <<'EOF'
Host github-talktrack
  HostName github.com
  User git
  IdentityFile /root/.ssh/talktrack_deploy
  IdentitiesOnly yes
EOF
chmod 600 /root/.ssh/config

git clone git@github-talktrack:brillbrainstechteam/MultiClientCRM.git /home/talktrackcrm/app
cd /home/talktrackcrm/app
```

This is also what makes `./deploy/deploy.sh` work later — its `git pull` needs
credentials that do not expire.

<details>
<summary>Alternative: fine-grained personal access token</summary>

GitHub → your avatar → **Settings → Developer settings → Personal access tokens
→ Fine-grained tokens → Generate new token**. Resource owner
`brillbrainstechteam`, **Only select repositories → MultiClientCRM**,
Repository permissions → **Contents: Read-only**. Then:

```bash
git clone https://<GITHUB_TOKEN>@github.com/brillbrainstechteam/MultiClientCRM.git /home/talktrackcrm/app
```

The token is stored in `.git/config`; it also expires, and `deploy.sh` will stop
pulling when it does.
</details>

## 4. Environment file

Copy the **Production** values out of Vercel (Project → Settings → Environment
Variables) into `/home/talktrackcrm/app/.env.production`:

```bash
nano /home/talktrackcrm/app/.env.production
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
| `APP_PORT` | optional; host port for the container (default 3000). Set it if 3000 is already taken on the box — the CloudPanel Reverse Proxy URL must use the same number. |

`WHATSAPP_TEST_*` are local-dev only; leave them out.

```bash
chmod 600 /home/talktrackcrm/app/.env.production
```

## 5. Build, migrate, start

Run these from `/home/talktrackcrm/app`. `--env-file` matters: it feeds both the
container environment and the `${...}` build args.

```bash
cd /home/talktrackcrm/app
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
| Reverse Proxy URL | `http://127.0.0.1:3002` (must match `APP_PORT`) |
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

- **Updates:** `cd /home/talktrackcrm/app && ./deploy/deploy.sh` (pull, rebuild, migrate, restart).
- **Logs:** `docker compose --env-file .env.production -f deploy/docker-compose.vps.yml logs -f talktrack`
- **Back up `/var/lib/talktrack/uploads` with the database.** A `CrmFile` row
  whose bytes are gone is a broken image.
- **Keep the Vercel project deployed for a few days.** Rollback is putting the
  old A record value back.
- Once settled, Postgres can move off Neon as its own project.
