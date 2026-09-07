# TalkTrack CRM

The production WhatsApp CRM — a fresh **Next.js 16 + React 19 + Prisma + Postgres**
build, with the UI ported from the `crm-integration` design prototype and real
Meta WhatsApp Cloud API integration.

## Build stages

- [x] **A — Foundation** · Next app, design tokens, UI primitives, ported landing page, Prisma schema, docker Postgres, env template.
- [x] **B — Landing + Login + Signup UI** · ported auth screens (business name/type/phone, GST/CIN, business email).
- [x] **C — Real auth** · Prisma `User`/`Session`/`Tenant`, bcrypt password hashing, httpOnly session cookie, session-guarded routes.
- [x] **D — Onboarding + Meta Embedded Signup** *(built, ready-to-configure)* · `/onboarding` launches Facebook Login for Business with three paths (Coexistence / existing WABA / new number); `/api/auth/meta/exchange` swaps the code for a token server-side, subscribes the app to the client's WABA and stores an encrypted `WhatsAppAccount`; `/api/webhooks/whatsapp` verifies + receives events.

> Stage D is wired but **inert until you create a Meta app** and fill the `NEXT_PUBLIC_META_*` / `META_*` values in `.env`. Until then `/onboarding` shows a "configure Meta first" notice.

## Next

- [ ] **E** — message pipeline: consume `WebhookEvent` rows → `Conversation`/`Message`, live inbox.
- [ ] **F** — port the CRM modules (Inbox, Contacts, Calling…) from `crm-integration`.

## Local setup

```bash
cp .env.example .env        # then fill in the values
npm install
npm run db:up               # start Postgres in docker (port 5433)
npm run prisma:migrate      # create the schema
npm run dev                 # http://localhost:3000
```

## Meta / WhatsApp setup checklist (stage D)

This is a **multi-tenant platform**: you are the *Tech Provider*, and each client
connects **their own** WhatsApp Business Account through Embedded Signup. Your own
number is just your first tenant — connect it via **Coexistence** so it keeps
working in the WhatsApp Business app.

Create the following in the [Meta for Developers](https://developers.facebook.com/)
console, then put the values in `.env`:

1. **Create a Meta app** — type **Business**. Copy the **App ID** → `NEXT_PUBLIC_META_APP_ID` and the **App Secret** → `META_APP_SECRET` (server-only).
2. **Add the WhatsApp product** to the app.
3. **Add Facebook Login for Business**; set **Allowed domains / redirect** to your `APP_URL`.
4. **Create an Embedded Signup configuration** (WhatsApp → Embedded Signup). Copy the **configuration ID** → `NEXT_PUBLIC_META_CONFIG_ID`. Enable the onboarding options you want clients to have: **new number**, **existing WABA**, and **Coexistence** (keep the WhatsApp Business app). Set `NEXT_PUBLIC_META_COEXISTENCE_FEATURE` to the coexistence `featureType` value shown in the current docs.
5. **Webhooks** — point the WhatsApp webhook to `https://<your-domain>/api/webhooks/whatsapp`, set the **Verify Token** to match `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, and subscribe to `messages`. (For local dev, expose the port with a tunnel, e.g. ngrok.)
6. **Business Verification** of your Meta Business.
7. **Become a Tech Provider** and request **Advanced Access** (App Review) for `whatsapp_business_management` + `whatsapp_business_messaging`. **Until approved, Embedded Signup only works for people with a role on your app** (dev mode) — perfect for building/testing now.

### About the three client paths + coexistence

- **Coexistence** keeps the client's number working in the WhatsApp Business app **and** on the Cloud API; recent chat history + contacts sync (within Meta's sync window / eligibility). Best for SMB clients already on the app.
- **Existing WABA** links a client who already has a Cloud API number.
- **New number** registers a fresh number on the Cloud API.
- A plain **migration** (no coexistence) *removes* the number from the WhatsApp Business app — avoid for daily-driver numbers.

> Coexistence eligibility, the exact `featureType`, and API versions evolve —
> confirm against Meta's current Embedded Signup docs.

> Secrets live only in `.env` (git-ignored). The App Secret and access tokens are
> used **server-side only** and tokens are **encrypted at rest** — never shipped to the browser.

## Project layout

```
app/            Next.js App Router (landing, /login, /signup, later /onboarding + /api)
lib/ui/         Ported design-system primitives (Button, Badge, …)
prisma/         Prisma schema + migrations
docker-compose  Local Postgres
```
