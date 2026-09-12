# Colleague setup — get running in ~15 minutes (dev-only)

This is the simplest path for a **second developer who builds locally** and does
NOT deploy to production (the repo owner handles prod deploys + prod migrations).

## Step 0 — Owner gives access (you do this, once)
1. GitHub → the repo **brillbrainstechteam/MultiClientCRM** → **Settings → Collaborators → Add people** → add his GitHub username. He accepts the email invite.
2. Send him the **`.env` file** securely (it holds secrets — use a password manager / secure share, not plain email/WhatsApp). It contains: Meta keys, Google client id/secret, Gemini + OpenAI keys, Places key, SESSION_SECRET, and the DB URLs.

## Step 1 — Colleague: clone + install
```bash
git clone https://github.com/brillbrainstechteam/MultiClientCRM.git
cd MultiClientCRM
npm install
```
Install **Docker Desktop** and **Node 20+** first if not present.

## Step 2 — Local database (his own, on his machine)
```bash
docker compose up -d postgres      # starts Postgres on localhost:5434
```
Then in his **`.env`**, set the DB URLs to the LOCAL docker DB (dev-only — he
never touches Neon/prod):
```
DATABASE_URL="postgresql://talktrack:talktrack@localhost:5434/talktrack?schema=public"
DIRECT_URL="postgresql://talktrack:talktrack@localhost:5434/talktrack?schema=public"
```
> Why: Prisma and Next both read `.env`. Pointing it at local docker means all
> his commands hit his own DB. (The owner's machine is different: its `.env`
> points at Neon for deploys, and uses `.env.local` for the local override.)

## Step 3 — Create tables + a login
```bash
npx prisma migrate deploy    # creates all tables in his local DB
npx prisma db seed           # creates the demo tenant + login + sample data
npx prisma generate          # (usually automatic) generates the client
```

## Step 4 — Run it
```bash
npm run dev                  # http://localhost:3000
```
Open `http://localhost:3000/login` → sign in with **tech@brillbrainsconsultants.com**
(ask the owner for the seed password). The app lives at `/crm`.

## Keeping his DB current later
When someone merges a new migration, he just:
```bash
git pull
npx prisma migrate deploy    # applies any new migrations to his local DB
```

## Branching (both devs)
- **One shared branch: `main`.** Do NOT keep a permanent "his branch / my branch".
- Per task, branch off main: `git checkout main && git pull && git checkout -b feat/<module>-<thing>`.
- Push the branch, open a **Pull Request into `main`**, the other person reviews, then merge.
- Pull `main` often (at least daily) so branches stay small and merge cleanly.

## Finding / referencing existing screens
Everything is in the repo he just cloned — he already has **all** our screens.
- **See them running:** `npm run dev` → `/crm` → click into any module.
- **Read the code / copy the pattern:** open files in his editor. Good reference
  screens that show the "wire UI → real API" pattern:
  - `crm/modules/reports/ReportsPage.tsx` (read + aggregate)
  - `crm/modules/settings/SettingsPage.tsx` (hub + form + PATCH)
  - `crm/modules/automation/screens/AutomationLibraryScreen.tsx` (list/create/toggle/delete)
  - `crm/modules/catalogue-orders/screens/CommerceRealScreen.tsx` (tabs + create + status)
  - Data-layer-swap: `crm/app/crm-data.ts`, `crm/CrmRoot.tsx`
- **Rule:** he can *read* any module for reference, but only *edit* the modules he owns (see `docs/WORK_SPLIT.md`). Shared UI lives in `crm/design-system/`.
