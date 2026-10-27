# B2C Lead Capture, Intake, Ownership & Routing — Gap Analysis

> Audit date 2026-10-28. Maps the B2C requirements doc to the current repo.
> ✅ complete · 🟡 partial · ❌ missing. B2C is **person-centric** and routes
> **direct to branch/salesperson** (NOT the B2B Marketing-qualification-first flow).
>
> **Headline:** B2C shares the same foundation gap as B2B — a **unified Intake
> Event pipeline** — plus B2C-specific sources that don't exist yet: **walk-in
> fast check-in, appointments, ecommerce product enquiry / abandoned cart,
> catalogue-link interactions, website chat**. Identity (`CrmContact`, mobile
> unique), consent, merge, notifications and attribution are reused as-is.

## Shared infrastructure reused (same as B2B — do NOT rebuild)
`CrmContact` (person-centric too, `customerType=b2c`), merge/dedupe, consent,
import, zone/branch resolution, assignment & owner propagation, notifications,
audit, reports funnel, webhook fan-out. See the B2B gap doc for the full table.

## Requirement-by-requirement
| Req | Area | Status | Gap / action | Files |
|---|---|---|---|---|
| §2 | One Customer 360 per person (not 4) | 🟡 | Identity match on mobile/wa_id; needs the **intake gate** so every event attaches, not duplicates | `lib/crm/intake.ts` (new) |
| §3 | B2C customer model | ✅ | `CrmContact` has person fields, budget/occasion via interests/customFields | — |
| §4.1 | Walk-in fast check-in | ❌ **now** | No showroom walk-in quick check-in (mobile→match or create, assign salesperson, visit tracking) | `app/api/intake` + Walk-In UI; reuse `CrmFieldVisit`-style visit |
| §4.2 | WhatsApp | ✅ | Inbound + channel + CTWA/ad context | `ingest.ts` |
| §4.3 | Instagram | 🟡 | Only via WhatsApp path; no IG DM ingest | later |
| §4.4 | Facebook Messenger | 🟡 | Same as IG | later |
| §4.5 | Meta Lead Ads | ❌ **now** | No `leadgen` webhook + form mapping | `ingest.ts` + intake |
| §4.6 | Click-to-WhatsApp | ✅ | CTWA attribution captured first-touch | `ingest.ts`, `CrmContact.ctwaClid` |
| §4.7 | Website forms | ❌ **now** | No public form endpoint (Contact, Book Appointment, Bridal, Product Enquiry, Call-Me-Back, Catalogue) + UTM/page | `app/api/intake/form` (new) |
| §4.8 | Website chat | ❌ later | No web-chat ingest | later |
| §4.9 | Ecommerce product enquiry | ❌ **next** | No SKU/product enquiry intake | `app/api/intake/ecom` (new) |
| §4.10 | Abandoned cart | ❌ later | Needs ecommerce integration | later |
| §4.11 | Catalogue link interaction | 🟡 | Catalogue/selections exist; no per-link open/enquiry attribution | `CrmSelection`, later |
| §4.12 | QR capture | ❌ **next** | No QR source-id intake | `app/api/intake/qr` (new) |
| §4.13 | Appointment | ❌ **next** | **No customer appointment model** (`CrmPlanEvent` is the planning calendar, not consumer appointments) | `CrmAppointment` (new) |
| §4.14 | Incoming call | 🟡 | Calling events/manual partial | later |
| §4.15 | Referral | ❌ **next** | No referrer capture | intake fields |
| §4.16 | Event / exhibition (consumer) | ✅ | Exhibition capture reused | `exhibitions/capture` |
| §4.17 | POS / first purchase | 🟡 | Orders exist; ensure POS buyer is matched as Customer, not dumped in New-Lead queue | `CrmOrder`, intake classify |
| §5–6 | Unified intake event + idempotent pipeline | ❌ **now** | Same centrepiece as B2B | `CrmIntakeEvent` + `lib/crm/intake.ts` |
| §7 | Identity matching | 🟡 | mobile/wa_id/email; no family/shared-phone suggestion | intake |
| §8 | Classification (B2C set) | ❌ **now** | WALK_IN_EXISTING_CUSTOMER / POS_CUSTOMER / APPOINTMENT_ONLY etc. not stored | `CrmIntakeEvent.classification` |
| §9 | Original vs current source | 🟡 | original+current exist; no chain | later |
| §10 | Context capture | ✅ | product/occasion/budget via interests + customFields | — |
| §11 | Consent | ✅ | Full consent model | — |
| §12 | B2C intake queue | ❌ **now** | No consumer triage queue (Customer/Source/Product/Occasion/Budget/Branch/Salesperson/Age/SLA/Appointment/Status) | new screen + `GET /api/crm/intake` |
| §13–19 | Routing: direct-to-branch/salesperson, existing owner respected, branch resolution, product-desk, appointment, round-robin/least-loaded | 🟡 | zone/branch + owner propagation exist; **no precedence engine with reason**, no product-desk/appointment routing | `lib/crm/routing.ts` (new, B2C precedence) |
| §19 | Unassigned queue | 🟡 | stranded detection only | intake queue |
| §20–22 | First-response SLA + escalation + walk-in SLA | 🟡 | `awaitingSince` only | `lib/crm/sla.ts` (new) |
| §23 | First task/journey | ✅ | follow-ups/automation | — |
| §24 | Notifications (VIP arrived, cart assigned…) | 🟡 | infra exists; add B2C event kinds | `NotificationEvent` |
| §25 | Lifecycle (separate from intake) | ✅ | `lifecycleStage`/`lifecycleState` separate | — |
| §26 | B2C intake status | 🟡 | add explicit intake status | `CrmIntakeEvent.status` |
| §27 | Lead leakage dashboard | 🟡 | funnel exists; add B2C leakage view | reports |
| §28 | Source performance (to purchase) | 🟡 | extend funnel to order value/category/time by source | reports |
| §29 | Mobile UX (Quick Walk-In / Quick Enquiry) | ❌ **now** | fast flows missing | Walk-In + Quick-Enquiry UI |
| §30 | Audit trail | ✅ | `CrmAuditLog` | — |
| §31 | Roles | ✅ | Owner/Manager/Salesperson scoping | `lib/crm/scope.ts` |

## Build order (B2C)
1. **Unified Intake pipeline** (shared with B2B) — same `CrmIntakeEvent` + `lib/crm/intake.ts`, with B2C classification outcomes and **direct branch/salesperson routing** (no marketing-qualification gate).
2. **Walk-In fast check-in** + **Quick Enquiry** mobile flows (match-or-create, assign at check-in, visit tracking).
3. **Appointments** (`CrmAppointment`) as a lead source + appointment routing.
4. **Connectors:** Meta Lead Ads, website forms (+UTM), QR, ecommerce product enquiry.
5. **First-response & walk-in SLA** + escalation.
6. **Dashboards:** B2C leakage + source-to-purchase.

**Guardrail (per §35):** do NOT apply B2B Marketing-qualification-first, dealer/account-mandatory, wholesale-zone-ownership, B2B WhatsApp groups, or gram-targets to B2C. Routing is direct to the store/salesperson, respecting any existing relationship owner.
