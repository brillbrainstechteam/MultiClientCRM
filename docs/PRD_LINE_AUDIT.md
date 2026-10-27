# PRD line-by-line audit — built vs pending

Checked against the repository on 27 Oct 2026, and against the live site.

**Production status.** The deployed build is commit `1973c56`, verified by
probing the live API: routes added in the last four commits answer `401`/`405`
while a deliberately fake route answers `404`. So everything described below as
built is also live, with one exception noted at the end.

Key: **Live** = built and in production · **Partial** = some of it · **No** = not built.

---

## §1 Product objective
Narrative, no requirements. The shape it describes — one owner, four zones,
2–3 sales and 1–2 marketing per zone, existing salesperson numbers, existing
groups, gram targets, yearly calendar — is all representable today.

## §2 Roles and access

| | Status | Notes |
|---|---|---|
| 2.1 Owner / Manager | **Live** | `owner`, `admin`, `manager` roles; sees all |
| 2.2 Marketing member | **Live** | `teamFunction: 'marketing'`, scoped visibility |
| 2.3 Sales agent | **Live** | `teamFunction: 'sales'` |
| 2.4 Client / B2B buyer | **Live** | contact record, multi-channel |
| 2.5 Marketing agency | **No** | no agency role, no external collaborator login |

## §3 Zone model — **Partial**
`CrmZone` holds states, cities and members; zones are configurable, not fixed
at four; `routeLocation()` assigns a customer by city/state and the owner can
override. Branches exist (`CrmBranch`).
**Missing:** a zone cannot own a WhatsApp number — numbers carry `branchId` and
`department` but no `zoneId`.

## §4 End-to-end journey — **Partial**
Find (telecalling **Live**, visits **Live**, exhibitions **Live**) → zone
**Live** → marketing qualification **Partial** → reach out **Live** → assign to
sales **Partial** → collaboration **Live** → sell/nurture **Live** → targets
**Live** → report **Partial**.

---

## §5 Multiple numbers and inboxes

| | Status | Notes |
|---|---|---|
| 5.1 Channel types (Main/Zone/Legacy/Marketing/Group host) | **No** | no `channelType` column |
| 5.1 Connection modes (Cloud/Coexistence/Migrated/Test) | **No** | not recorded on the account |
| 5.1 Ownership (Business/Employee/Unknown) | **No** | TEAM-06's migration-risk flag depends on this |
| 5.1 Friendly names, Meta IDs hidden | **Live** | `label`; no WABA/phone_number_id in normal UI |
| 5.2 Main business number | **Live** | Cloud API or coexistence |
| 5.3 Zone numbers | **Partial** | many numbers, many users per number — but no zone mapping |
| 5.4 Existing salesperson numbers via coexistence | **Live** | |
| 5.5 Permitted channels per user | **Partial** | `permittedWhatsAppNumberIds` is a flat list |
| 5.5 Per-action permissions (View/Reply/Template/Campaign/Call/Admin) | **No** | |
| NUM-01 one tenant, many numbers | **Live** | |
| NUM-02 map to user/zone/team/branch | **Partial** | branch and department only |
| NUM-03 thread keeps its channel | **Live** | `phoneNumberId` on every conversation |
| NUM-04 agent sees own + permitted + coverage | **Live** | coverage added this month |
| NUM-05 owner filters by number/type/agent/zone/team/branch/dept | **Partial** | number and agent yes; the rest no |
| NUM-06 every conversation linked to Customer 360 | **Live** | |
| NUM-07 no hard-coded number limits | **Live** | |
| NUM-08 marketing need not have a number | **Live** | |

## §6 Coexistence, history sync, echoes — **Live**
All three are separate and correctly separated. History sync is idempotent,
handles out-of-order chunks, marks messages historical, and historical messages
raise no unread, no automation, no SLA, no service window and no lead alert.
Message `source` records all seven origins. §6.4's limitations are respected —
no scraping, no fabricated group data.

## §7 Customer 360 — **Live**
Threads are kept distinct per channel and never merged into a fake single
thread. Each retains channel, sender, timestamps, status, assignee and zone.

## §8 Relationship Team — **Live (API only)**
Primary, numbered backups and manager per customer; grants standing access so a
backup can serve a customer without being in any WhatsApp group.
**No screen** — it can only be set through the API today.

---

## §9 Client WhatsApp groups

| | Status | Notes |
|---|---|---|
| 9.1 Shared CRM conversation | **Live** | via Relationship Team + assignment |
| 9.2 External group registry | **Live** | full screen; all seven stored fields; the six CRM actions |
| 9.2 "Messages not synchronized" shown clearly | **Live** | stated on the screen, not a footnote |
| 9.2 No fake unread / response time / history | **Live** | enforced in the API shape |
| 9.3 Managed groups | **No** | capability-gated off; needs an Official Business Account |
| GRP-01 create group from Customer 360 | **Partial** | external registration yes, from a global screen not Customer 360 |
| GRP-02 zone salespeople involved | **Live** | via Relationship Team |
| GRP-03 managed-group messages saved | **No** | depends on 9.3 |
| GRP-04 cover when one person is away | **Live** | |
| GRP-05 library items with groups | **Live** | destination matrix includes both group kinds |
| GRP-06 external registry, no fake import | **Live** | bulk metadata import not built |
| GRP-07 Group Presets | **No** | |

## §10 Capability management — **Partial, and not deployed**
A registry exists and is live, but returns `{available: boolean}`. The
seven-state model §10 asks for — Available / Not Available / Not Configured /
Eligible but Disabled / Pending / Restricted / Unknown — plus the missing
capabilities (coexistence, history sync, echoes, Flows, interactive messages)
is **written but uncommitted on my machine**. It is the one thing in this
document that is not in production.

## §11 Zones, assignment, absence cover

| | Status |
|---|---|
| ZON-01 zones by state/city, configurable | **Live** |
| ZON-02 map sales agents to zones | **Live** |
| ZON-03 auto-zone with owner override | **Live** |
| ZON-04 agents see their zone | **Live** |
| ZON-05 zone queues (pending/follow-ups/coverage/unassigned) | **Partial** — inbox queues yes, not zone-scoped |
| ZON-06 absence exposes work, ownership unchanged | **Live (API only)** — no screen to record an absence |
| ZON-07 owner sees all zones | **Live** |
| ZON-08 marketing members per zone | **Live** |
| ZON-09 zone operational email | **No** |

## §12 Team management

| | Status |
|---|---|
| TEAM-01 add/edit/deactivate, both departments | **Live** |
| TEAM-02 department, zone, role, permissions, channels | **Partial** — no per-channel permissions |
| TEAM-03 permissions by module/action | **Partial** — role-based, not per module/action |
| TEAM-04 assign/reassign, history stays | **Live** |
| TEAM-05 gram + calling targets | **Live** |
| TEAM-06 deactivation reassigns work | **Partial** — reassignment exists; employee-owned channel risk flag does not (needs §5.1 ownership) |
| TEAM-07 reports by member/department/zone | **No** |
| TEAM-08 works for both departments | **Live** |

## §13 New leads — marketing qualification

| | Status |
|---|---|
| MKT-01 assign new leads to zone marketing | **Live** — exhibition capture does exactly this |
| MKT-02 daily calling target + schedule | **Partial** — target model exists, nothing consumes it |
| MKT-03 update status/outcome/notes after a call | **Live** |
| MKT-03 AI summary from recording | **No** |
| MKT-04 activation via creatives/voice/reels/catalogues | **Live** — the library |
| MKT-05 auto-assign when one sales member in zone | **Partial** — handoff picks the first sales member, not zone-aware, no single-member rule |
| MKT-06 Pending Assignment state + owner picks | **No** |
| MKT-07 notifications during assignment | **No** |
| MKT-08 nurture non-interested leads | **Live** — library `low_interest` audience |
| MKT-09 configurable new-customer target | **Partial** — model only |

## §14 Telecalling

| | Status |
|---|---|
| TEL-01 divide numbers by zone | **Live** |
| TEL-02 call list + outcomes | **Live** — all eight outcomes |
| TEL-03 WhatsApp follow-up from library | **Partial** — library exists, not wired into the call screen |
| TEL-04 no automatic dropping | **Live** |
| TEL-05 telecalling report (11 measures) | **No** |
| TEL-06 three calling methods | **Partial** — SIM and telephony yes; WhatsApp calling is built but blocked on Meta |
| TEL-07 schedules for existing customers | **Partial** |

## §15 Field visits — **Live**
All seven requirements: planning, products presented, spend, outcome with
expected and actual grams, the §21.5 report, and planned-vs-visited with
pending and missed kept apart.
**One gap:** FLD-06's last-visit panel on Customer 360 is not rendered — the
data and API exist.

## §16 Exhibitions — **Live**
All five: capture from cards/register/import, extraction accepted from an
external tool, zone + calling/visit routing, full journey tracking, and new
contacts routed to Marketing.
**One gap:** EXH-02's actual Card2Leads integration — the API accepts the shape,
no specific tool is wired.

## §17 Communication Library — **Live**
All five, plus the destination matrix. Every item knows which of the five
destinations WhatsApp will deliver it to, and the constraints are real ones:
no voice note in a template or campaign, no product message in a group, nothing
but an approved template outside the 24-hour window.
**One gap:** LIB-02 — the library is not yet wired into the inbox composer or
the campaign builder. The `?destination=` filter exists and is tested; those two
pickers still read quick replies and templates directly.

## §18 Campaigns and brand calendar

| | Status |
|---|---|
| CMP-01 yearly calendar (festivals/events/exhibitions) | **Live** |
| CMP-02 plan a year of campaigns | **Live** |
| CMP-03 predefined journey templates | **Partial** |
| CMP-04 templates bundled with assets | **No** |
| CMP-05 customise content | **Live** |
| CMP-06 notifications before dates | **Live** — multi-time reminders |
| CMP-07 wedding season / seasonal peaks | **Partial** — festivals seeded, no season model |
| CMP-08 content plan per campaign | **No** |
| CMP-09 owner approval before live | **No** |
| CMP-10 delivery modes | **Partial** — 1:1 sends yes; group posts, manual external and channel-post tasks no |
| CMP-11 results (sent/delivered/read/failed/replies…) | **Partial** — delivery yes; qualified leads, conversions, orders, grams no |
| CMP-12 tenant-specific variation, no cross-tenant tracking | **Live** |

## §19 Gram targets — **Live**
TGT-01, 02, 03 and 07 complete. TGT-04 (log supporting activities) is partial —
visits and calls are logged but not tied to a target. TGT-05 (replied vs not)
and TGT-06 (customers with growth potential) are **No**.

## §20 Billing

| | Status |
|---|---|
| BIL-01 order/invoice status | **Live** |
| BIL-02 WhatsApp cost by number / campaign | **Live** |
| BIL-02 …by zone | **No** |
| BIL-03 plan, renewal, payment status | **Live** |

## §21 Reports — **Partial**, and the weakest area
Reports today are a funnel page: needs-attention, customer type, lifecycle,
lead status, consent, sources, sales tier. Of the nine reports §21 specifies:

- 21.1 Conversation reporting — **No**
- 21.2 Zone follow-ups — **No**
- 21.3 Telecalling — **No**
- 21.4 Marketing qualification — **No**
- 21.5 Field visits — **Live** (on the visits screen, not in Reports)
- 21.6 Exhibitions — **Live** (on the exhibition screen)
- 21.7 Campaigns — **Partial**
- 21.8 Targets — **Live** (on the targets screen)
- 21.9 Billing — **Partial**
- RPT-01 one owner dashboard over everything — **No**
- RPT-02/03/04 filters by agent, zone, department — **No**
- RPT-04 coverage labels (Complete/Partial/Manual) — **No** (the external-group
  API already returns `coverage: 'manual_external'` to build on)

## §22 Notifications — **Partial**
Live: brand-calendar date approaching, campaign due, CTWA lead, calling
restricted/restored, number quality, account alerts, low balance, history
imported.
**Missing:** customer message pending, follow-up due, agent absent with pending
work, field visit scheduled, new customer assigned, new lead for qualification,
qualified lead pending assignment, qualified lead assigned, campaign awaiting
approval, marketing behind calling target.
Deduplication is **Live** (`dedupeKey`). Digest and per-user preferences are
**No** — every notification is immediate.

## §23 Absence and coverage — **Live (API only)**
All four states, ownership never changes, coverage is recorded and lapses
automatically, the customer-facing channel is untouched.
**No screen exists to record an absence**, so in practice coverage never
activates. This is the single highest-value missing screen.

## §24 Onboarding — **Partial**
Steps 1 (business), 3 (main number), 6 (history/contacts) and 7 (existing
customers) are **Live**. Step 2 (team) is partial. Steps 4 (zone numbers),
5 (existing salesperson numbers with ownership), 8 (existing groups) and
9 (relationship team) are **No** — all four exist as features but are not in
the guided flow. Step 10 (progressive adoption) is a stance, and it is honoured.

## §25 Meta feasibility — **Live**
Every "Not supported" row is respected rather than worked around. Nothing in
the product claims a Meta capability that does not exist.

## §26 Tenant-configurable decisions — **Partial**
Zone definitions, gram targets, calling targets and the
counts-toward-target switch are configurable. The rest — agency access,
who edits library items, "Activated"/"Converted" definitions, new-customer
target, relationship team size, campaign approval, absence process, nurture
sequence, lead assignment method, owner-calls, Card2Leads, Instagram reposts —
are defaults rather than settings. Tracked in `DECISIONS_NEEDED.md`.

## §27 Implementation rules — **Followed**
All eighteen. Notably: existing modules reused rather than rebuilt, every
migration additive, multi-tenancy preserved, Meta features capability-gated, no
scraping, no fabricated data, channel retained on every message, conversation
status kept separate from lifecycle and the 24-hour window, and tests added for
every changed workflow (243 across six suites).

---

## §28 Completion checklist

**Live (21):** multiple numbers · coexistence · history sync · echoes · unified
inbox · Customer 360 · Relationship Team¹ · external groups · group limitations ·
zones · sales and marketing teams · absence/coverage¹ · telecalling · calls and
outcomes · field visits · exhibitions · Communication Library · campaigns ·
brand calendar · gram targets · orders/invoices · billing · multi-tenancy and
auditability.
¹ backend only, no screen.

**Partial (5):** user-to-channel permissions · managed-groups capability
handling · new-lead marketing qualification · sales handoff · notifications ·
onboarding/migration.

**Not built (2):** data-coverage / partial-visibility states · the reports suite.

---

## What I would do next, in order

1. **Absence screen.** The backend is live and nobody can reach it. Smallest
   effort, largest practical gain.
2. **Relationship Team panel on Customer 360**, plus FLD-06's last-visit panel
   on the same screen — one screen, two gaps closed.
3. **Library in the composer and campaign builder** (LIB-02). The hard part is
   done and tested; this is wiring.
4. **Channel model** (§5.1 + 5.5). Unblocks TEAM-06's migration-risk flag,
   NUM-02's zone mapping and NUM-05's filters.
5. **Marketing qualification flow** (MKT-05/06/07): pending-assignment state,
   zone-aware auto-assign, and the four notifications around it.
6. **Reports** (§21). The largest, and best done once 4 and 5 give it something
   worth filtering by.
