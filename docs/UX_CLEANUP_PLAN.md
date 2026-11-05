# TalkTrack — UX Cleanup Plan (review only, no code changes)

> Senior product-design / UX / frontend review against the recurring AI-UI
> problems: excess text, repetitive screens, unnecessary steps/tabs/modals,
> poor grouping, inconsistent hierarchy, features beyond requirement.
> **Nothing is changed yet** — this is a prioritized, evidence-based plan to
> approve before implementation. Implementation will reuse existing components,
> preserve working behaviour, and be validated on desktop + mobile.

---

## A. Cross-cutting issues (fix once, benefits every module)

### A1. Explanatory text is doing the UI's job *(P0)*
Evidence (actual strings in the app): page descriptions and guardrail banners
run 1–2 sentences each — e.g. *"Every lead from every source, in one triage
queue — matched, classified, routed, and tracked against a first-response
SLA."*, *"WhatsApp conversation/template fees, telephony minutes and AI-voice
minutes are metered and billed on top of…"*, *"Map a column to Mobile number
before continuing — it is the identity WhatsApp messages are sent to."*
- **Pattern to apply everywhere:** a screen's `PageHeader.description` should be
  **≤ 8 words or removed**. The title + the UI should explain themselves.
- Keep *contextual* guardrail text only when it blocks an action (e.g. "Map a
  column to Mobile number"), and shorten it ("Map the Mobile column to
  continue.").
- **REMOVE** descriptions that restate the title ("Lead Intake — Every lead from
  every source…").

### A2. Duplicated "Overview / Reports / Performance" surfaces *(P0)*
The *Overview / Reports / Performance / Analytics* concept is re-implemented in
**7 team-access screens, 4 calling, 3 dashboard, 3 campaigns, 2 contacts,
2 commerce**. A user sees "reports" in five places.
- **MERGE** module-level report tabs into the **global Reports module** +
  the **Dashboard** attention cards. A module keeps at most a small "stats strip"
  on its main screen, not a separate Reports tab.
- Concrete: **Contacts → Reports tab** duplicates the global **Reports** module →
  remove the tab, deep-link from Dashboard.

### A3. Visual hierarchy & spacing are inline-styled per screen *(P1)*
Many recent screens (Intake, Lead Sources, Leakage, auth) use **inline styles**
with hard-coded px and colors instead of the design tokens/CSS used by the older
screens (`AllContactsScreen.css`, etc.). Result: inconsistent spacing, badge
styles, button density.
- **REDESIGN (consistency pass):** move repeated inline patterns (status badges,
  stat tiles, card rows, modals) into a few shared components/classes so every
  module inherits one spacing scale and one badge style.

### A4. Modal/drawer overload *(P1)*
Contacts alone registers **9 overlays** (Advanced Filter, Assign, Tags, Stage &
Follow-up, Export, Consent/Block/Data-Rights, Confirmation, Add/Edit, Google
Contacts). Several are one-field actions that interrupt flow.
- **MERGE** single-field drawers (Tags, Stage & Follow-up) into **inline row
  actions** or one "Edit" drawer with sections. Keep full drawers only for
  genuinely multi-step tasks (Add/Edit contact, Import).

---

## B. Per-module review (objective → journey → cleanup)

> KEEP = leave as-is · MERGE = combine with another · REMOVE = delete ·
> REDESIGN = restructure.

### Leads (new module)
- **Objective:** capture a lead and get it to the right person fast.
- **Journey today:** Lead Intake (triage) · Lead Leakage · Lead Sources · Find New Businesses — 4 tabs. Good, journey-ordered.
- **Cleanup:**
  - **Shorten** every header description to ≤8 words (A1). Intake, Leakage,
    Sources all have 1–2 sentence descriptions.
  - **Lead Sources connect catalog:** KEEP (recently fixed) — but the health
    summary chips + add-flow use inline styles; fold into shared components (A3).
  - **Find New Businesses** overlaps conceptually with Import; KEEP but ensure
    one "add as prospect" path, not two.

### Contacts
- **Objective:** find a customer, see their 360, act on them.
- **Journey today:** 8 tabs (Overview, All Contacts, Segments, Import & Export,
  Consent, Data Quality, Reports, Zones).
- **Cleanup:**
  - **REMOVE "Reports" tab** → global Reports (A2). (8 → 7 tabs.)
  - **MERGE "Zones"** into **Settings → Assignment** (it's configuration, used
    rarely, not a daily contact task). (7 → 6 tabs.)
  - **MERGE "Consent" + "Data Quality"** are both *list-of-problems-to-fix*
    screens → consider one **"Data Health"** tab with sections (consent gaps,
    duplicates, invalid, incomplete). (6 → 5 tabs.) *Validate with users first.*
  - **Overview** duplicates Dashboard attention cards → trim to contact-specific
    quick actions, or REMOVE and land on **All Contacts** by default.
  - **Customer 360** tabs (Profile · Pre-call brief · Journey · Sales · Activity ·
    Consent): KEEP, but "Journey" vs "Activity" likely overlap → verify and
    possibly MERGE.

### Dashboard
- **Objective:** what needs my attention now.
- **Cleanup:** make it the **single** home for cross-module attention +
  reporting entry (absorbs the removed module "Reports/Overview" tabs, A2).
  Remove any tile that just links to a screen without a number.

### Inbox / Conversations
- **Objective:** reply to customers.
- **Cleanup:** audit for the AI-pattern of a toolbar button per action. KEEP core
  (reply, assign, notes, labels); **MERGE** rarely-used actions into an overflow
  (⋯) menu. *(Needs a focused pass during implementation.)*

### Campaigns
- **Objective:** send an approved message to a segment.
- **Journey:** builder is a multi-step wizard with lots of guardrail text
  (evidence: many 1–2 sentence validation strings).
- **Cleanup:** **shorten** the validation copy to one line each; ensure the
  wizard has **no step that just confirms the previous one**; collapse
  "Review & Launch" guidance into inline field hints.

### Calling & Visits
- **Objective:** work a call list / log outcomes.
- **Cleanup:** 5 tabs + several "telephony not connected" explainer banners →
  one concise empty state ("Connect telephony to enable click-to-call.").
  Check for Call Desk vs Call Workspace duplication (two screens, one job).

### Templates
- **Objective:** create/manage approved templates.
- **Cleanup:** 5 tabs — verify Repository vs Library vs Drafts aren't three views
  of the same list; **MERGE** if so.

### AI Agents
- **Objective:** configure an AI agent.
- **Cleanup:** heavy multi-step builder with many gating banners ("Complete the
  Purpose step before continuing to Knowledge, Safety, Test or Activate.").
  **Shorten** gating copy; show step state with the stepper, not a sentence.

### Auth / Signup (recently built)
- **Objective:** get in.
- **Cleanup:** KEEP the 3 methods. The **email+password signup form is long**
  (business name, type, model, phone, email, GST, CIN, password on one screen) —
  this is the *right* place for business info, but consider the same **"identity
  → business details"** two-step for consistency with Google/OTP (optional).

### Settings
- **Objective:** configure the workspace.
- **Cleanup:** 9 Contact-settings screens (Fields, Tags, Lifecycle,
  Classification, Sources, Assignment, Consent, Integrations, Permissions) —
  verify each is used; **MERGE** thin ones. This is where **Zones** and
  module-level config should live (A2/B-Contacts).

---

## C. Prioritized backlog
| P | Item | Effort | Payoff |
|---|---|---|---|
| **P0** | Text pass: every `description` ≤8 words or removed; shorten guardrail banners | M | High — biggest clutter source |
| **P0** | Remove duplicate Reports tabs → global Reports + Dashboard | M | High |
| **P1** | Shared components for badges / stat tiles / card rows / modals (consistency) | M–L | High — fixes hierarchy & spacing everywhere |
| **P1** | Contacts 8→5 tabs (remove Reports, move Zones to Settings, merge Consent+Data Quality→"Data Health") | M | High |
| **P1** | Collapse single-field drawers into inline/overflow actions | M | Medium |
| **P2** | Per-module wizard audits (Campaigns, AI Agents, Calling) for redundant steps | L | Medium |
| **P2** | Inbox toolbar → overflow menu for rare actions | M | Medium |

**Guardrail:** no new features/screens/decorations; reuse existing components;
preserve behaviour; validate desktop + mobile after each change.

---

## D. Part-2 requirement — Company → Contacts, custom columns, data cleaning

### D1. Multiple customers per company *(currently NOT supported properly)*
Evidence: `CrmContact.company` is a **free-text string** — there is no
Account→Contacts relationship, so "click a company → see all its customers"
can't work reliably (typos split a company; no company record to open).
- **Recommendation (phased):**
  - **Phase 1 (no schema change):** an **Accounts view** that **groups contacts
    by normalised company name**; clicking a company shows all its contacts.
    Fast, gives the requested behaviour immediately.
  - **Phase 2 (proper model):** a **`CrmAccount`** entity (business name, city,
    zone, GSTIN, relationship owner, product interests) with contacts linked by
    `accountId` — this matches the B2B hub docs ("the Account is the main
    commercial relationship") and makes the Owner/Purchase-Manager/Accounts
    contacts one account. New WhatsApp from another person at the same company →
    a new **contact under the existing account**, not a new customer.
  - Keep B2C unaffected (person-centric; account optional).

### D2. Custom columns / new datapoints *(partially supported)*
Evidence: `CrmContact.customFields Json?` exists, and a **Contact Fields** config
screen exists. Gaps:
- **Import wizard:** add a **"Create new field"** option in column mapping so a
  bulk Excel column that matches nothing becomes a new custom field (written to
  `customFields` + registered in the field registry).
- **All Contacts:** let users **show custom columns**; any new datapoint added to
  a contact that isn't a core field becomes a custom field automatically.

### D3. Data cleaning steps — map to backend (keep invisible, as requested)
| Required step | Status today | Action |
|---|---|---|
| Standardize formatting (10-digit India, strip dashes/spaces) | ✅ `normMobile` (strips non-digits, handles scientific-notation Excel cells) | keep; run in import pipeline |
| 1 number per cell, no commas/slashes/quotes | ✅ `normMobile` normalises; import splits | keep |
| Mark duplicates (red/flag) | 🟡 Data Quality detects duplicates + merge review | surface clearly on import ("N possible duplicates") |
| Remove duplicates after manual verify | ✅ Duplicate Merge Review (manual, no silent delete) | keep |
| International → map to right country code | 🟡 `normMobile` likely assumes +91 | **add**: per-row country selection / default-country setting on import |
| Name completeness (no first-name-only/nicknames/typos), mark complete/incomplete | 🟡 Data Quality has "incomplete profiles" | **add**: name-quality check (single token / too short) → flag |
| Verify emails (bounce) — optional | ❌ | optional later (3rd-party) |
| WhatsApp-active check — optional | ❌ | optional later (Meta) |
| Completing the data | 🟡 Data Quality incomplete queue | keep; add custom-field completeness |
- **Principle (as requested):** these run in the **import/intake pipeline
  (backend)** — don't show the steps as a checklist; surface only the **results**
  (counts + the Data-Health queue to fix).

### D4. Part-2 build order (after the Part-1 cleanup is approved)
1. Accounts view (group-by-company) + company → contacts (Phase 1).
2. Import mapping "create new field" → custom columns; show custom columns in All Contacts.
3. Import cleaning: default-country + international country-code mapping; name-quality flag; duplicate count on import summary.
4. *(Later / if wanted)* `CrmAccount` entity (Phase 2); optional email/WhatsApp validation.

---

## Approval
Please pick what to green-light. Suggested first slice: **P0 text pass + remove
duplicate Reports** (fast, high-impact, low-risk), then **Contacts 8→5 tabs** and
**D1 Phase-1 Accounts view**. I won't touch code until you approve the scope.
