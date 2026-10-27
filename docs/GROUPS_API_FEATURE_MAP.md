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

## 6. Decisions needed from you

1. **Are you an Official Business Account?** Everything here is gated on it.
   Nothing can be tested until the answer is yes.
2. **Which number hosts the groups** — main business number, or one per zone?
   A zone number scopes groups naturally but means four sets of 10,000.
3. **Will team members join from personal WhatsApp?** If salespeople will not
   put their personal numbers in customer groups, the group holds the customer
   and the owner only, and the Relationship Team stays internal.
4. **Given the per-recipient pricing, is group messaging worth it for you** at
   roughly 6× the 1:1 cost for the same reach? My recommendation is yes for
   live enquiries, no for campaigns.
