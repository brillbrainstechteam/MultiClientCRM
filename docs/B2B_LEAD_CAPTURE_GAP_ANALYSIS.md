# B2B Lead Capture, Intake, Ownership & Routing — Gap Analysis

> Audit date 2026-10-28. Maps the B2B requirements doc to the current repo.
> ✅ complete · 🟡 partial · ❌ missing. Legend for "Build": now / next / later / skip.
>
> **Headline:** most *data* and *shared services* already exist (contacts,
> ownership, zones, merge, import, consent, exhibitions, field visits, enquiries,
> notifications, audit). The **central gap is a unified Intake Event pipeline**
> that every source normalizes into — with classification, idempotency, a
> routing-precedence engine that records *why*, an Unassigned queue, and a
> configurable first-response SLA. Several *source connectors* (Meta Lead Ads,
> website/trade forms, QR) are also missing.

## Reusable shared infrastructure that already exists (do NOT rebuild)
| Capability | Where |
|---|---|
| Unified contact/customer model (B2B+B2C), mobile-unique identity | `CrmContact` (`prisma/schema.prisma`) |
| Ownership: sales `ownerId`, `marketingOwnerId`, `kamUserId`; relationship team | `CrmContact`, `CrmRelationshipMember`, `lib/crm/assignment.ts` |
| Owner propagation / stranded (unassigned) detection | `lib/crm/assignment.ts` (`propagateContactOwner`, `findStrandedContacts`) |
| Zone resolution (City→State→Zone→member) | `lib/crm/zone-routing.ts`, `CrmZone` |
| Absence / coverage | `lib/crm/coverage.ts`, `CrmAbsence`, `CrmCoverageEvent` |
| Merge / dedupe | `app/api/crm/contacts/merge/route.ts`, `lib/crm/import-contacts.ts` |
| CSV/Excel + Google import, OCR card capture | `contacts/import`, `google/*`, `contacts/ocr`, `CrmImportJob` |
| Exhibitions capture, Field visits | `exhibitions/capture`, `visits`, `CrmExhibitionContact`, `CrmFieldVisit` |
| Enquiries (chat→pipeline) | `CrmEnquiry`, `enquiries/*` |
| Consent (service/marketing, opt-in proof, opt-out/DND) | `CrmConsentEvent`, `CrmContact` consent fields, `lib/crm/consent.ts` |
| Source attribution: original (`createdSource`) + current (`source`) + CTWA ad | `CrmContact` (`adSourceId`, `ctwaClid`, …) |
| Notifications, Audit | `NotificationEvent`, `CrmAuditLog`, `lib/crm/audit.ts` |
| Reports funnel (captured→contacted→converted, geographic) | `reports/funnel`, `CrmReports`… |
| Webhook fan-out (idempotent raw persist + route by field) | `lib/whatsapp/ingest.ts` |

## Requirement-by-requirement
| Req | Area | Status | Gap / action | Files |
|---|---|---|---|---|
| §3.1 | No new customer per event | 🟡 | Dedupe exists on import & inbound (mobile), but **no single intake gate** that every source passes through first | `lib/crm/intake.ts` (new) |
| §3.2 | Account vs Contact | 🟡 | `CrmContact` carries company inline (`company`, `contactPerson`, `gstin`). **Decision:** keep single model (doc says don't duplicate) + add multi-contact-per-account grouping only if needed | — |
| §4.1 | WhatsApp source | ✅ | Inbound → Conversation + Contact + CTWA attribution | `ingest.ts` |
| §4.2 | Telecalling lists | ✅ | Import jobs + batch | `contacts/import`, `CrmImportJob` |
| §4.3 | Exhibitions | ✅ | Capture + import + Card2Leads/OCR | `exhibitions/capture`, `contacts/ocr` |
| §4.4 | Field visits | ✅ | Quick prospect from visit | `visits`, `CrmFieldVisit` |
| §4.5 | Website / trade forms | ❌ **now** | No public form-intake endpoint (Become a Dealer, Wholesale, Catalogue, etc.) | `app/api/intake/form` (new) |
| §4.6 | Meta Lead Ads | ❌ **now** | No `leadgen` webhook ingestion + form-field mapping | `ingest.ts` (leadgen field), `lib/crm/intake.ts` |
| §4.7 | Instagram/FB | 🟡 | Same WhatsApp inbox path if connected; no dedicated IG/FB DM ingest | later |
| §4.8 | Incoming calls | 🟡 | WhatsApp Calling events logged; manual call→lead partial | `WhatsAppCall`, later |
| §4.9 | Referrals | ❌ **next** | No referrer→referred attribution capture | `CrmIntakeEvent` fields + UI |
| §4.10 | CSV/Excel import | ✅ | Mapping/preview/validation/dedupe/batch | `contacts/import` |
| §4.11 | ERP/billing import | 🟡 | Generic import exists; no ERP-identifier classification (existing vs historical) | later |
| §4.12 | QR capture | ❌ **next** | No QR source-id intake + ROI tag | `app/api/intake/qr` (new) |
| §5 | **Unified Intake Event** | ❌ **now** | **No normalized intake model/pipeline** — the architectural centrepiece | `CrmIntakeEvent` (new) + `lib/crm/intake.ts` |
| §6 | Idempotent pipeline | 🟡 | Inbound webhook is idempotent; intake pipeline not formalized | `lib/crm/intake.ts` |
| §7 | Validation | 🟡 | Phone/India normalize (`lib/crm/mobile.ts`), email; no central "Needs Review" with reason | intake service |
| §8 | Identity match / dedupe + merge | 🟡 | Mobile-unique + merge endpoint; **no "Possible Duplicate" suggestion queue** | merge + intake |
| §9 | Classification (NEW_PROSPECT…) | ❌ **now** | Not stored as an intake outcome | `CrmIntakeEvent.classification` |
| §10 | Original vs current source (+chain) | 🟡 | original + current exist; **no attribution-chain history** | later (`CrmSourceTouch`) |
| §11 | Context capture | ✅ | Rich fields on contact + enquiry | — |
| §12 | Consent | ✅ | Full consent model | — |
| §13 | Intake operational status (separate) | 🟡 | `leadStatus` is close; add explicit intake status | `CrmIntakeEvent.status` |
| §14 | B2B Lead Intake Queue screen | ❌ **now** | No centralized triage queue (Account/Contact/Source/Zone/Dept/Age/SLA/Status + quick actions) | new screen + `GET /api/crm/intake` |
| §15–21 | Routing & precedence, zone, dept, Mktg→Sales handoff, existing-owner override | 🟡 | zone-routing + owner propagation exist; **no single precedence engine that records assignment reason & method**, no Mktg→Sales "Qualified" handoff flow | `lib/crm/routing.ts` (new) |
| §22 | Unassigned queue | 🟡 | `findStrandedContacts` exists; no queue surface/notify | intake queue |
| §23–24 | First-response SLA + escalation | 🟡 | Conversation `awaitingSince` only; **no configurable per-source SLA + escalation ladder** | `lib/crm/sla.ts` (new) + config |
| §25 | First task/follow-up | ✅ | Follow-ups/automation exist | `followups`, `CrmAutomationRule` |
| §26 | Notifications | ✅ | Reuse `NotificationEvent` | — |
| §27 | Lead Leakage dashboard | 🟡 | funnel report exists; add leakage view (unassigned/needs-review/SLA-breached/duplicate) | reports |
| §28 | Source performance funnel | 🟡 | funnel exists; extend to source→order→grams by source/campaign/exhibition | reports |
| §29 | Audit trail | ✅ | `CrmAuditLog` + `lib/crm/audit.ts` | — |
| §30 | Roles & permissions | ✅ | Role scoping present | `lib/crm/scope.ts`, `prospecting-access.ts` |
| §31 | Mobile quick-add | 🟡 | Visit/exhibition quick capture; add unified Quick-Add Prospect via intake | intake + UI |

## Build order (B2B)
1. **Unified Intake pipeline** (shared): `CrmIntakeEvent` + `lib/crm/intake.ts` (normalize→validate→match→classify→upsert→route→SLA→notify→audit, idempotent).
2. **Routing precedence engine** `lib/crm/routing.ts` recording `assignmentReason` + `zoneResolution`, feeding an **Unassigned queue**.
3. **Intake Queue** screen + `GET/PATCH /api/crm/intake` (triage, assign, merge, mark-invalid, qualify).
4. **Connectors:** Meta Lead Ads (`leadgen` webhook), website/trade form endpoint, QR, referral capture.
5. **First-response SLA engine** (`lib/crm/sla.ts`, config) + escalation.
6. **Marketing→Sales handoff** flow (Qualified → auto/pending sales assignment).
7. **Dashboards:** lead leakage + source-to-order/grams performance.

Notes: B2B routes new prospects to **Marketing first**, existing customers stay with their **relationship owner** (never round-robin a known account). Keep routing journeys separate from B2C.
