# TalkTrack — B2B Jewellery WhatsApp CRM
## Consolidated Product Requirements Document (Implementation Source of Truth)

**Purpose:** This document consolidates the complete B2B Jewellery CRM requirements into one implementation-ready PRD for Claude Code.

**Important implementation instruction:** TalkTrack already has substantial functionality. Claude Code must first inspect the existing repository and reuse what is already built. It should **only add, modify or complete what is missing**. Do not rebuild working modules unnecessarily.

---

# 1. Product Objective

TalkTrack must mirror how B2B jewellery businesses in India actually manage customers over WhatsApp while improving control, continuity and visibility for the business owner.

The typical business has:

- One Owner / Manager
- One main business WhatsApp number
- Four sales zones such as North, South, East and West
- 2–3 sales agents per zone
- 1–2 marketing members per zone
- Existing salespeople who may already use their own WhatsApp Business numbers
- Existing customer WhatsApp groups
- New leads sourced through telecalling, field visits and exhibitions
- Ongoing selling through calls, WhatsApp, visits, catalogues, product launches and campaigns
- Sales targets measured in grams
- A yearly brand/campaign calendar

The system must support both:

1. **Existing behaviour** — existing salesperson numbers, existing Business App usage and existing customer groups.
2. **Improved future behaviour** — shared company/zone numbers, centralized ownership, team collaboration, consistent Customer 360 and reduced dependency on employee-owned numbers.

Do not force an immediate migration of existing customer habits.

---

# 2. Roles and Access Model

## 2.1 Owner / Manager

The Owner / Manager:

- runs the business;
- has access to the main business number;
- sets up Sales and Marketing teams;
- creates/manages zones;
- sees all permitted WhatsApp numbers, inboxes, customers, groups, reports and targets;
- assigns and reassigns customers;
- handles pending sales assignments;
- monitors unanswered chats and overdue follow-ups;
- approves campaigns where approval is enabled;
- sees telecalling, visit, exhibition, campaign, order, billing and target performance.

## 2.2 Marketing Team Member

Typically 1–2 members per zone.

They:

- work on new customers/leads only;
- receive new leads for their zone;
- call and qualify leads;
- update call outcomes and notes;
- use communication content to activate leads;
- keep non-ready leads in follow-up/nurture;
- mark interested leads as Qualified;
- hand Qualified leads to Sales;
- work against configurable daily calling/qualification targets.

## 2.3 Sales Agent

Typically 2–3 agents per zone.

They:

- manage existing customers and qualified new customers;
- call, visit and WhatsApp customers;
- use existing personal/business WhatsApp numbers where required;
- may also use shared company or zone numbers;
- cover another salesperson's customers when required;
- manage follow-ups;
- record sales and activities;
- see yearly target progress in grams.

## 2.4 Client / B2B Buyer

A jewellery trade customer, either new or existing.

The customer can interact through:

- a salesperson's existing WhatsApp number;
- the main business WhatsApp number;
- a zone/shared number;
- an existing external WhatsApp group;
- a future Meta Managed Group where supported.

## 2.5 Marketing Agency

Optional external collaborator responsible for:

- yearly brand calendar;
- festivals/events;
- exhibitions;
- campaign strategy;
- content plan;
- creatives/reels/posts.

Agency login/access should remain configurable.

---

# 3. Zone Model

The initial operating model uses four zones:

- North
- South
- East
- West

However, zones must be configurable so future clients are not restricted to exactly four.

Each zone may contain:

- states;
- cities;
- branches;
- 2–3 sales agents;
- 1–2 marketing members;
- optional shared WhatsApp number(s).

Each customer belongs to a zone based on location, but the Owner may override the suggested zone.

If a salesperson is absent, authorized teammates from the same zone must be able to pick up pending conversations and follow-ups.

---

# 4. End-to-End Customer Journey

The core journey is:

1. **Find**
   - Telecalling lists
   - Field visits
   - Exhibition imports
   - A customer may come through one or several of these channels.

2. **Assign Zone**
   - Determine zone from city/state.
   - Owner may override.

3. **Qualify New Customers**
   - New customers go first to the Marketing team.
   - Existing customers remain with Sales.

4. **Reach Out**
   - Calls
   - WhatsApp
   - Visits
   - Communication Library
   - Voice notes
   - Videos
   - Creatives
   - Catalogues
   - Quick replies

5. **Assign to Sales**
   - Qualified lead is handed to a salesperson in the same zone.

6. **Customer Collaboration**
   - Continue through shared CRM conversation, existing external WhatsApp group, or Managed WhatsApp Group where supported.
   - Group creation is not mandatory for the CRM to continue working.

7. **Sell and Nurture**
   - Catalogue
   - Collections
   - Product launches
   - Follow-ups
   - Campaigns
   - Relationship-building activities

8. **Track Targets**
   - Orders and relevant sales counted against salesperson gram target.

9. **Report**
   - Agents see their own permitted performance.
   - Owner sees the full business view.

If a customer does not respond, do not drop the customer automatically. Move them to an alternate follow-up/nurture approach using the Communication Library and journeys.

---

# 5. Multiple WhatsApp Numbers and Inboxes

## 5.1 Core Architecture Principle

**A CRM user is NOT the same thing as a WhatsApp number.**

A salesperson can:

- have their own existing number;
- use a zone number;
- use the main business number;
- access more than one permitted number;
- have no dedicated WhatsApp number at all.

Similarly, one WhatsApp number may be used by multiple authorized CRM users.

Every connected number must be represented as a **WhatsApp Channel**.

### Supported channel types

- Main Business
- Zone Shared
- Existing Individual / Legacy
- Marketing Shared
- Group Host
- Other

### Connection modes

- Cloud API
- Coexistence
- Migrated API
- Test

### Ownership types

- Business-owned
- Employee-owned
- Unknown

Normal users should see friendly names such as:

- ABC Jewels Main
- North Sales
- Amit Sales

Do not expose WABA IDs, phone_number_id or other Meta IDs in normal workflows.

## 5.2 Main Business Number

The business has one main WhatsApp number.

Typical uses:

- website leads;
- Click-to-WhatsApp;
- exhibitions;
- general enquiries;
- unassigned/new enquiries;
- business-wide campaigns.

The main number may be:

- Cloud API; or
- Coexistence if the business already uses it in WhatsApp Business App.

## 5.3 Zone Numbers

The CRM should support separate company-owned numbers such as:

- North Sales
- South Sales
- East Sales
- West Sales

Multiple authorized users can work from the same zone number.

A zone number is not owned operationally by one employee.

## 5.4 Existing Salesperson Numbers

Existing salespeople may already have important customer relationships on their own WhatsApp Business numbers.

Where supported, these numbers should be connected using **Coexistence**.

The salesperson should be able to continue using WhatsApp Business App while supported 1:1 activity is also available in TalkTrack.

For new hires/new customer relationships, prefer business-owned main/zone channels instead of automatically creating new employee-owned customer channels.

## 5.5 Permitted WhatsApp Channels

Each user can have access to one or more channels.

Example:

**Amit**
- Department: Sales
- Zone: North
- Allowed channels:
  - Amit Existing Number
  - North Sales

**Rahul**
- Department: Sales
- Zone: North
- Allowed channels:
  - North Sales

**Owner**
- Access to all permitted business channels.

Channel permissions should support at least:

- View
- Reply
- Send Template
- Send Campaign
- Call
- Admin

## 5.6 Inbox Behaviour

### NUM-01
Connect the main business number and all required salesperson/marketing/shared numbers to one TalkTrack tenant.

### NUM-02
Each number/channel can be mapped to:

- a primary user where relevant;
- a zone;
- a team;
- a branch.

Do not force one-number-to-one-user.

### NUM-03
Each WhatsApp thread retains the exact channel on which the conversation exists.

The agent must reply from that same channel unless deliberately starting a new conversation through another channel.

### NUM-04
An agent sees:

- own assigned conversations;
- permitted zone/shared conversations;
- temporary coverage work;
- only channels they are authorized to access.

### NUM-05
The Owner sees all permitted inboxes in one unified dashboard and can filter by:

- WhatsApp number/channel;
- channel type;
- agent;
- zone;
- team;
- branch;
- department.

### NUM-06
Every conversation received through connected/supported channels is stored and linked to Customer 360.

Do not claim access to communication Meta does not expose.

### NUM-07
Number setup must follow current Meta rules and account eligibility.

Do not hard-code number limits in product logic.

### NUM-08
Marketing members may have their own existing numbers, but a dedicated number is optional.

They may instead use permitted shared/main/zone channels.

---

# 6. Coexistence, History Sync and Business App Message Echoes

These are separate features and must not be treated as the same thing.

## 6.1 Coexistence

Coexistence allows a WhatsApp Business App number to remain usable on the phone while also being connected to the WhatsApp Business Platform.

TalkTrack should support:

- Coexistence onboarding;
- connection state;
- history-sync state;
- contact/app-state sync;
- future 1:1 inbound messages;
- messages sent through TalkTrack;
- Business App message echoes.

## 6.2 History Sync

History Sync is the onboarding backfill of supported past **1:1** conversations.

Current Meta/Coexistence behaviour supports historical synchronization of up to approximately 180 days where the user approves history sharing.

TalkTrack must:

- request history during onboarding when permitted;
- track sync state;
- process chunks idempotently;
- handle out-of-order chunks;
- mark imported messages as historical;
- prevent imported messages from triggering new operational workflows.

Historical messages must NOT:

- create unread alerts;
- trigger automations;
- create SLA breaches;
- reopen solved conversations;
- create false service windows;
- generate new-lead notifications.

## 6.3 Business App Message Echoes

Business App Message Echoes are for **future messages sent by the salesperson from the WhatsApp Business App after Coexistence is connected**.

Example:

Customer sends message → salesperson replies from phone → Meta sends message echo → TalkTrack adds that reply to the CRM timeline.

This is not the same as History Sync.

TalkTrack must store message source such as:

- Customer
- CRM Agent
- WhatsApp Business App
- Campaign
- Automation
- AI Agent
- Historical Import

## 6.4 Current Coexistence Limitations

The product must clearly account for these limitations:

- Existing Business App group chats are **not synchronized** through Coexistence.
- Existing group history is **not imported** through Coexistence.
- Business App broadcast lists are not available as Cloud API campaign objects.
- Some Business App-only features remain unavailable through the platform.
- Do not use unofficial WhatsApp Web scraping or browser automation to bypass these limitations.

---

# 7. Customer 360 and Relationship Ownership

A Customer is not the same thing as one WhatsApp conversation.

One customer may have:

- a conversation on the main number;
- a conversation on a zone number;
- a conversation on an existing salesperson number;
- an external WhatsApp group;
- calls;
- visits;
- campaigns;
- orders;
- follow-ups.

Customer 360 should aggregate the relationship but **must not merge different WhatsApp threads into one fake thread**.

Each actual message thread must retain:

- channel;
- sender identity;
- timestamps;
- conversation status;
- assigned user/team;
- zone.

---

# 8. Relationship Team

Each important customer should support an internal Relationship Team:

- Primary salesperson
- Backup salesperson 1
- Backup salesperson 2
- Manager / Owner
- Zone
- Primary WhatsApp channel

This Relationship Team provides internal continuity.

It is separate from WhatsApp group membership.

A backup user can support a customer through the CRM even if they are not a participant in a customer WhatsApp group.

---

# 9. Client WhatsApp Groups

Groups remain an important real-world B2B jewellery workflow and must stay in the PRD.

However, TalkTrack must distinguish between:

1. **Shared CRM Conversation**
2. **External WhatsApp Group**
3. **Managed WhatsApp Group**

## 9.1 Shared CRM Conversation

Recommended default for new customers when a physical WhatsApp group is not necessary.

Customer talks to one company/zone WhatsApp number.

Internally:

- Primary salesperson
- Backup salesperson(s)
- Owner/Manager

can collaborate and cover the customer.

This provides continuity without requiring every internal employee to be a WhatsApp participant.

## 9.2 Existing / External WhatsApp Group

Many existing customers already have WhatsApp Business App groups containing:

- customer;
- salesperson;
- owner;
- one or more backup people.

These groups continue to work normally in WhatsApp.

TalkTrack should allow the group to be registered as an **External Group**.

Store:

- customer;
- group name;
- zone;
- primary salesperson;
- backup users;
- owner/manager;
- related WhatsApp number;
- optional manual invite/reference link;
- notes;
- group status;
- last manual update.

Show clearly:

**External WhatsApp Group — Managed in WhatsApp App — Messages not synchronized**

Provide CRM actions:

- Log Group Update
- Add Note
- Add Follow-up
- Record Order Discussion
- Attach File
- Record Outcome
- Mark Inactive

External groups must NOT:

- create fake unread counts;
- create fake response-time metrics;
- be treated as fully synchronized conversations;
- generate fake message history.

## 9.3 Managed WhatsApp Groups

Managed Groups use Meta's official Groups API and must be capability-gated.

Current Meta Groups API constraints that TalkTrack must account for:

- Groups are available only to eligible businesses/accounts.
- Current documentation requires Official Business Account eligibility.
- Groups are invite-based.
- A customer cannot simply be silently auto-added.
- Current limit is 8 participants per group.
- Up to 10,000 managed groups can be created per eligible business number.
- Only one Cloud API business number can be the business identity in the group.
- Text, media and supported templates are available.
- Calling is not supported inside Groups API groups.
- Interactive/button messages are not supported in groups.
- Commerce/product messages are not supported in groups.
- Template performance metrics are not available for group templates.
- Coexistence / Business App numbers should not be assumed to host Managed Groups.
- Existing Business App groups cannot be automatically converted into Managed Groups.

Do not hard-code eligibility rules permanently. Use channel capability checks.

## 9.4 Group Requirements

### GRP-01
Create a client group from Customer 360 when the client shows interest or orders, where Managed Groups are supported.

If Managed Groups are unavailable, allow:

- Shared CRM Conversation; or
- Register External Group.

### GRP-02
Original business requirement: the zone's 2–3 salespeople should be involved so someone is always available.

Implementation:

- add these users to the customer's Relationship Team;
- do not assume they can be silently added as WhatsApp participants;
- if actual WhatsApp participation is required, use the supported invite flow.

### GRP-03
For Managed Groups, save supported group messages against the customer and expose them to authorized users/owner.

For External Groups, do not claim message synchronization.

### GRP-04
Authorized team members must be able to continue customer servicing when one salesperson is unavailable.

This can happen through:

- Shared CRM Conversation;
- internal Relationship Team access to Managed Group;
- existing External Group outside CRM.

### GRP-05
Agents should be able to use suitable Communication Library items with groups.

For Managed Groups, only show formats supported by Meta for that destination.

For External Groups, content can be prepared/copied for manual use.

### GRP-06
Original requirement: bring existing client groups into CRM.

Current Meta limitation:

Existing WhatsApp Business App groups are not synchronized through Coexistence.

Therefore implement:

- External Group Registry;
- manual group registration;
- optional bulk import of group metadata;
- no fake message import.

### GRP-07
Original requirement: keep blank groups ready for quick assignment.

Recommended implementation:

Use **Group Presets** instead of creating unused WhatsApp groups.

A Group Preset may contain:

- group-name pattern;
- description;
- default Relationship Team rules;
- default welcome message;
- join-approval preference;
- default library content.

Create the real Managed Group only when required.

---

# 10. WhatsApp Capability Management

TalkTrack must not assume that every number supports every Meta feature.

A centralized capability layer must determine what each WhatsApp channel can actually do.

Capabilities should include:

- Messaging
- Coexistence
- History Sync
- Business App Message Echoes
- Managed Groups
- WhatsApp Calling
- Meta Catalogue
- WhatsApp Flows
- Interactive Messages

Useful capability states:

- Available
- Not Available
- Not Configured
- Eligible but Disabled
- Pending
- Restricted
- Unknown

UI and backend actions must use these states.

Example:

If Groups are not available for Amit's existing Coexistence number, do not show "Create Managed Group" for that number.

This is primarily an internal/platform capability, not a user-facing module.

---

# 11. Zones, Assignment and Absence Cover

### ZON-01
Set up zones by states and cities.

Initial model: North, South, East, West.

Zones remain configurable.

### ZON-02
Map 2–3 sales agents to each zone.

### ZON-03
Place each new customer into a zone using city/state; allow Owner override.

Owner or assignment rules divide customers among eligible agents.

### ZON-04
Agents primarily see/manage their own zone's customers, subject to role/channel permissions.

### ZON-05
Each zone has shared operational queues such as:

- pending chats;
- follow-ups due;
- coverage work;
- unassigned work.

### ZON-06
When a salesperson is absent, their pending work becomes available to authorized backup/zone members.

Do not automatically change permanent customer ownership merely because of temporary absence.

### ZON-07
Owner sees pending, answered and overdue work across all zones.

### ZON-08
Map 1–2 marketing members to each zone alongside Sales.

### ZON-09
Original requirement: zone email where WhatsApp Business chats are backed up.

Implementation clarification:

- TalkTrack may store a zone operational email.
- Do not promise to restore WhatsApp Business App backups through that email.
- TalkTrack separately stores all CRM-observed/synchronized data according to its own retention rules.

---

# 12. Team Management — Sales and Marketing

### TEAM-01
Support Sales and Marketing departments.

Owner can:

- add;
- edit;
- deactivate members.

### TEAM-02
Original requirement: each member has a department, zone and WhatsApp number.

Final implementation:

Each member has:

- department;
- zone(s);
- role;
- permissions;
- one or more permitted WhatsApp channels.

A dedicated number is optional.

### TEAM-03
Permissions are configurable by module/action.

Examples:

- View
- Create
- Edit
- Delete
- Approve

Also enforce channel-level permissions.

### TEAM-04
Customers can be assigned/reassigned to members.

Customer history remains attached to the customer.

### TEAM-05
Targets:

- Sales: yearly gram target
- Marketing: daily calling/qualification target

### TEAM-06
When a member is deactivated:

- customers;
- pending chats;
- follow-ups;
- open tasks

must be reassigned appropriately.

If the user's number is:

- Business-owned → channel can remain with business.
- Employee-owned → flag customer migration/continuity risk.

### TEAM-07
Reports by:

- member;
- department;
- zone.

### TEAM-08
All team-management functions work consistently for both Sales and Marketing where relevant.

---

# 13. New Leads — Marketing Qualification and Handoff

New customers do not go directly to Sales.

Existing customers remain with Sales.

### MKT-01
Assign new leads to Marketing members in the lead's zone.

### MKT-02
Each Marketing member has:

- configurable daily calling target;
- date-wise calling schedule.

### MKT-03
After every call:

- update lead status;
- record outcome;
- add/edit notes.

If a call recording/transcript exists through an integrated provider, generate an editable AI summary.

Do not assume an ordinary mobile/SIM call can always be recorded automatically.

### MKT-04
Activation methods beyond the call may include:

- creatives;
- voice notes;
- reels;
- videos;
- catalogues;
- campaigns;
- optional Owner voice notes/videos.

### MKT-05
When interested, mark lead Qualified.

If only one eligible Sales member exists in the zone:

- auto-assign.

### MKT-06
If multiple eligible Sales members exist:

- move lead to Pending Assignment;
- show eligible zone Sales members;
- Owner assigns salesperson.

### MKT-07
Notifications during pending/assignment:

- Owner
- Marketing member
- relevant Sales members
- assigned salesperson after assignment.

### MKT-08
Not-yet-interested leads stay with Marketing and move to follow-up/nurture using the Communication Library.

### MKT-09
Track progress against configurable new-customer targets.

Do not hard-code "400" until the business defines whether it applies per member, zone, period or business.

---

# 14. Reaching Clients — Telecalling

### TEL-01
Owner/system divides new customer numbers among members by zone.

### TEL-02
Each member sees their call list and logs each call outcome.

Outcomes should support at least:

- No Answer
- Wrong Number
- Reached / Not Interested
- Follow Up
- Interested
- Qualified
- Converted
- Other

### TEL-03
After a call, allow WhatsApp follow-up using the Communication Library.

### TEL-04
Clients showing no interest should move to another follow-up approach rather than being dropped automatically.

### TEL-05
Telecalling report by agent and zone should include:

- new leads;
- leads called;
- delayed calls;
- contact ratio;
- successful-contact ratio;
- failure ratio;
- reasons for no response;
- interested;
- conversions;
- converted volume;
- activated customers.

### TEL-06
Calls may be made through:

1. External Mobile/SIM Call
2. Integrated Telephony
3. WhatsApp Calling where supported

For External Mobile/SIM Call:

- launch/log the call;
- collect outcome manually;
- do not promise automatic recording.

For Integrated/Supported Calling:

- recording if available;
- transcript if available;
- editable AI summary.

### TEL-07
Existing customers receive calling/follow-up schedules aimed at increasing business volume.

Track volume/opportunity per customer.

---

# 15. Field Visits

### FLD-01
Agents can plan and schedule customer visits.

### FLD-02
Record products/catalogues/offerings presented.

### FLD-03
Record visit spend/expenses.

### FLD-04
Record outcome:

- interested;
- converted;
- volume bought;
- expected grams;
- actual grams.

### FLD-05
Field-visit report:

- spend;
- customers interested;
- customers converted;
- volume bought.

### FLD-06
Customer 360 shows last visit:

- date;
- salesperson;
- discussion;
- outcome.

### FLD-07
Date-range reporting includes:

- planned vs visited;
- total expense;
- customers activated;
- volume sold;
- visits pending.

---

# 16. Exhibitions and Lead Capture

### EXH-01
Capture contacts from:

- business cards;
- physical registers;
- imports.

### EXH-02
Extract/import data into CRM.

Where Card2Leads already solves capture/OCR, prefer integration/reuse rather than rebuilding the same capability.

### EXH-03
Assign each imported customer to:

- zone;
- calling;
- field visit;
- or both.

### EXH-04
Track exhibition contacts through their subsequent journey:

- contacted;
- active;
- not interested;
- qualified;
- converted;
- volume bought;
- channel(s) used.

### EXH-05
Exhibition contacts are new customers and therefore first go to the Marketing qualification flow.

---

# 17. Communication Library

Agents need ready content matched to customer context.

Library item types:

- Communication templates
- Campaign templates
- Quick replies
- Voice notes
- Owner voice notes
- Videos
- Owner videos
- Catalogues
- Images / creatives
- Reels
- PDFs / documents
- Links
- Other supported WhatsApp formats

### LIB-01
Store all supported pre-drafted content in one library.

### LIB-02
Agents can find/use suitable items during:

- live 1:1 chat;
- campaigns;
- Managed Groups where supported;
- External Groups manually.

### LIB-03
Maintain dedicated content for new customers/leads.

### LIB-04
Maintain a separate content set for customers showing low/no interest.

### LIB-05
Maintain premade/customizable content for the full journey, including emotional/relationship messages.

Every library item should know where it can be used:

- 1:1 Live
- 1:1 Template
- Campaign
- Managed Group
- External Group Manual

Only show formats supported by the destination.

---

# 18. Campaigns and Brand Calendar

Jewellery businesses may work with agencies to create a yearly marketing calendar.

Campaign types:

## 18.1 New Customers / Prospects

Activation campaigns using:

- creatives;
- voice notes;
- reels;
- catalogues;
- messages.

## 18.2 Existing Customers

Campaigns for:

- new collections;
- product launches;
- festival communication;
- seasonal communication;
- content customers can forward/post.

### CMP-01
Yearly brand calendar:

- festivals;
- known events;
- exhibitions.

### CMP-02
Plan campaigns for the full year against calendar dates.

### CMP-03
Predefined templates across the client journey, including catalogues, launches and collections.

### CMP-04
Campaign templates can be bundled with required creatives/assets.

### CMP-05
Authorized users can customize campaign content and creatives.

### CMP-06
Notifications before key calendar dates/campaigns.

### CMP-07
Calendar also includes:

- wedding season;
- seasonal peaks;
- important days.

Known public dates may be fetched; unknown/business-specific dates entered manually.

### CMP-08
Each campaign has a content plan:

- objective/strategy;
- what to communicate;
- reels/posts/creative grid.

### CMP-09
Owner approval can be required before campaign goes live.

### CMP-10
Campaign delivery modes:

- compliant 1:1 message sends;
- shared-main/zone/customer-primary channel sending;
- Managed Group posts where supported;
- External Group manual sharing;
- Manual WhatsApp Channel post task if no official publishing integration is available.

Do not treat WhatsApp Business App broadcast lists as Cloud API campaigns.

### CMP-11
Track campaign results where data is available:

- sent;
- delivered;
- read;
- failed;
- replies;
- reach;
- qualified leads;
- conversions;
- orders;
- grams.

### CMP-12
When multiple jewellery businesses use similar templates, support tenant-specific content variation.

Do not create cross-tenant customer identity tracking unless explicitly approved and privacy-safe.

---

# 19. Yearly Targets in Grams

### TGT-01
Owner sets yearly gram target for each Sales agent for applicable business.

### TGT-02
Every relevant order records grams and contributes to target.

### TGT-03
Owner and agent see:

- target;
- achieved;
- remaining;
- attainment %.

### TGT-04
Agents can log activities/initiatives supporting target achievement.

### TGT-05
Agents can see which customers:

- replied;
- did not respond.

Only use observed CRM data; do not infer unavailable External Group responses.

### TGT-06
Agents see customers with remaining growth potential.

### TGT-07
Marketing members see:

- daily calling target;
- calls made;
- leads qualified.

Targets must remain configurable.

---

# 20. Billing Tracking

### BIL-01
Customer order/invoice status:

- raised;
- sent;
- paid;
- pending.

### BIL-02
Track WhatsApp messaging/usage costs where available by:

- number/channel;
- zone;
- campaign.

### BIL-03
Platform subscription:

- plan;
- renewal date;
- payment status.

---

# 21. Reports and Dashboards

Owner sees business-wide reporting.

Members see only permitted data.

## 21.1 Conversation Reporting

Owner:

- all supported connected channels;
- all observed conversations;
- Managed Groups;
- registered External Groups with clear "manual/external" coverage.

Members:

- own/permitted conversations;
- permitted groups.

## 21.2 Zone Follow-ups

- pending;
- answered;
- overdue conversations;
- overdue follow-ups.

## 21.3 Telecalling

- leads assigned;
- leads called;
- calls delayed;
- contact ratio;
- successful contact ratio;
- failure ratio;
- reasons for no response;
- conversions;
- converted volume;
- activated customers.

## 21.4 Marketing Qualification

- leads assigned;
- calls vs target;
- interested;
- qualified;
- handed to Sales;
- pending assignment.

## 21.5 Field Visits

- spend;
- interested customers;
- converted customers;
- volume bought;
- planned vs visited;
- pending visits.

## 21.6 Exhibitions

- contacts imported;
- channels used;
- qualification/conversion;
- volume generated.

## 21.7 Campaigns

- campaigns sent;
- reach;
- replies;
- conversion;
- attributed orders/grams where available.

## 21.8 Targets

- target;
- achieved;
- remaining;
- replied vs not responded;
- customers to tap.

## 21.9 Billing

- orders;
- invoices;
- WhatsApp costs;
- platform subscription.

### RPT-01
One Owner dashboard covers all permitted numbers, inboxes, groups, zones and channels.

### RPT-02
Reports filter by:

- agent;
- zone.

### RPT-03
Agents get equivalent reports limited to their permitted work and zone.

### RPT-04
Reports can also filter by department:

- Sales
- Marketing

Add data-coverage labels where needed:

- Complete
- Partial
- Manual / External

Never present External Group data as full WhatsApp message history.

---

# 22. Notifications

Notifications should exist for the following events:

- Brand-calendar date approaching → Owner and relevant users
- Campaign due → Owner and relevant users
- Customer message pending → assigned/covering user
- Follow-up due → assigned user
- Assigned agent absent with pending work → authorized zone/backup users
- Field visit scheduled → visiting salesperson
- New customer assigned → receiving user
- New lead assigned for qualification → Marketing member
- Qualified lead pending Sales assignment → Owner + relevant Marketing/Sales users
- Qualified lead assigned → assigned Salesperson + Marketing member
- Campaign content awaiting approval → Owner/approver
- Marketing member behind calling target → member + Owner

Support:

- immediate notifications;
- digest notifications;
- deduplication;
- configurable notification preferences.

Avoid notification overload.

---

# 23. Absence and Coverage

Support availability states such as:

- Available
- Absent
- Leave
- Temporarily Unavailable

When a salesperson is absent:

- keep permanent customer owner unchanged;
- expose pending conversations/follow-ups to authorized backup/zone members;
- record the covering user;
- preserve the existing customer-facing WhatsApp channel;
- stop temporary coverage when the absence ends.

When an employee permanently leaves:

- reassign customers/tasks;
- preserve history;
- if channel is employee-owned, flag migration risk;
- if business-owned, retain the channel.

---

# 24. Onboarding and Migration

The B2B onboarding experience should be simple and progressive.

## Step 1 — Business

Capture:

- business;
- Owner;
- branches;
- zones.

## Step 2 — Team

Capture:

- Sales members;
- Marketing members;
- zones;
- roles.

Do not make a dedicated WhatsApp number mandatory for every user.

## Step 3 — Main WhatsApp Number

Connect main business number.

## Step 4 — Zone Numbers

Ask whether the business uses/wants separate zone numbers.

Connect as required.

## Step 5 — Existing Salesperson Numbers

Ask:

"Do any salespeople already have customers talking to them on an existing WhatsApp Business number?"

If yes:

- connect through Coexistence where supported;
- record number ownership.

## Step 6 — History/Contacts

If Coexistence history sharing is approved:

- import supported 1:1 history;
- sync contacts;
- show progress/status.

## Step 7 — Existing Customers

Import/dedupe customers.

Assign:

- zone;
- primary salesperson;
- primary WhatsApp channel.

## Step 8 — Existing Groups

Ask whether customers are managed through existing WhatsApp groups.

Register these as External Groups.

Explain clearly:

"The group continues working in WhatsApp. Existing group messages are not synchronized into TalkTrack."

## Step 9 — Relationship Team

Configure:

- Primary salesperson
- Backup person(s)
- Owner/Manager

## Step 10 — Progressive Adoption

Existing team can continue using WhatsApp Business App where required.

TalkTrack gradually becomes the source for:

- assignments;
- follow-ups;
- ownership;
- reporting;
- shared visibility;
- future customer relationships.

---

# 25. Meta-Specific Feasibility Summary

| Area | Current implementation expectation |
|---|---|
| Multiple connected WhatsApp numbers in one TalkTrack tenant | Supported by TalkTrack architecture; underlying Meta assets may span multiple phone-number/WABA/account objects |
| One owner view across many numbers | TalkTrack feature |
| Many CRM agents using one shared zone/main number | TalkTrack feature using Cloud API sender + internal user attribution |
| Existing salesperson WhatsApp Business number + CRM | Use Coexistence where eligible |
| Supported past 1:1 chat import | Coexistence History Sync |
| Future replies sent from Business App appearing in CRM | Business App Message Echoes |
| Existing Business App groups imported through Coexistence | **Not supported** |
| Existing Business App group future messages mirrored through Coexistence | **Not supported** |
| External Group registry | TalkTrack workaround / CRM feature |
| Official Managed Groups | Supported only when Meta account/channel is eligible |
| Direct silent addition of participants to Managed Group | **Not supported — invite-based** |
| Managed Group participant cap | Current limit: 8 |
| Managed Groups per eligible business number | Current limit: up to 10,000 |
| Multiple Cloud API business identities in one Managed Group | **Not supported — one business identity** |
| Group text/media/templates | Supported in Managed Groups |
| Group calling | **Not supported** |
| Group interactive buttons/lists | **Not supported** |
| Group commerce/product messages | **Not supported** |
| Business App broadcast lists controlled through Cloud API | **Not supported as API campaigns** |
| Ordinary SIM/mobile call automatic recording via Meta | **Not supported** |
| WhatsApp Calling API | Supported only where account/channel eligibility/configuration allows |
| WhatsApp Channel automatic publishing | Do not promise unless an official supported integration is available |
| Zone email restoring WhatsApp backup | **Not supported** |

Meta capabilities change over time. Do not hard-code current eligibility/limits as permanent product assumptions.

---

# 26. Open / Tenant-Configurable Decisions

The following must remain configurable rather than hard-coded:

- Zone definitions and location mapping
- Whether Marketing agency gets login access
- Who can create/edit library items
- Definition of "Activated"
- Definition of "Converted"
- New-customer target definition
- Whether new-customer sales also count toward gram targets
- Calling targets
- Sales gram targets
- Relationship Team size
- Campaign approval requirement
- Absence approval/process
- Activation/nurture sequence
- Lead assignment method
- Whether Owner personally calls customers
- Whether Card2Leads or internal capture is used for exhibition OCR
- Whether/manual tracking is required for customer Instagram reposts

---

# 27. Claude Code Implementation Rules

Claude Code must treat this PRD as the business source of truth.

Before changing code:

1. Inspect the existing repository.
2. Identify what is already implemented.
3. Reuse existing modules/components/services.
4. Do not rebuild working functionality.
5. Compare current implementation against every requirement in this PRD.
6. Add only missing/incomplete functionality.
7. Preserve existing production data and migrations.
8. Preserve strict multi-tenancy.
9. Keep Meta-dependent functionality capability-gated.
10. Do not use unofficial WhatsApp Web scraping or reverse-engineered clients.
11. Do not fabricate unsupported WhatsApp data.
12. Keep normal SME-facing UI simple and hide Meta technical IDs.
13. Every WhatsApp message must retain the actual channel used.
14. Never silently change sender number.
15. Keep Customer identity separate from actual WhatsApp conversation threads.
16. Keep Conversation Status separate from Customer Lifecycle and WhatsApp 24-hour window.
17. Add tests for every changed workflow.
18. If Meta does not support a requested behaviour, implement the stated CRM workaround rather than pretending the Meta feature exists.

---

# 28. Completion Checklist

Claude should verify that the final implementation covers:

- Multiple main/zone/individual WhatsApp numbers
- Coexistence
- History Sync
- Business App Message Echoes
- Unified owner Inbox
- User-to-channel permissions
- Customer 360
- Relationship Team
- Existing External Groups
- Managed Groups capability handling
- Group limitations
- Zones
- Sales and Marketing teams
- Absence/coverage
- New-lead Marketing qualification
- Sales handoff
- Telecalling
- Calls and outcomes
- Field visits
- Exhibitions
- Communication Library
- Campaigns
- Brand calendar
- Gram targets
- Orders/invoices
- Billing
- Reports
- Notifications
- Onboarding/migration
- Data coverage / partial visibility states
- Multi-tenant permissions and auditability

No original requirement should be silently removed. Where a requirement cannot be implemented exactly because of Meta limitations, retain the business intent and implement the documented workaround.
