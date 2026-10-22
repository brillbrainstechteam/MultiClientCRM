# Things that need your decision

Running list. Each one is something I had to pick a default for, or could not
finish without an answer from you. Nothing here is blocking today — every item
has a working default — but the defaults are guesses and you may want
different ones.

Last updated: 23 Oct 2026.

---

## A. Needs an answer before it can work at all

### A1. Meta: subscribe the `calls` webhook field
WhatsApp Calling receives nothing until this is switched on in the Meta app
dashboard. Also needs **Calling API access** requested for the app, and a
daily messaging tier of 2,000+ on the number.
*Until then: the settings screen saves locally and Meta rejects the push —
a visible failure rather than a silent one.*

### A2. Meta: subscribe `template_category_update` and `message_template_components_update`
Carried over from earlier work. The template cache handles both, but Meta does
not send them until they are ticked.

### A3. Server: reminder cron must move to every 15 minutes
Activities can now ask to be reminded an hour or fifteen minutes ahead, and a
once-a-day job cannot deliver either.
```
*/15 * * * * /home/talktrackcrm/app/deploy/cron.sh plan-reminders
30 8 * * *   /home/talktrackcrm/app/deploy/cron.sh calling-health
```

### A4. Staff WhatsApp numbers for reminders
The "Also notify on WhatsApp" switch on a calendar activity does nothing —
no staff numbers are stored anywhere, and there is no approved reminder
template. Either we store staff numbers and create a template, or the switch
should come out. **Which?**

---

## B. Defaults I chose that you may want changed

### B1. Financial year starts in April
Used for gram targets (`DEFAULT_FY_START_MONTH = 4`), so FY 2026-27 runs
1 Apr 2026 – 31 Mar 2027. Configurable in code but not yet per tenant.
**Is April right for every client you will onboard?**

### B2. Which order statuses count toward a gram target
Currently: confirmed, payment_pending, part_paid, paid, processing,
ready_dispatch, shipped, delivered. **Not** enquiry, quotation, draft,
cancelled or returned — a quotation nobody accepted must not hit a target.
**Should a confirmed-but-unpaid order really count, or only once paid?**

### B3. Do new-customer sales count toward gram targets?
§26 leaves this open. Default: yes, every order counts, with a per-order
switch (`countsTowardTarget`) to exclude one. **Confirm or change.**

### B4. Relationship team size
§26 says configurable. The model takes any number of backups; the UI does not
cap it. **Do you want a hard limit, e.g. one primary plus two backups?**

### B5. Who covers an absent agent when nobody is named
Default: anyone sharing a zone with them, plus managers. **Too wide?** The
alternative is to require named cover on every absence, which is stricter but
means an absence logged in a hurry leaves customers unanswered.

### B6. Absence does not change ownership — confirmed?
The PRD says this twice and I enforced it. Coverage lapses automatically when
the person returns. **Worth confirming this is what you want, because it means
a long absence leaves customers formally owned by someone who is not there.**

### B7. Visit reminder lead time for exhibition follow-ups
When capture routes a contact to a field visit, the visit is planned **7 days
out**, because a visit with no date would never appear in anybody's plan.
**Is a week right?**

### B8. Who can publish to the shared library
Default: owner, admin and manager publish to the workspace; agents can save
personal items only — same rule as quick replies. **Should agents be able to
publish to the team?**

### B9. Definition of "Activated" and "Converted"
§26 lists both as tenant-configurable. Currently: a contact is a customer when
`lifecycleStage` becomes `customer`, and an exhibition lead is "converted"
when somebody sets that journey status by hand. **No automatic rule — do you
want one, e.g. first confirmed order?**

### B10. New-customer target definition
§26 and MKT-09 say not to hard-code "400" until the business says whether it
is per member, per zone, per period or per business. **Still unanswered.** The
activity-target model can express any of them; nothing uses it yet.

---

## C. Things I built around rather than solved

### C1. Exhibition OCR
§16 says to integrate a tool such as Card2Leads rather than rebuild capture.
The capture API accepts already-extracted fields plus the tool's raw text, so
Card2Leads can POST straight to it. **I have not integrated any specific tool —
tell me which one and I will wire it.**

### C2. External group messages are not synchronised
Meta does not expose existing WhatsApp Business App group chats, and the PRD
forbids scraping. The registry records what your team reports instead. **No
decision needed — this is a platform limit, not a choice — but your team needs
to know their group activity is not captured automatically.**

### C3. WhatsApp Calling media
Signalling is complete and tested; the agent-side WebRTC audio is not built.
It needs Meta's calling sandbox to develop against. **Blocked on A1.**

### C4. Managed WhatsApp Groups
Requires an Official Business Account, which we cannot currently detect, so
the capability gate reports Groups as unavailable. **Worth building only once
a tenant is actually eligible — are any?**

---

## D. Operational

### D1. Development shares the production database
Local development runs against the same Neon database as production. Every
migration so far has been additive so nothing has been lost, but one
destructive migration would hit live customer data. **A separate dev database
is worth half an hour.**

### D2. Deploy is manual
`./deploy/deploy.sh` on the VPS after each push. Nothing on this list is live
until that runs.
