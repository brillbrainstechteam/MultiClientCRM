# Deploying & hosting

## Where prod runs
- **Host: Vercel** — project `talktrack-crm` (team `bb-tech1`). Prod builds + runs here.
- **Stable prod URL:** `https://talktrack-crm.vercel.app` (plus each deploy gets an immutable `talktrack-<hash>-bb-tech1.vercel.app`).
- **Custom domain:** `brillbrainsconsultants.com` exists on the team — if it's pointed at this project, that's the public URL. (Cloudflare, if ever used, is only DNS/CDN in front of Vercel — never the app host.)
- **The `trycloudflare.com` URL** in local `.env` is a throwaway **dev tunnel** to expose localhost to Meta webhooks. Not prod. Don't put it in Vercel.

## How to deploy a fix to prod
1. Merge your change into `main` (via PR).
2. Deploy: `npx vercel deploy --prod` (or enable Vercel Git auto-deploy on `main`).
3. The build runs `prisma generate && next build`. If it fails, prod stays on the previous good build (safe).

There is **no editing prod directly** — a Next.js + Prisma app is built and served by the host. All prod fixes go through a build/deploy.

## Environment variables (prod)
- Managed in **Vercel → Project → Settings → Environment Variables** (or CLI `vercel env ls|add|rm production`).
- **Env changes only take effect on the next deploy** — after editing a var, redeploy.
- Local `.env` (yours) points at Neon for CLI/deploys; `.env.local` overrides the DB to local docker for `npm run dev`. A dev-only colleague just uses local URLs in `.env`.

## Database migrations to prod
After a schema migration is merged:
```bash
npx prisma migrate deploy   # applies pending migrations to Neon (prod)
```
(This reads the Neon URL from the owner's `.env`.) Additive migrations are safe; one migration in flight at a time (see WORK_SPLIT.md).

## Refreshing the WhatsApp token in prod
The number's token lives **in the database** (encrypted on `WhatsAppAccount`) — **not in env**. Sending, templates and webhooks all read the stored token. To rotate it:
1. Generate a new **System User** token: Business Settings → Users → System users → Generate new token → app **TalkTrackCRM** → expiry **Never** → `whatsapp_business_management` + `whatsapp_business_messaging`. (The system user must have the WhatsApp account assigned under *Assign assets*.)
2. Signed into prod: `/onboarding` → **Connect manually with an access token** → paste → Connect.
3. Confirm every check is green at `/diagnostics/whatsapp`.

No env change and no redeploy. `WHATSAPP_TEST_TOKEN` is read only by `/api/dev/connect-test`, a local-dev shortcut that is **disabled in production** (it would overwrite the stored token with whatever the env holds).

## File storage (showroom photos)
Uploaded photos are kept in object storage and only a pointer row (`CrmFile`) goes in the database. Two drivers, picked by env — nothing is tied to the current host:

| Driver | Use when | Env |
|---|---|---|
| `local` | Running on our own VPS | `STORAGE_DRIVER=local`, `STORAGE_DIR=/var/lib/talktrack/uploads` |
| `s3` | MinIO on the VPS, or cloud credits (Cloudflare R2, Backblaze B2, AWS S3) | `STORAGE_DRIVER=s3` + `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_ENDPOINT` (MinIO/R2), `S3_FORCE_PATH_STYLE=true` (MinIO) |

With `STORAGE_DRIVER` unset the app uses S3 when `S3_BUCKET` is set and local disk otherwise.

Two things to get right on the VPS:
1. **`STORAGE_DIR` must live outside the deploy directory** (e.g. `/var/lib/talktrack/uploads`) and be writable by the app's user, or a redeploy deletes every uploaded photo.
2. **Back it up with the database.** A `CrmFile` row without its bytes is a broken image, so the uploads directory (or bucket) and Postgres have to be backed up together.

Files are served through `/api/crm/files/<id>`, which checks the signed-in user's workspace — buckets stay private, and no public URLs are handed out. Each row records the driver that stored it, so moving from local disk to S3 later can be done gradually without breaking existing photos.
