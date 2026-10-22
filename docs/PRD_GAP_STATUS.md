# PRD coverage — what is built, what is not

Measured against `TalkTrack_B2B_Jewellery_CRM_PRD.md` (23 Oct 2026), using its
own §28 completion checklist.

The PRD's rule 2 is "identify what is already implemented" and rule 6 is "add
only missing/incomplete functionality". Most of the checklist was already
there. This file records what was genuinely absent, what has now been built,
and what has not — so nothing is silently dropped, per §28.

## Already present before this pass

Multiple WhatsApp numbers · Coexistence · History Sync · Business App message
echoes · unified owner Inbox · Customer 360 · zones · Sales/Marketing teams ·
new-lead marketing qualification and sales handoff · telecalling and call
outcomes · campaigns and brand calendar · orders and invoices · billing ·
reports · notifications · onboarding · multi-tenancy and audit logging ·
WhatsApp Calling (built earlier this month).

## Built in this pass

| PRD | Capability | Notes |
|---|---|---|
| §8 | **Relationship Team** | Primary, numbered backups and a manager per customer. A table, not fixed columns, because §26 makes team size tenant-configurable. Grants standing access, so a backup can serve a customer without being a WhatsApp group participant — which is what makes GRP-04 possible at all given invite-only groups. |
| §23, ZON-06, TEAM-06 | **Absence and coverage** | Availability was the literal string `'available'` in the bootstrap response: every member always looked present, and no pending work was ever offered to a backup. Absence now widens who may act, for a bounded period, and **never** changes ownership. Coverage is computed, not stored, so it lapses on its own when the person returns. |
| §9.2, GRP-06 | **External group registry** | Existing Business App groups are not synchronised through Coexistence and their history cannot be imported. Registers the group, its owners and what people report happening in it — with no fake messages, unread counts or response times, and the limitation stated on the screen rather than in a footnote. |
| §19, TEAM-05, TGT-01..07 | **Gram targets** | There was no target of any kind in the schema, and orders carried no weight. Orders now record grams; attainment is computed from confirmed orders rather than stored, so it cannot drift from the orders it summarises. Quotations and enquiries do not count. Marketing daily calling targets share the same screen. |

56 tests cover the coverage rules and target arithmetic
(`scripts/test-coverage-targets.ts`). Coverage is the dangerous one: too narrow
and an absent agent's customers go unanswered; too wide and every agent can act
on every other agent's book. Both failures look fine on screen.

## Not built

Honest list, in the order I would do them.

1. **Field visits (§15, FLD-01..07).** Today a field visit is a `channel: 'visit'`
   flag on a call log. Missing: products presented, visit spend, expected vs
   actual grams, planned-vs-visited reporting, last-visit on Customer 360.
2. **Exhibitions (§16, EXH-01..05).** Nothing exists. Needs an exhibition
   record, contact import, per-contact journey tracking, and the §16 note that
   Card2Leads should be integrated rather than rebuilt for OCR.
3. **Communication Library (§17, LIB-01..05).** Templates and quick replies
   exist separately. Missing: one library covering voice notes, owner voice
   notes, videos, reels, catalogues and PDFs, each knowing which destinations
   it may be used in (1:1 live, 1:1 template, campaign, managed group, external
   group manual) so unsupported formats are hidden per destination.
4. **Capability states (§10).** The registry returns `{available, reason}`.
   The PRD wants seven states — Available, Not Available, Not Configured,
   Eligible but Disabled, Pending, Restricted, Unknown — and UI driven by them.
5. **Managed Groups (§9.3) and Group Presets (GRP-07).** Capability-gated, and
   the gate currently reports Groups as unavailable (needs an Official Business
   Account, which we do not detect). Worth building only once a tenant is
   actually eligible.
6. **Channel model (§5.1).** Channels have no `channelType`, `connectionMode`
   or `ownershipType`, and permissions are a list of permitted number ids
   rather than the per-action set in §5.5 (View, Reply, Send Template, Send
   Campaign, Call, Admin). TEAM-06's "employee-owned → flag migration risk"
   depends on ownership being recorded.
7. **Data-coverage labels (RPT-04).** Reports do not yet mark results Complete,
   Partial or Manual/External. The external-group API already returns
   `coverage: 'manual_external'` for this to build on.
8. **Notification breadth (§22).** Several listed events have no notification:
   agent absent with pending work, marketing member behind calling target,
   campaign content awaiting approval. Digest and per-user preferences are also
   absent — today every notification is immediate.

## Standing constraints honoured

- No unofficial WhatsApp Web scraping or reverse-engineered clients (rule 10).
- No fabricated WhatsApp data (rule 11): external groups carry no message
  history, no unread counts and no response times, because none would be real.
- Meta-dependent features stay capability-gated (rule 9).
- All migrations additive; no existing column changed (rule 7).
