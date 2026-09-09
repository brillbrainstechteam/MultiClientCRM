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

## 🛠️ REMAINING BUILD — no input needed (my queue, in order)

These need no answer from you — just build time. Backends above are ready; most of
this is wiring the (rich) prototype UIs to the live APIs, which I can't runtime-verify
without logging in, so I build them behind the deploy build-check.

1. **Campaigns builder → API wiring.** The multi-step builder UI isn't yet posting to the create/send API. (Backend done.)
2. **Automation rules UI.** A simple create/enable/edit rules screen mapped to the API (the prototype's screen is the heavier flow-builder = Option A; deferred).
3. **Calling dialer UI wiring.** Hydrate the calling workspace (tasks/attempts/lists) from `/api/crm/calls`; model call tasks/lists if we want the full dialer (mostly meaningful once a provider is connected).
4. **Team & Access — Structure / Performance / Work-distribution / Audit UI.** The tracking layer is now built (assignment + audit log + APIs). Remaining is wiring the UI screens: Audit screen to `/api/crm/audit` (its event-type enum is HR-focused and needs a small mapping/broadening), Performance/Work-distribution to per-agent assignment counts, Structure to real branches/teams (single-branch today).
5. **Dashboard Overview / Alerts** — real KPIs (same source as Reports) + the alert set above.
5b. **Settings sub-screens** — WhatsApp Number Registry (real numbers: needs mapping the rich onboarding record, or a simpler real numbers view), Contact settings, Team/Routing settings, Import history. (Settings hub + Business profile + Integrations are done.)
6. **Catalogue & Orders V1** (lean, per decision #4) — new schema (catalogue items + enquiry→quotation→order), no Razorpay.
7. **Roles & permissions** — add the Admin role + Team/Function field; apply the decided capability matrix across modules.
8. **Billing** — plan tiers UI/gating (decision #2).
9. **Automation Option A** (visual flow builder + node execution) — later, if you want it beyond Option B.
10. **Collections** — once spec'd (#1 above).

---

## External / async (not code)
- **Meta Business Verification** — for live WhatsApp at volume + other-business onboarding. Own account works in dev now.
- **Google OAuth verification** — only for external users of sensitive scopes; owner account works in Testing mode.
