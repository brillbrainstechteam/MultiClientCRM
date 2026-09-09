# TalkTrack CRM — Open items (decisions/inputs needed from the product owner)

These block building the remaining modules on **real data** (not mock). Tracked here
so nothing is lost; answers can be filled inline under each item.

_Last updated: 2026-09-09_

## Product decisions needed

1. **Roles & permissions model**
   - Role tiers (proposed: owner / admin / manager / agent) — confirm or change.
   - Capability matrix: what each role can/can't do (view all vs own conversations,
     reassign, mark spam, export, manage team, manage billing, approve AI tasks…).
   - _Answer:_

2. **Plan tiers**
   - Tier names (proposed: trial / starter / growth / advanced).
   - What each tier gates (numbers, seats, campaigns/month, automation, prospecting, calling…).
   - _Answer:_

3. **Dormancy threshold**
   - Days of no activity after which a customer is "dormant" (drives lifecycle state + alerts).
   - _Answer:_

4. **Orders / Catalogue fields**
   - Catalogue item fields (title, SKU, price, images, variants, stock?…).
   - Order fields + statuses (draft/confirmed/paid/shipped/…).
   - Razorpay (payments) in scope now, or later?
   - _Answer:_

5. **Templates / Campaigns**
   - Template categories in use (marketing / utility / authentication) + naming.
   - Campaign types (broadcast, drip?) and any send limits.
   - _Answer:_

6. **Automation**
   - Triggers (keyword, first-message, window-expiry, stage change…), and escalation rules.
   - _Answer:_

7. **Calling**
   - Telephony provider: Twilio / Exotel / Knowlarity / other — or defer Calling.
   - _Answer:_

8. **Collections (USP module)**
   - Short spec: what it does, its inputs/outputs, who uses it.
   - _Answer:_

## External / async (not code — runs in parallel)

- **Meta Business Verification** — needed for live WhatsApp messaging at real volume
  and for other businesses to onboard via Embedded Signup. (Own account works in dev now.)
- **Google OAuth verification** — only needed for external users of the sensitive
  scopes; the owner account works today in Testing mode.

## Done (for reference)

- Contacts (real data, full requirement set), Google Contacts+Sheets+VCF sync, Inbox
  on real conversations + real sending. Workspace derived from real users/numbers.
