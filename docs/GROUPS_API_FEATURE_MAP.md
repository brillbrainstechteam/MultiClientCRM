# WhatsApp Groups API — what we can actually build

Read from Meta's Groups overview, get-started, reference, messaging, pricing
and error-codes pages on 28 Oct 2026.

Written against the real scenario: **one group per client enquiry, containing
the customer, two or three salespeople and the owner**, with team members who
have their own WhatsApp numbers.

---

## 1. Three findings that change the design

Read these before the feature list — each one constrains how groups can be used
for jewellery enquiries.

### 1.1 The participant maths is better than it looks, but the *team* is the problem

`total_participant_count` **excludes the business**, so a group holds **8
participants + 1 business identity = 9 people**.

For an enquiry group that is comfortable: customer, 3 salespeople, owner = 5
participants, with room for the customer's partner or accountant.

The constraint that bites is different: **only one Cloud API business number
per group.** Your main or zone number is the business identity. Every
salesperson and the owner must join as **ordinary WhatsApp participants, from
a phone**, through the invite link.

That has a hard consequence:

| A team member's number is… | Can they be in the enquiry group? |
|---|---|
| Personal WhatsApp | **Yes** — joins via invite link |
| Their own WhatsApp **Business app** number (coexistence) | **Yes** — it is still a normal app on their phone |
| A **Cloud-API-only** number connected to TalkTrack | **No** — there is no app to join from, and a second business identity is not allowed |

So the team joins with the phones in their pockets, not with their CRM
channels. TalkTrack should record which personal/app number each member joins
groups with, separately from their permitted CRM channels — otherwise we will
keep inviting a number that cannot accept.

### 1.2 Groups are expensive — they are collaboration, not broadcast

Pricing is **per message per delivered recipient**. A message to a group of 6
is billed as 6 messages, at each recipient's country rate.

And the regime that began **1 October 2026 — already in effect** — removed most
of the free allowance:

- `group_marketing` — billable, always.
- `group_utility` — billable, **even inside an open customer-service window**.
- `group_service` (non-template) — free only until the phone number's 1,000-
  message free tier is used, and **that tier is shared with your 1:1 service
  messages**.

Concretely: sending one catalogue update to 30 enquiry groups of 6 people is
**180 billable messages**, not 30. A campaign blast across groups would be
roughly six times the cost of the same blast 1:1, for the same reach.

**Recommendation:** use groups for the enquiry conversation itself, and keep
campaigns on 1:1. TalkTrack should show the multiplied cost before a group send
and refuse to treat groups as a campaign audience.

### 1.3 Heavy marketing can switch group creation off

Error **131214 — "Group creation is temporarily disabled"** fires when the
business has sent too many marketing messages inside the customer-service
window over the previous 7 days.

For a jewellery CRM that runs festival campaigns, this is a live risk: a Diwali
push could disable new enquiry groups the following week. Worth surfacing as a
warning, not discovering as a failed create.

---

## 2. Everything we can build

### 2.1 Group management

| Feature | Endpoint | Notes for us |
|---|---|---|
| Create group | `POST /{phone-number-id}/groups` | `subject` ≤128 chars (required), `description` ≤2048, `join_approval_mode`: `approval_required` \| `auto_approve`. **No synchronous body** — the group id and invite link arrive on the `group_lifecycle_update` webhook, so creation is asynchronous and needs a pending state |
| Delete group | `DELETE /{group-id}` | Removes everyone including us |
| Get invite link | `GET /{group-id}/invite_link` | |
| Reset invite link | `POST /{group-id}/invite_link` | Invalidates all previous links — the "this link leaked" button |
| Send invite properly | `POST /{phone-number-id}/messages` with a Template-Library `group_invite_link` utility template, parameter `{"type":"group_id","group_id":"…"}` | Meta converts the id to a link at delivery. **Do not modify the template** or it loses utility pricing |
| List join requests | `GET /{group-id}/join_requests` | Returns `join_request_id`, `wa_id`, `creation_timestamp`; cursor paginated |
| Approve join requests | `POST /{group-id}/join_requests` | Bulk array; partial failures reported per request |
| Reject join requests | `DELETE /{group-id}/join_requests` | **No webhook fires** — our UI must update itself |
| Remove participants | `DELETE /{group-id}/participants` | Max 8 per call. **Removed users cannot rejoin via the invite link** — effectively a ban, so it needs a confirm |
| Get group info | `GET /{group-id}?fields=…` | `subject`, `description`, `suspended`, `creation_timestamp`, `participants[].wa_id`, `total_participant_count`, `join_approval_mode` |
| List active groups | `GET /{phone-number-id}/groups` | `limit` up to 1024, cursor paginated — our reconciliation job |
| Update settings | `POST /{group-id}` | Subject, description, and a profile picture that must be **JPEG, square, ≥192×192, ≤5MB** |

### 2.2 Group messaging

| Feature | How | Notes |
|---|---|---|
| Send to a group | `POST /{phone-number-id}/messages` with `recipient_type: "group"`, `to: "<group-id>"` | Text, media, text templates, media templates only |
| Receive group messages | `messages` webhook, message carries `group_id` | `from` is the participant who sent it — so we can attribute a reply to the customer vs one of our own people |
| Pin a message | `type: "pin"`, `pin: {type, message_id, expiration_days}` | 1–30 days, **max 3 pinned**, a 4th unpins the oldest, **admin only** |
| Unpin | same with `type: "unpin"` | |
| Mark group message read | Messages API | Keeps the group's unread state honest |
| Per-participant delivery/read | aggregated `statuses` webhook with `recipient_participant_id` | **This is the quiet gem** — see 2.4 |

### 2.3 Webhooks to subscribe

Four new fields, none currently enabled:

- `group_lifecycle_update` — create/delete, success **and failure with errors**
- `group_participants_update` — joined via link, join request created/revoked,
  approved, removed by business, **left voluntarily** (`initiated_by:
  "participant"`)
- `group_settings_update` — subject/description/picture changes, each with its
  own `update_successful` flag so partial failures are visible
- `group_status_update` — `group_suspend` and `group_suspend_cleared`

Plus group statuses arriving on the existing `messages` field.

### 2.4 What this unlocks that 1:1 cannot

These are the features worth building *because* it is a group:

1. **Who has actually seen it.** The status webhook carries
   `recipient_participant_id`, so TalkTrack can show "customer read · Amit read ·
   owner not yet" on a quotation posted to the enquiry group. No other channel
   gives per-person read state on a shared message.
2. **A pinned enquiry header.** Pin the current quotation, the agreed design or
   the delivery date, for up to 30 days. Three pins is exactly enough for
   "quote / design / delivery", and the CRM can keep them in sync as the
   enquiry moves.
3. **Join requests as a qualification gate.** With
   `join_approval_mode: approval_required`, a request becomes a CRM task: who
   asked, when, approve or reject. Useful when the invite link gets forwarded
   around a customer's firm.
4. **Voluntary-leave detection.** `initiated_by: "participant"` tells us a
   customer walked out of their own enquiry group — a churn signal that
   deserves a notification.
5. **Suspension awareness.** `group_suspend` means WhatsApp has frozen the
   group. Without the webhook, the team would just find messages failing.
6. **Group-scoped Relationship Team.** We already model primary, backups and
   manager per customer. The group is where that team becomes visible to the
   customer — and the CRM can check that everyone on the Relationship Team has
   actually joined, and chase the ones who have not.

---

## 3. What we cannot do, and the workaround

| Not supported | Workaround |
|---|---|
| **Commerce / product messages** | Our library matrix already blocks catalogues for group destinations. Post images of the pieces plus a 1:1 catalogue message to the customer |
| **Interactive messages** (buttons, lists) | Plain text with numbered options; collect the reply as text |
| **Calling in groups** | Call the customer 1:1 through WhatsApp Calling and log it against the enquiry |
| **Auth templates** | Not relevant to jewellery enquiries |
| **Disappearing / view-once** | Not available; do not offer it |
| **Edit or delete a message** | Post a correction. The CRM should warn before sending, since nothing can be taken back |
| **Hide the participant list** | Everyone sees everyone. Do not put two competing customers in one group |
| **Template performance metrics in groups** | Meta gives none. **Create separate templates for group use** so 1:1 metrics are not polluted, and measure group outcomes from our own delivery webhooks |
| **Silently adding a participant** | Invite-only, always. The invite template is the supported path |
| **Converting an existing WhatsApp group** | Impossible. The existing-group registry we already built stays the answer for legacy groups |
| **Groups on a coexistence number** | The group must be hosted by a Cloud API number — a main or zone number, never a salesperson's app number |

---

## 4. How it fits what we already have

| Already built | Changes needed |
|---|---|
| External group registry (§9.2) | Stays, for legacy app groups. Managed groups become a second, synchronised kind alongside it |
| Library destination matrix | Already models `managed_group` and blocks catalogues. Needs template-vs-free-form awareness for the service window |
| Relationship Team (§8) | Becomes the invite list: invite the primary, backups and manager, and track who joined |
| Capability registry (§10) | Already gates groups off. Needs the real signals: OBA status, Cloud-API-not-coexistence, and the 131214/131215 states |
| Conversation model | A group thread is a conversation with a `group_id` and many participants — the inbox needs a group thread type |
| Billing records | Must multiply by delivered recipients, not count one send |

---

## 5. What I would build, in order

1. **Capability detection** — OBA status and connection mode, so the Create
   Group button only appears where it can work. Nothing else is safe without
   this.
2. **Group model + the four webhooks** — create, lifecycle, participants,
   settings, status. Asynchronous creation with a pending state.
3. **Enquiry group creation from Customer 360** — subject from the enquiry,
   invite the Relationship Team, track who joined.
4. **Group thread in the inbox** — send and receive, sender attribution,
   per-participant read state.
5. **Pins** — quote, design, delivery.
6. **Join-request queue** and participant management.
7. **Cost guard** — show the recipient multiplier before a group send, and keep
   groups out of campaign audiences.

---

## 6. OBA, and what it means for a multi-tenant platform

*Answers to the questions from the first version of this document, 28 Oct 2026.*

### 6.1 What an OBA actually is

An **Official Business Account** is the blue checkmark beside a business name in
WhatsApp. I implied earlier that it was a high bar. Reading Meta's page
properly: **it is not about brand fame.** There is no notability test. It is
five objective criteria, all of which an ordinary jeweller can meet:

1. The business complies with the WhatsApp Business Messaging Policy.
2. The number has been registered on the platform for **at least 30 days**.
3. The **business portfolio that owns the number has passed Business
   Verification**.
4. The number has **two-step verification** enabled.
5. The number's **display name has been approved**.

The business then requests OBA in WhatsApp Manager (Profile - Official business
account - Submit Request), or through the Official Business Account Status API,
which exposes an `official_business_account` status field. Meta reviews and
decides. **A denial means waiting 30 days** before re-requesting.

So OBA is a process every client can complete - but it is a process, with a
30-day floor, and it belongs to **the client**, not to us. We cannot hold one
OBA on their behalf: each client's own numbers need their own status.

### 6.2 The hard consequence for coexistence

Meta states it twice, in two different places:

- "OBA is not granted to ... **WhatsApp Business app phone numbers**."
- "Groups are **not available** for WhatsApp Business app phone numbers."

**Coexistence numbers can never host groups.** Not "not yet" - structurally
not, because they cannot hold the status groups require.

For a platform that onboards clients both ways, this splits the product:

| Client onboarded with... | Groups |
|---|---|
| A new Cloud API number | **Possible** once that number is an OBA |
| An existing number via coexistence | **Never** |

A client who joins entirely through coexistence - the easy onboarding path, and
the one most existing jewellers will want - gets no managed groups at all. The
external-group registry stays their only option.

### 6.3 Per-zone hosting (decided: one number per zone)

With one Cloud API number per zone, each of those four numbers needs its own OBA
request, and each gets its own 10,000-group allowance. That is 40,000 groups per
client, which is not a constraint, and it scopes groups naturally to the zone
that owns the customer.

The cost is onboarding friction: **four display-name approvals, four 2FA
set-ups, four 30-day waits and four OBA requests per client**, on top of
Business Verification for the portfolio. The admin panel should track this per
number rather than per client, because the four will not land together.

### 6.4 Mixed team numbers (answer: both, depending on client)

Whichever way a salesperson joins - personal WhatsApp, or their own Business app
number - **they join as an ordinary participant via the invite link**, and that
works in both cases. A coexistence number is still an app on a phone; it simply
cannot be the group's business identity.

The part that matters more: because **we** host the group through the zone
number, the `messages` webhook delivers **every participant's message to us**,
whoever sent it and however they joined. The CRM sees the whole conversation.

This is the opposite of the coexistence group limitation, and the distinction is
worth being precise about:

| Group | Visible to the CRM? |
|---|---|
| Created by us through the Groups API | **Yes, completely** - every participant's messages |
| Created by hand in the app, before or outside the CRM | **No** - nothing, ever |

So the migration story is clean: **new orders get API-created groups that are
fully visible; legacy groups stay in the external registry and stay invisible.**
There is no way to convert the second into the first.

### 6.5 The participant cap against a real order group

The scenario is: customer, one or two more from the customer's side, two or
three salespeople, the owner, the sales head.

| | |
|---|---|
| Customer | 1 |
| Customer's colleagues | 1-2 |
| Salespeople | 2-3 |
| Owner | 1 |
| Sales head | 1 |
| **Participants** | **6-8** |
| Business identity (zone number) | not counted |

It fits - **at the ceiling**. An 8-participant group has no room for a fourth
salesperson, a second owner, or a replacement when someone leaves. TalkTrack
should show the remaining seats while the invite list is being built, and warn
before the group is created rather than failing on error 131204.

### 6.6 Cost, with groups as the main channel for existing customers

This deserves the most attention, because the stated model is that **all
conversation with existing customers happens in groups**.

Pricing is per delivered recipient. A 7-participant group costs 7 units per
message. The free allowance is **1,000 service units per business phone number,
shared with that number's 1:1 service messages** - so roughly **140 group
messages a month per zone number** before anything is billable, and that is
before a single 1:1 chat.

For a zone handling 200 active customers in groups, the free tier is gone in
days. Everything after is billed at the per-message service rate, times seven.

That is not a reason to avoid groups - it is how these customers actually work,
and matching that is worth paying for. But it does mean:

- The platform must **meter and show group cost per client**, or margins erode
  invisibly.
- Campaigns stay 1:1 by default. The agreed exception - include a group only
  when that group genuinely needs the message - should be an explicit opt-in per
  group, not an audience filter.
- Plan limits need a **group-message allowance** separate from the message
  count, because one send is not one message.

---

## 7. Still to confirm

1. **Does one OBA request cover every number on a WABA, or each number
   separately?** Meta's page describes it per number; WhatsApp Manager presents
   it under Profile. This decides whether a client makes one request or four.
2. **Which clients will be coexistence-only?** They cannot have managed groups
   at all, and should be sold the external registry instead.
3. **Group allowance per plan tier** - what is included before it costs the
   client extra.
