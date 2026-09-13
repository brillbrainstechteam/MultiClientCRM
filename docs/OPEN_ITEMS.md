# TalkTrack CRM — Open items & build status

_Last updated: 2026-09-09._ Decisions frozen from `CRM_Open_Items_Recommended_Decisions.md`.
Working autonomously — this doc is the single place tracking what still needs the
product owner's answer vs. what's built vs. what's left to build.

---

## ❓ STILL OPEN — needs your answer (nothing else is blocked on you)

1. **Collections (USP module) — spec.** What it does, inputs/outputs, who uses it. Nothing built yet; it's the only module with no direction.
2. **Telephony credentials (Calling).** BYOT is built and provider-agnostic; real dialing/recording/transcription needs the provider account (Exotel first) + creds once you're onboarded to the client platform. Until then, Calling logs agent-entered call outcomes.
3. **Branch/team structure.** Single-branch is assumed (one default branch/team derived from your business). If you run **multiple branches/teams**, say so (or I'll add a UI to create them) — this unblocks Team & Access → Structure.
4. **Dashboard alerts (optional confirm).** I'll default the alert set to: connection/number health, response-window expiring, unassigned conversations, overdue follow-ups, stale prospects, dormant customers. Tell me if you want different ones.

_Auto-decided in your absence (change anytime):_ **Automation = Option B** (lean trigger→condition→action rules on the webhook) rather than the full visual flow builder (Option A). The flow-builder UI can be layered on later.

---

## ✅ DONE — real data, live in prod

- **Contacts** (full requirement set) + **Imports** (CSV, OCR, VCF, Maps prospecting) + **Google Contacts/Sheets/VCF sync**.
- **Inbox** — real conversations + real sending.
- **Reports** — real analytics + **dormancy** (stale >30d / dormant >90d) + **sales funnel** (users called -> enquiries -> orders, from real call log + orders, `/api/crm/reports/funnel`).
- **Kundli (pre-call dossier)** — AI-researched company brief + tailored call script per contact (new prospect vs existing customer). `/api/crm/contacts/[id]/kundli` (get cached / generate); surfaced as a "Pre-call brief" tab in Customer 360. Gemini + Google Search grounding for live web (needs Gemini credits — currently depleted, 429), OpenAI fallback for knowledge-only. Cached on the contact + regenerable.
- **Templates** — real approved templates from the connected WABA (Meta Graph).
- **Onboarding / Embedded Signup**, **Auth + Landing**.
- **Team & Access → People** — real team from auth users.
- **Campaigns V1 — backend**: list/create/send APIs (real audience, opt-out suppression, dedupe + cap, template send via Cloud API, per-recipient results). Tables live in prod.
- **Event-based campaigns** (type `trigger`): create via the builder's Event & template step (removed the `api` type); fires the chosen approved template to a contact when the event occurs (first message / keyword / any inbound), once per contact per campaign, executed on the WhatsApp webhook. `triggerEvent`/`triggerKeyword` on CrmCampaign.
- **Team & Access — backend**: conversation **assignment** persisted (`/api/crm/conversations/[id]/assign`, wired into Inbox assign, role-gated) + **audit log** (`/api/crm/audit`) capturing campaign sends, automation runs, order status changes, profile updates and assignments; `teamFunction` on User; People screen already real.
- **Automation — engine + API (Option B)**: rules API (`/api/crm/automations`) + webhook execution (first_message / keyword / inbound triggers → send_message / add_tag / set_lead_status). Rules are disabled by default.
- **Calling — backend (BYOT)**: telephony connection (`/api/crm/telephony`) + call log (`/api/crm/calls`, list + log/click-to-call entry). Provider-agnostic; ready for creds.
- **Settings** — real hub with **Business profile** (edit business name/model/GST/CIN/entity, `/api/crm/settings/profile`, owner/admin-gated) and **Integrations** (live Google + telephony + WhatsApp connection status). Hub links to every settings area.

_All schema for Campaigns / Automation / Calling is migrated to prod._

---

## ✅ UI WIRING PASS (2026-09-09) — now real, saving to DB, no mock

1. **Campaigns builder** — Review step creates + sends (or schedules) a real campaign; event-based path creates real trigger campaigns.
2. **Automation** — real rules manager (list/create/enable/delete) at the module landing, executing on the webhook.
3. **Calling** — real Call Desk (call log + log-call + BYOT telephony connect); real dialing awaits provider creds.
4. **Catalogue & Orders** — real Commerce screen (Catalogue + Orders tabs): add items, create enquiry/quotation/order, change status.
5. **Team & Access** — People (real team), **Audit** (live trail from `/api/crm/audit`), **Performance** (per-agent assignments/calls/actions from `/api/crm/team/performance`). `teamFunction` surfaced.
6. **Dashboard** — real KPIs + funnel + needs-attention + connection banner.
7. **Settings** — hub + Business profile + Integrations; **WhatsApp numbers** now show the real connected accounts.
8. **Billing** — real plan management (switch persists to tenant, owner-only).
9. **Roles & permissions** — capability matrix enforced **server-side** on the high-impact actions (assign, reassign, campaign send, automation write, catalogue manage, plan change, profile edit, audit view).

## 🛠️ Still-thin (refinements, no input needed)
- **Roles matrix** — server-enforced on key actions; per-module *client-side* button hiding is partial, and there's no in-app **Admin-invite / role-edit UI** yet (roles are set on the user record).
- **Team & Access → Structure / Work-distribution** — single-branch today; richer views want multi-branch (#3 above) + more tracking.
- **Dashboard Alerts** page + **Settings** Contact/Routing sub-screens + **Automation Option A** (visual flow builder) — later.
- The heavy prototype sub-surfaces (catalogue selections/returns/sync/media, calling queues/lists) are intentionally out of V1 scope.

---

## 🟡 Meta — Embedded Signup for customers (updated 2026-09-13)

**Symptom:** Connect WhatsApp → Meta shows *"BrillBrains Brand Development can't onboard
customers right now"* and spins forever. This is Meta's gate, not our code — it fires until
**all three** are true:

| # | Requirement | Status |
|---|---|---|
| 1 | Business Verification | ✅ done |
| 2 | App Review → **Advanced Access** for `whatsapp_business_messaging` + `whatsapp_business_management` | ❌ submit the screencast (below) |
| 3 | **Tech Provider onboarding wizard** actually completed (verified ≠ registered) | ❌ ~2 min of clicks |

**Step 3 path:** App dashboard → Use cases → *Connect with customers on WhatsApp* → Customize →
*Become a Tech Provider* → Continue onboarding → **Independent Tech Provider** → Start onboarding.
Done when the dashboard reads *"You are now a Tech Provider — 2 of 2 steps complete"* and
Embedded Signup Builder / Partner Tools appear in the left nav.

Also per Meta docs: the **test number's WABA was created via the developer app, so it can never
be onboarded through Embedded Signup** — use a real number once 1–3 are done. Limits: 10 new
customers per rolling 7 days; 200 after Business Verification + App Review + Access Verification.

**App Review screencast — does NOT need Embedded Signup** (the permissions are what's reviewed):
- `whatsapp_business_messaging`: send from TalkTrack Inbox → **show it arriving on the phone** →
  reply from the phone → it appears in the Inbox.
- `whatsapp_business_management`: scroll `/crm/templates` (templates read live from the WABA).
- Audio muted, clean Chrome profile (no personal tabs), no idle stretches, reviewer login
  (`reviewer@talktrackcrm.com`) at the start.

**Connection for recording:** Onboarding → *Connect manually with an access token*, using a
**System User** token (Business Settings → Users → System users → Generate new token → app
TalkTrackCRM → expiry Never → both WhatsApp permissions). The token pasted on 2026-09-13 was
revoked by Meta (*"session was invalidated explicitly using an API call"*), so generate a fresh one.
`/diagnostics/whatsapp` confirms every link is green before you hit record.

## External / async (not code)
- **Google OAuth verification** — only for external users of sensitive scopes; owner account works in Testing mode.
