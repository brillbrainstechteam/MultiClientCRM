# B2B Jewellery Journey — Pending Audit

> Audit of "WhatsApp B2B CRM for Jewellery — Journey & Requirements" (Oct 20
> 2026) against the current build. ✅ built · 🟡 partial · ⛔ blocked (needs you
> / Meta) · 🔨 pending-and-buildable.
> Most modules already exist; this lists what's left, what's blocked, and what I
> built overnight. The doc's **Open Questions block several items by design** —
> those are in "Need from you".

## Module status (requirement IDs)
| Module | Status | Notes |
|---|---|---|
| **1 — Multiple numbers & inboxes** (NUM-01..08) | ✅ mostly | `WhatsAppAccount` is multi-number; per-number inbox; owner all-inbox view + filters; marketing members get numbers. **NUM-07 blocked** by Meta's number limits (⛔ see below). |
| **2 — Client WhatsApp groups** (GRP-01..07) | ⛔ | External-group logging + invite link exist (GRP-06). **Auto client-group create + add zone agents + save group messages (GRP-01..05)** need the **Meta Groups API, which requires OBA** and one API number per group — a Meta dependency, not code. |
| **3 — Zones, assignment, absence** (ZON-01..09) | ✅ | Zones, zone→members, zone routing, shared pending queue, absence cover (`CrmAbsence`, coverage), owner all-zone view. **ZON-09 (zone backup email)** 🟡 open-question. |
| **4 — Team: sales & marketing** (TEAM-01..08) | ✅ mostly | Two departments (`teamFunction`), add/edit/deactivate, per-member zone+number, module permissions, assignment+history, targets (gram / daily-calling). **TEAM-06 (reassign on deactivate)** 🟡 verify. |
| **5 — Marketing qualification & hand-off** (MKT-01..09) | ✅ | Built this: intake routes new B2B leads to the zone **Marketing queue** → Qualify → auto-assign single zone salesperson, else **Pending Sales** for the owner; MKT-07 notifications. **MKT-03 (auto call summary from recording)** 🟡 depends on a recording provider; **MKT-09 (400 target)** open-question. |
| **6 — Telecalling / field visits / exhibitions** (TEL/FLD/EXH) | ✅ mostly | Calling module (lists, outcomes, analytics), field visits (plan/spend/outcome/report), exhibitions (capture → hands to Marketing, EXH-05). **TEL-05/FLD-07 report completeness** 🟡 verify; **EXH-02 extraction** uses import (Card2Leads is an open-question). |
| **7 — Communication library** (LIB-01..05) | ✅ | Library stores templates/quick-replies/voice/video/catalogues/creatives; usable in chat + groups; new-client vs no-interest sets. |
| **8 — Campaigns & brand calendar** (CMP-01..12) | ✅ mostly | Campaigns + **Planner** brand calendar (festivals seeded, events, exhibitions), plan-for-year, templates+creatives, owner approval, pre-date reminders, results. **CMP-07 auto-fetch known dates** 🟡 (festivals seeded, no live fetch); **CMP-12 cross-tenant dedup** ⛔ open-question. |
| **9 — Yearly gram targets** (TGT-01..07) | 🟡 | Target/achieved/remaining in grams per agent (TGT-01/02/03), marketing daily-calling target (TGT-07). **TGT-05 (replied vs not responded) and TGT-06 (customers to tap for more volume)** appear **missing → 🔨 buildable**. |
| **10 — Billing tracking** (BIL-01..03) | 🟡 | Subscription plan/renewal/payment exist (BIL-03). **BIL-01 (order/invoice status raised/sent/paid/pending) and BIL-02 (WhatsApp cost by number/zone/campaign)** 🟡 verify/partial. |
| **11 — Reports & dashboards** (RPT-01..04) | 🟡 | Owner dashboard + per-module reports + agent-scoped views + zone/agent filters. **RPT-04 (filter by department)** 🟡 verify. |
| **Notifications** | ✅ mostly | `NotificationEvent` covers assignment, pending, SLA, campaign-approaching, qualification. **"behind daily calling target"** 🟡 verify. |

## 🔨 What I'm building overnight (unblocked, self-contained)
1. **TGT-05 / TGT-06** — on the Targets view, show per agent: **customers who replied vs not responded**, and **customers to tap** for more volume (dormant/under-ordering existing customers). *(Reuses contact activity + order data; no schema change.)*

Anything beyond this touches modules that are already built (risk of duplicating working flows — against the project guardrails) or is blocked below. I did **not** build against the Open Questions, because the source doc says each must be answered first.

## ⛔ Need from you (blocks the rest — the doc's own Open Questions)
These each change what gets built; please answer when you're up:
1. **Agent numbers:** WhatsApp **API** or **Business app (Coexistence)**? (API groups don't work on Business-app numbers.)
2. **Group host number** + whether other agents take part via CRM inbox or their own WhatsApp.
3. **OBA status:** does each client business have an **Official Business Account** (required for Groups API)?
4. **Group trigger:** CRM auto-creates the client group on "interested/order", or agent does it by hand?
5. **Absence:** who marks an agent absent — agent, owner, or a leave record?
6. **Zone map:** which **states/cities** belong to each of the 4 zones? (needed to seed zones correctly)
7. **Agency access:** does the marketing agency log in to manage the brand calendar, or does the business enter it?
8. **Library ownership:** who can create/edit library items — owner only, or agents too?
9. **Definitions:** what counts as **"activated"** vs **"converted"** in reports?
10. **New-client targets:** gram targets for existing only, or do new-customer conversions also carry one?
11. **Exhibition capture:** build card/register extraction **in-CRM**, or reuse **Card2Leads**?
12. **New-customer 400 target:** per marketing member / per zone / per year / whole business?
13. **Owner calls:** does the owner personally call some new customers, or only record voice notes/videos?
14. **Activation sequence:** fixed plan for new leads (e.g. call day1, creative day3, voice note day7)? If so, the steps.
15. **Existing/blank groups:** import current WhatsApp groups + keep empty groups ready (GRP-06/07)?
16. **CMP-12:** confirm "same template → same retailer must not get identical messages" is the right reading.
17. **ZON-09:** only record each zone's backup email, or also store/restore WhatsApp Business backups?
18. **Client Instagram posts:** do clients repost themselves, or should the CRM track whether they posted?
19. **Number limit:** past Meta's 20 numbers → second business portfolio, or marketing shares numbers?

## Keys / setup I need on the VPS (`.env.production`)
- `PLACES_API_KEY` (Find New Businesses — Maps), `OPENAI_API_KEY` (AI discovery — you added locally; add to the VPS), `GEMINI_API_KEY` (Pre-call brief), Meta app Advanced Access for social lead connectors (per docs/META_APP_SETUP_CHECKLIST.md), Message Central creds (OTP) on the VPS.
