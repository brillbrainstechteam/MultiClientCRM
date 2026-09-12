# TalkTrack CRM — Two-person work split & workflow

_Last updated: 2026-09-12._ Companion to `docs/OPEN_ITEMS.md` (the backlog).
Goal: two developers building in parallel, **module by module**, with minimal
merge conflicts and no migration collisions.

## Core principle: own whole modules end-to-end
Each module = its UI (`crm/modules/<module>/`) **+** its API namespace
(`app/api/crm/<module>/`) **+** its data/hydration file. Whoever owns a module
owns all three, so two people rarely touch the same file.

## The split

### Track A — Conversations & Outreach (owns the messaging/webhook layer)
- **Inbox** (`crm/modules/inbox`, `app/api/crm/inbox`, `app/api/wa/*`)
- **Automation** — Option A visual-flow **execution engine** (`crm/modules/automation`, `lib/crm/automation.ts`, webhook)
- **Campaigns** — builder polish, drip/recurring V2 (`crm/modules/campaigns`, `app/api/crm/campaigns`)
- **Templates** — create/submit-to-Meta + approval flow (`crm/modules/templates`, `app/api/crm/templates`)
- **Calling** — dialing + queues/lists once telephony creds land (`crm/modules/calling`, `app/api/crm/calls`, `/telephony`)

_Rationale: these all sit on the WhatsApp send/webhook/automation layer. One
owner for `webhook`, `wa/send`, `lib/crm/automation.ts` avoids the worst conflicts._

### Track B — Commerce, Team & Admin
- **Catalogue & Orders** — returns (case log), inventory (stock), media uploader (`crm/modules/catalogue-orders`, `app/api/crm/catalogue`, `/orders`, `/selections`)
- **Collections (USP)** — once spec'd
- **Team & Access** — Structure (multi-branch), Work-distribution, invite/role-edit UI (`crm/modules/team-access`, `app/api/crm/team/*`, `/audit`, `/conversations/[id]/assign`)
- **Roles & permissions** — client-side matrix enforcement across modules (owns `permissions.ts` conventions)
- **Settings** — Contact settings, Routing, Import history (`crm/modules/settings`, `app/api/crm/settings`)
- **Billing / Dashboard / Reports** (`crm/modules/{billing,dashboard,reports}`)

## Shared "coordination zone" (both may touch — go slow, communicate, small PRs)
Changing any of these needs a heads-up in chat first:
- `prisma/schema.prisma` + `prisma/migrations/**` — **see migration rule below**
- `crm/CrmRoot.tsx` — the startup hydration list (each live-binding module registers here)
- `app/api/crm/bootstrap/route.ts` — the workspace payload
- `crm/design-system/**` — shared components (prefer adding, not changing signatures)
- `crm/mock-data/**` — shared types + live bindings
- `lib/crm/audit.ts`, `lib/db.ts`, `lib/auth/*` — shared infra

## Migration rule (critical — avoid corruption)
Only **one migration in flight at a time.**
1. Announce "taking the migration lock" in chat.
2. `git pull` main, then run `prisma migrate dev --name <x>` against **local docker** (inline `DATABASE_URL=...localhost:5434...`).
3. Commit the generated `prisma/migrations/<timestamp>_<x>/` folder, open a PR, merge.
4. Release the lock. The other person pulls before their next migration.
Never generate two migrations on two branches simultaneously — the timestamps/`_prisma_migrations` history will conflict. `prisma migrate deploy` to Neon (prod) is run once per merged migration.

## Branch & PR workflow
- Branch per change: `feat/<module>-<thing>` (e.g. `feat/catalogue-returns`).
- **PR into `main`; the other person reviews.** Build must pass (`npx tsc --noEmit` clean + Vercel preview build green) before merge.
- Deploy to prod (`npx vercel deploy --prod`) after merge — agree who owns the deploy button, or let Vercel auto-deploy `main`.
- Keep `docs/OPEN_ITEMS.md` updated with an **Owner** and **Status** per item.

## Environment setup for the colleague (one-time)
1. Clone `github.com/brillbrainstechteam/MultiClientCRM`, `npm install`.
2. Get `.env` from you (Neon prod URLs, Meta, Google, Gemini, OpenAI, Places, SESSION_SECRET).
3. Local DB: `docker compose up -d postgres` (port 5434); put the local `DATABASE_URL`/`DIRECT_URL` in `.env.local`.
4. `npx prisma migrate deploy` (local) or `migrate dev`, then `npm run dev`.
5. Login: seeded `tech@brillbrainsconsultants.com`.

## Suggested first sprint (by priority)
- **Track B:** Roles matrix client-enforcement + invite/role-edit UI (unblocks proper multi-user testing) → then Returns + Inventory.
- **Track A:** Templates create/submit-to-Meta (unblocks real Campaigns content) → then Automation flow-execution engine.
- **Both, before their tracks:** resolve the decisions in OPEN_ITEMS — Collections spec (B), single-vs-multi-branch (B), telephony provider + creds (A), Gemini credits.

## Blocked on external (not code — track separately)
Sync/connectors (external ERP + creds), media storage bucket, telephony creds,
Razorpay (payments/refunds, Phase 2), Meta Business Verification, Google OAuth verification.
