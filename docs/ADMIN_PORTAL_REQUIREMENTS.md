# TalkTrack Admin Portal — Requirements Tracker

> **Status: DEFERRED.** The admin portal is a **separate app**, to be built in one pass
> later. This doc consolidates every admin requirement so nothing is lost. Sources:
> 1. `docs/WHATSAPP CRM  - ADMIN PORTAL.xlsx` (24 modules, below)
> 2. The billing requirements doc (§17–21, §24, §40, §42) — admin-side billing.
>
> As we build the **customer-facing** billing/wallet/campaign system now, some data
> that Admin will manage (subscription **plans**, **rate cards**) is being created as
> DB models + seed data. The **admin UI** to manage those is tracked here.

---

## Part A — Admin data that the customer build seeds now (admin UI still TODO)

| Entity | Created now (model + seed) | Admin UI still to build |
|---|---|---|
| `SubscriptionPlan` | ✅ model + seeded plans (Trial/Starter/Growth/Advanced) | Create/edit/activate-deactivate plans, prices (M/Q/A), features, limits, assign to client (§18) |
| `MessageRate` (rate card) | ✅ model + seeded India rates (Meta base + markup → customer rate, effective-dated) | Pricing config UI by country/category/effective-date, markup editor (§21, §22) |
| `Wallet` / `WalletLedger` | ✅ models + runtime ledger | View balance/ledger, add credit/debit, adjustment/refund w/ amount+reason (§20) |
| `Payment` | ✅ model + Razorpay webhooks | Admin payments list, statuses, refunds (§24) |
| `Invoice` | ✅ model | Admin invoice create/track (§19/§39) |
| `NotificationEvent` | ✅ model | Admin notification rules config |

**Guardrails already enforced in the customer build (do not re-litigate in admin):**
Rules 1–12 of the billing doc — separate ledgers, wallet ≠ Meta limit, no "recharge to raise
limit", no hard-coded pricing/tiers, per-message price stored, idempotent charges & recharges,
pre-send re-checks, incoming messages never blocked, partial campaigns tracked, corrections are
ledger entries.

---

## Part B — Admin Portal modules (from the Excel, verbatim scope)

### 1. Admin Dashboard
- **Overall Client Summary** — total / active / trial / suspended / needs-attention clients.
- **WhatsApp Number Summary** — connected / pending / disconnected / restricted / error numbers.
- **Usage Summary** — messages, campaigns, calls, contacts, automations, AI, orders across all clients.
- **Revenue Summary** — subscription revenue, outstanding, wallet usage, credits, client-wise billing status.
- **Alerts** — onboarding failures, disconnected numbers, low quality, failed webhooks, payment issues, support requests.
- **Filters** — by client, plan, status, date, number, business unit, issue type.

### 2. Client Management
- Client list; client details (company, type, plan, onboarding status, #users, #numbers, status).
- Create client manually; edit client (details, plan, limits, owner, internal notes).
- Account status: activate / suspend / reactivate / close (with confirmation).
- Client search (name, ID, email, phone, WABA ID, number); client filters (plan, onboarding, payment, activity, health).
- Client owner assignment (internal admin/support/AM); client login assistance (password-reset/access to authorised admin).

### 3. Onboarding Management
- Onboarding progress (completed/pending/failed steps); pre-onboarding audit (SIM ownership, current WA use, 2FA, current provider, consent).
- Connection choice (coexistence / migration / new number); embedded-signup status (Meta login, business, WABA, permissions, verification).
- Technical setup status (number registered, WABA subscribed, webhooks working, profile+templates synced).
- Resume setup; support action (reconnect/reverify/resync without touching unrelated data); completion checklist before "ready".

### 4. WhatsApp Number Management
- Number registry (all clients' WABAs/numbers); number details (display number/name, WABA ID, phone number ID, connection type, branch, dept, team).
- Connection status (Connected, Coexistence Connected, Pending Verification, Disconnected, Not Onboarded, Restricted, Connection Error).
- Number health (quality, messaging limit, restriction, recent volume, webhook health); number actions (connect/reconnect/disconnect/rename/move).
- Add number (under existing/additional WABA); history start date; technical IDs (hide sensitive creds from unauthorised admins).

### 5. Business Structure
- Business units (offices/branches/stores/factories/regions); departments (Sales/Support/Accounts/Export/Repairs/Marketing).
- Number mapping (number → unit + dept); user mapping (users/teams → permitted branches/depts/numbers).

### 6. Team and Access
- Client users list; invite user; user status (activate/deactivate/suspend/remove).
- Roles; permissions (module/action/branch/dept/number level); admin access (who sees billing/creds/support data/audit/content); access review (excessive perms, inactive users).

### 7. Contacts Administration
- Per-client totals/growth/duplicates/imports/exports/profile-health; master config (fields, tags, lifecycle stages, sales tiers, sources, product masters).
- Import health (failed imports, invalid rows, dup handling, history); data quality (dup/incomplete/invalid/outdated); support actions (field mapping/retry/dedup/cleanup, authorised only).

### 8. Inbox Administration
- Inbox health (open/unread/unassigned/overdue/failed per client+number); message flow (inbound/outbound/status webhooks received correctly).
- Assignment health (unassigned, overloaded users, failed routing, handover); conversation search (client/number/customer/message ID/date).
- Privacy control (hide content unless role permits); support view (read-only/controlled, full audit).

### 9. Calling Administration
- Calling setup (provider, numbers, permissions, status); call usage (total/connected/failed/duration, client-wise); call errors (reasons, recording, provider errors).

### 10. Template Administration
- Template summary (approved/pending/rejected/paused/disabled per client+WABA); template details (name, category, language, header/body/buttons, status, rejection reason).
- Template sync from Meta; template support (explain rejections, correct config).

### 11. Campaign Administration
- Campaign summary (counts, recipients, delivery/read/reply/failure/spend/conversion by client+number); live campaigns (scheduled/live/paused/completed/cancelled/failed).
- Campaign errors (template/audience/variable/media/consent/wallet/Meta); emergency control (pause/stop where supported, authorised only); spend control (est vs actual, clients exceeding limits).

### 12. Automation Administration
- Automation summary (active/inactive/draft/failed bots+flows+rules); run history (runs, trigger source, success/failure/reason).
- Failure alerts (repeated failures, broken integrations, loops, unhandled contacts); safe control (disable harmful/broken w/ confirm + audit).

### 13. Catalogue and Order Administration
- Catalogue connection (Meta Catalogue/Shopify/WooCommerce/feeds); sync health (product/stock/price/order sync + errors).
- Order summary (new/pending/confirmed/cancelled/fulfilled/delivered/returned); payment health (payment-link/prepaid/COD/failed/refund); integration support (retry/guide).

### 14. AI Administration
- AI usage (agent/content-gen/summarisation/extraction/recommendation by client); AI limits (plan/client-wise); AI cost (estimate + trends).
- Knowledge sources (connected/available); safety control (suspend unsafe/failing agent without deleting setup).

### 15. Billing and Plans  *(core — mirrors billing doc §17–21, §24, §40)*
- **Plan management** — create/manage plans, included modules, limits, prices.
- **Client plan** — assign/upgrade/downgrade/customise per client.
- **Usage limits** — users, numbers, contacts, campaigns, messages, storage, calling, AI.
- **Wallet** — view/adjust balance, credits, deductions w/ reason + audit (never type a raw balance; ledger only).
- **Invoices** — create/view/download/track.
- **Payments** — pending/paid/failed/overdue/refunded.
- **Grace period** — behaviour on expiry/overdue.
- **Discounts** — approved discounts/credits/trials/promos.
- **Message pricing** — central rate config by country/category/effective-date; Meta base + markup + customer rate; never hard-code (§21/§22).
- **Message-level ledger drill-down** for disputes (§23/§40).

### 16. Support Management
- Support requests list; ticket details (client/module/issue/priority/assignee/status/history); assignment/reassignment.
- SLA (response+resolution timelines); internal notes (client-hidden); client communication history; issue resolution (resolve/reopen/final resolution).

### 17. Integrations and Webhooks
- Integration registry (Meta/Google/CRM/ERP/ecommerce/payment/calling/AI) w/ statuses (Connected/Expired/Disconnected/Error/Action Required).
- Webhook logs (type/client/number/event time/result/error); retry supported failures; credentials (secure, no plaintext secrets); expiry alerts (token/cert/connection).

### 18. Reports and Exports
- Client reports (usage/health/billing/support, exportable); module reports (contacts/inbox/campaigns/calls/automation/catalogue/orders/AI).
- Date filters + comparison periods; scheduled reports (internal); export control (sensitive exports → authorised admins).

### 19. Audit and Security
- Audit log (every important admin action: user/client/action/date/time/record); sensitive actions require confirm/approval (suspension/deletion/credential change/wallet adjustment/campaign stop).
- Data isolation (no cross-client access); credential security (encrypt tokens/IDs/secrets); login security (strong pw, 2FA, session expiry, login alerts).
- Data access control (who sees messages/contacts/billing/tech/personal); data retention (logs/exports/deleted/backups); impersonation control (permission + visible banner + limited + full audit).

### 20. System Configuration
- Global settings; module control (enable/disable by plan/client); master values (status values/categories/limits/default roles).
- Feature flags (staged rollout); notifications (system emails/alerts/reminders/rules); maintenance mode; terms & policies (terms/privacy/consent/notices).

### 21. System Health
- Service status (app/db/queues/webhooks/storage/services); error monitoring (major errors, affected clients, resolution).
- Queue monitoring (delayed/failed message/campaign/import/sync/automation jobs); storage usage (per client, nearing limits); performance (response time/delay/load); incident management (record/updates/resolution).

### 22. Admin User Experience
- Global search (clients/numbers/WABAs/users/tickets/campaigns/invoices/technical IDs); quick actions (create client/open onboarding/add number/assign support/view error).
- Saved filters; clear errors (message + exact next action); empty states (what to do when nothing present); responsive access (desktop/tablet, critical monitoring on mobile).

---

## Build note when we start Admin
- Separate app (own auth for provider admins, 2FA, session expiry). Reads the SAME Neon DB /
  models the customer app writes. Enforce data-access roles + impersonation banner + audit at the
  framework layer, not per-screen.
- Everything in Part A is already modelled by the customer build — Admin only needs the management UI over it.
