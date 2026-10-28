# Lead Intake & Management Hub — Gap Analysis

> Audit date 2026-10-28. Maps "TalkTrack — Lead Intake & Management Hub" to the
> current repo. ✅ exists · 🟡 partial · ❌ missing. Reuse-first: one hub, one
> intake engine, no per-source lead entities.

## Headline
The **intake engine already exists** (`lib/crm/intake.ts` + `CrmIntakeEvent` +
routing + dedupe + SLA clock + the Lead Intake queue). The real gaps are the
**Source Connections layer** (a registry of connected channels with health) and
the **source connectors** that feed the pipeline — above all **Meta Lead Ads,
Facebook Pages and multiple Instagram accounts**, which do not exist yet (Meta
integration today is WhatsApp-only). Plus the **Marketing→Sales qualified
handoff** and the **leakage/health** operational views.

## Section-by-section
| Hub § | Capability | Status | Evidence / gap | Build |
|---|---|---|---|---|
| Source Connections | A central registry of connected channels per tenant, multi-account | ❌ | No `SourceConnection` model; WhatsApp accounts exist 1:many but no unified registry; no FB Page / IG account models | **now** `CrmSourceConnection` (+ provider assets) |
| — multi WhatsApp / Facebook / Instagram | Several WA numbers + several FB Pages + several IG accounts per tenant | 🟡 | `WhatsAppAccount[]` is 1:many ✅; **no** Facebook/Instagram models ❌ | **now** |
| One Intake Pipeline | Capture→normalize→match→classify→route→SLA→notify→audit, idempotent, raw payload kept | ✅ | `lib/crm/intake.ts`, `CrmIntakeEvent` (`rawPayload`, unique ext id) | reuse |
| Preserve source context (multi-level) | campaign/adset/ad/form/leadId, IG post/reel, CTWA number, UTM, exhibition batch | 🟡 | intake event has campaign/adSet/ad/utm/qr fields ✅; CTWA `adSourceId`/`ctwaClid` on contact ✅; no IG post/reel, no form/leadId linkage surfaced | extend connectors |
| Original vs Current source | First-touch never overwritten; latest interaction tracked | ✅ | `CrmContact.createdSource` (frozen) + `source` (current) | reuse |
| Identify before create | Mobile/email/GSTIN/source-id match; secondary name+city; needs-review on uncertainty | 🟡 | mobile+email match ✅ in intake; GSTIN/source-id/secondary matching not yet | extend identity engine |
| B2B Account + Contacts | Account with multiple contacts; new person → contact under account | 🟡 | `CrmContact` (company, contactPerson), relationship team ✅; multi-contact-under-account linkage partial | extend (later) |
| Classify event | New Prospect / Existing Enquiry / Existing Opportunity / Duplicate / Needs Review | ✅ | `intake.ts` classification | reuse |
| Create/update minimal record + ref back | Progressive capture; record links to Intake Event | ✅ | intake creates contact + `CrmIntakeEvent.contactId` | reuse |
| Ownership & routing (existing-owner first, then zone→marketing) | Precedence engine recording *why* | ✅ | `lib/crm/routing.ts` | reuse |
| — Marketing→Sales qualified handoff | Mark Qualified → auto-assign single zone sales, else Pending Assignment | ❌ | marketing queue routing ✅; **no Qualify action / handoff** | **now** |
| Unassigned / Needs Review (+ reason) | Visible queue with stop reason | 🟡 | intake queue has Unassigned/Needs-review tabs + `reviewReason`; reasons for routing stops partial | **now** (reasons) |
| Immediate lead activation | Source-configurable first action (template / task / notify) using existing infra | 🟡 | notify on assign ✅; no per-source activation config / auto first-template / task | **next** |
| First-response SLA | Per-source configurable SLA + escalation ladder | 🟡 | SLA *clock* in intake (`DEFAULT_SLA_MINUTES`) ✅; no per-tenant config, no escalation | **next** `lib/crm/sla.ts` |
| Qualification fields | Business type, categories, volume/grams, timing, notes on same record | 🟡 | contact has segment/volume fields; qualification capture UI partial | **next** |
| Follow-up / journey continuity | Reuse Tasks/Journeys; every open lead has a next action | 🟡 | followups + automation exist; "no next action" leakage detection missing | **next** |
| Daily Lead Work Queue | One cross-source operational queue | ✅ | Lead Intake queue | reuse/enhance |
| Lead Leakage management | Exception view: no owner / waiting / breached / no follow-up / dup / failed / qualified-waiting | ❌ | funnel report exists; no leakage view | **next** |
| Conversion & source attribution | Source linked through qualify→sales→order→grams | 🟡 | orders/targets/funnel exist; end-to-end source→grams link partial | **later** reports |
| Connector monitoring (Lead Source Health) | Per-connection working/last-event/last-error, admin alerts, retry | ❌ | none | **now** (with connections) |
| B2B/B2C shared infra, separate workflow | Same hub, routing policy differs by tenant mode | ✅ | `Tenant.businessModel` drives journey; routing branches b2b/b2c | reuse |

## Reuse (do NOT rebuild)
Intake engine, routing precedence, zones, dedupe/merge, SLA clock, notifications,
audit, exhibitions capture, imports, campaigns, templates, followups/automation,
Customer 360, orders/targets/funnel, WhatsApp embedded-signup + messaging.

## Build order
1. **Source Connections layer** — `CrmSourceConnection` (+ `CrmMetaAsset` for FB Pages / IG accounts / lead forms), API, **multi WA/FB/IG**, and a **Lead Sources / Connector Health** screen. *(this increment)*
2. **Marketing→Sales qualified handoff** — Qualify/Nurture actions + Pending Assignment + MKT-07 notifications. *(this increment)*
3. **Meta Lead Ads connector** — `leadgen` webhook → fetch lead → intake with full campaign/adset/ad/form/leadId context (idempotent). *(next)*
4. **Instagram / Messenger / website-chat connectors** → intake. *(next)*
5. **SLA engine + escalation** (`lib/crm/sla.ts`), **immediate lead activation** config, **lead leakage** view. *(next)*
6. **Source→order→grams attribution** reporting. *(later)*

Guardrail (§B2B/B2C): shared infra, separate journeys. No B2C walk-in/bridal/
appointment/ecommerce rules inside the B2B flow.
