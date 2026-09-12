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

## Refreshing the WhatsApp token in prod (test/permanent number)
The number's token is stored **in the database** (encrypted on `WhatsAppAccount`), seeded from `WHATSAPP_TEST_TOKEN` by the dev connect route. When you rotate the token:
1. Update `WHATSAPP_TEST_TOKEN` in Vercel (Production) → **redeploy**.
2. Signed into prod, POST **`/api/dev/connect-test`** once to re-store the new token in the DB. Quickest: browser console on the prod site:
   ```js
   fetch('/api/dev/connect-test', { method: 'POST' }).then(r => r.json()).then(console.log)
   ```
   `{ ok: true }` means the connected number now uses the new token. Sending (inbox, campaigns) reads this stored token.
