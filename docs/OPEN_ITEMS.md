# TalkTrack CRM — Product decisions & open items

Decisions frozen 2026-09-09 from `CRM_Open_Items_Recommended_Decisions.md`.
Items 1–7 are **DECIDED**; item 8 (Collections) is the only one still open.

---

## 1. Roles & permissions — ✅ DECIDED
- Access roles: **Owner → Admin → Manager → Agent** (do NOT split into Sales/Marketing roles).
- Add an orthogonal **Team/Function**: Sales / Marketing / Customer Support / Other.
- Capability matrix (scope by role):
  - **Owner**: everything, incl. billing/subscription (Owner only).
  - **Admin**: everything except billing; manage team/roles/integrations/numbers/telephony.
  - **Manager**: team/assigned scope; reassign within team; create campaigns/automation (optional approve); bulk import/export optional; cannot manage roles/numbers/integrations.
  - **Agent**: own/assigned scope; reply/call/update/follow-up/enquiry/mark-spam; cannot reassign, restore spam, bulk import/export, or approve.
- **AI approval**: Agent approves AI changes on own calls/contacts; Manager approves team-level; Admin/Owner approve bulk AI actions. High-impact actions (Customer Converted, Lost, Delete, Bulk Export, Bulk Campaign) need explicit permission.
- _Full matrix: see source doc §1._

## 2. Plan tiers — ✅ DECIDED
- **Trial (14d) / Starter / Growth / Advanced**.
- Gating highlights: numbers 1/1/3/10+, seats 2/5/15/50+, campaigns test/5·mo/25·mo/unlimited, advanced automation Growth+, custom roles Advanced only, multi-branch Growth+.
- **Metered separately (not in SaaS price)**: Meta messaging, telephony minutes, AI voice minutes, AI/transcription.
- _Full table: source doc §2._

## 3. Dormancy — ✅ DECIDED
- **Customer: dormant after 90 days** with no meaningful activity.
- **Prospect: stale after 30 days** with no meaningful activity.
- Threshold **configurable per workspace**.
- Meaningful activity = connected call, WhatsApp conversation, meeting, enquiry, order, tracked catalogue interaction, or customer-initiated comms. A campaign merely *sent* does NOT reset dormancy unless the customer engages.

## 4. Orders / Catalogue — ✅ DECIDED (V1 lightweight)
- **Catalogue V1 fields**: Title, SKU/Design No., Category, Sub-category, Description, Images, (Video opt); Variants, Size, Weight, Material/Metal, Purity, Colour, custom attrs; jewellery opt: Gross/Net/Stone weight, Diamond/Stone details, 18K/22K; Pricing Mode (Fixed / Indicative / **Price on Request**) + price where applicable, Stock Status (Available / Made-to-Order), MOQ; Tags, Collection, Active/Inactive, Last Updated. **Do not force live pricing.**
- **Order statuses**: Draft → Confirmed → Payment Pending → Part Paid / Paid → Processing → Ready to Dispatch → Shipped → Delivered; + Cancelled / Returned. B2B path: **Enquiry → Quotation → Confirmed Order**.
- **Order fields**: Order ID, Company, Contact Person, Items, Qty, Variant, Price/Quotation, Discount, Tax, Total, Payment Status, Order Status, Sales Owner, Delivery/Dispatch, Notes, Created Date, Expected Delivery, Source.
- **Razorpay: Phase 2.** V1 = catalogue + enquiry + quotation/order tracking. Integrate existing payment systems rather than forcing CRM checkout.

## 5. Templates / Campaigns — ✅ DECIDED
- Support all 3 WA categories (**Marketing / Utility / Authentication**) with practical subcategories (Introduction, Catalogue, Follow-up, New Collection, Exhibition, Offer, Appointment, Order Update, Payment Reminder, Dispatch Update, Welcome, Reactivation).
- Naming: **`PURPOSE_LANGUAGE_VERSION`** (e.g. `CATALOGUE_FOLLOWUP_HI_V1`). No client name in template (tenancy separates).
- Campaigns: **V1 one-time Broadcast**, **V2 Drip/Sequence**. Audience from CRM Segments.
- **No arbitrary CRM-wide send cap** — follow Meta limits + number quality + opt-in. Add safeguards: quiet hours, frequency cap, duplicate-send prevention, opt-out suppression, DND/blocked, per-number throttling.

## 6. Automation — ✅ DECIDED
- Model: **Trigger → Conditions → Actions**.
- Triggers across WhatsApp / CRM / Marketing / Follow-up / Calling / Sales (full list: source doc §6).
- Actions: send WA message/template, assign user/team, change stage, add tag, create follow-up/task, notify manager, create enquiry draft, add/remove segment, trigger call, request human callback, escalate.
- **Escalate** on: high-intent enquiry, customer requests human, follow-up overdue, no response within SLA, repeated failed calls, negative sentiment, VIP/A-category, AI low confidence.
- Automation must NOT independently confirm price/credit/discount unless explicitly configured.

## 7. Calling — ✅ DECIDED (in scope, not deferred)
- **Provider-independent adapter**; model = **BYOT (Bring Your Own Telephony)** — each client connects their own account.
- Support **Exotel / Knowlarity**; if one for MVP, start **Exotel** (backend stays provider-agnostic).
- **V1**: click-to-call, human agents, recording, history, answered/no-answer/busy, transcript, AI summary, disposition, suggested next action, follow-up creation, CRM stage/status update.
- **V2**: preview dialer, queues, auto-next, manager monitoring.
- **V3**: AI voice agents (add-on, not mandatory) — Hindi/Hinglish/regional; evaluate Sarvam or equivalent.

## 8. Collections (USP module) — ⏳ STILL OPEN
- Short spec still needed: what it does, its inputs/outputs, who uses it.
- _Answer:_

---

## Recommended build order (now unblocked)
1. **Roles & permissions** model (add Admin role + Team/Function; apply capability matrix) — foundational, low risk.
2. **Dormancy** (configurable per-workspace thresholds; compute stale-prospect / dormant-customer from activity) — small, high value.
3. **Catalogue & Orders V1** (new schema + screens; enquiry→quotation→order; no Razorpay) — biggest net-new.
4. **Templates** (fetch approved WA templates via Graph; subcategories + naming) — needs a connected number.
5. **Campaigns V1** (broadcast from segments + safeguards).
6. **Automation** (trigger→condition→action engine).
7. **Calling** (BYOT adapter; Exotel first) — needs client telephony creds.
8. **Collections** — once spec'd (#8).

## External / async (not code)
- **Meta Business Verification** — for live WhatsApp at volume + other-business onboarding. Own account works in dev now.
- **Google OAuth verification** — only for external users of sensitive scopes; owner account works in Testing mode.

## Done (real data, deployed)
Contacts (full requirement set), Google Contacts+Sheets+VCF sync, Inbox (real conversations + real sending), Reports (real analytics), Team & Access → People (real team). Workspace derived from real users/numbers.
