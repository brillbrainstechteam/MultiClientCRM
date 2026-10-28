# Multi-Tenant Social Connections — Architecture

> How each TalkTrack client connects **their own** Facebook, Instagram, Meta Lead
> Ads, Messenger and Google/YouTube assets to the platform, and how leads from
> those channels flow into the one Lead Intake Hub.
> Grounded in Meta/Google official docs read 2026-10-28 (Graph API **v26.0**).
> Companion to [LEAD_INTAKE_HUB_GAP_ANALYSIS.md](LEAD_INTAKE_HUB_GAP_ANALYSIS.md).

## Principle
One **platform-owned app per provider** (one Meta app, one Google project), under
BrillBrains' own business portfolio. Each **client (tenant)** grants our app
**delegated access to their own assets** through that provider's business-login
flow. We store a **per-tenant token** and the list of connected assets as
`CrmSourceConnection` rows. Webhooks arrive at **one app-level endpoint per
provider**; we route each event by its page/IG/account id → the matching
`CrmSourceConnection` → its tenant → `processIntake`. No per-tenant app, no
per-source lead entity.

---

## 1. Meta — Facebook Pages + Lead Ads + Messenger
**Connect flow (Facebook Login for Business, "Tech Provider"):**
1. In App Dashboard → *Facebook Login for Business → Configurations*, create a
   **configuration** → choose **System-user access token (BISU)**, the assets and
   the permissions, and an expiry. You get a **`config_id`**.
2. Client clicks "Connect Facebook" → `FB.login(cb, { config_id, response_type:'code', override_default_response_type:true })` (BISU is **web-only**).
3. Server exchanges the code: `GET /v26.0/oauth/access_token?client_id=&client_secret=&code=` → a **Business Integration System User token**, *delegated to only the assets the client selected*; **defaults to never expire**.
4. Identify the client business: `GET /v26.0/me?fields=client_business_id&access_token=<BISU>`.
5. Enumerate assets (Pages, ad accounts, forms) and store one `CrmSourceConnection` per Page (`provider:"facebook"`, `externalAccountId:pageId`, `parentConnectionId`→the tenant's `provider:"meta"` row).
6. Subscribe each Page: `POST /{page-id}/subscribed_apps?subscribed_fields=leadgen,messages&access_token=<page token>`.

**Permissions (Advanced Access, via App Review):** `leads_retrieval`,
`pages_manage_metadata`, `pages_show_list`, `pages_read_engagement`,
`pages_manage_ads`, `ads_management`, `pages_messaging`, `business_management`.

**Lead Ads webhook** (object `page`, field `leadgen`): payload carries
`{leadgen_id, page_id, form_id, adgroup_id, ad_id, created_time}` — **no answers**.
Fetch them: `GET /v26.0/<leadgen_id>?access_token=<token>` → `field_data:[{name,values}]`,
plus `ad_id`/`form_id` for full source context → `processIntake` with
campaign/adset/ad/form preserved. Rate limit ≈ `4800 × leads-in-last-90-days` per
Page; webhook failures lose leads, so **retain raw failed events for retry**.

**Open design question (flagged in the docs):** how to derive a **per-Page access
token** from a BISU token for lead retrieval is *not documented*. Options to
validate in the build: use the BISU token directly where it holds the ADVERTISE
task; or mint granular tokens via `POST /<client_business_id>/system_user_access_tokens`.

**Token lifecycle:** BISU never-expires by default; if expiring, refresh with
`grant_type=fb_exchange_token` (+`set_token_expires_in_60_days`). All Graph writes
need `appsecret_proof` (HMAC-SHA256 of the token keyed by app secret). Client can
revoke under *Business Settings → Integrations → Connected apps* → we must detect
and mark the connection **disconnected**.

---

## 2. Instagram — API with Instagram Login (Unified, recommended)
No Facebook Page required. Host `graph.instagram.com`, Instagram User token.
- Connect via Business Login for Instagram → long-lived token (60 days, refreshable).
- Permissions (Advanced Access): `instagram_business_basic`,
  `instagram_business_manage_messages`, `instagram_business_manage_comments`,
  `instagram_business_content_publish`. (Old `business_*` scopes are deprecated.)
- One `CrmSourceConnection` per IG account (`provider:"instagram"`, `externalAccountId:igUserId`).
- Subscribe each account: `POST /v26.0/<ig_account_id>/subscribed_apps?subscribed_fields=messages,messaging_postbacks&access_token=<ig token>`. **All connected accounts receive every app-selected field** (cannot pick per account) — our webhook must route by `ig_account_id`.
- DM/comment → `processIntake` (sourceType `instagram`, context = account + thread/media where available). Cannot access ads/tagging on this setup.

---

## 3. Google Ads Lead Forms (incl. YouTube) + YouTube content
- **Lead forms** (Search/Display/**YouTube** campaigns): client configures a
  **webhook URL + key** in *their* Google Ads → our public endpoint
  `/api/public/google-lead/<token>` validates the key → `processIntake`
  (sourceType `google_ads`). Per-tenant URL+key = the `CrmSourceConnection`. No OAuth.
- **YouTube Data API** (comments/engagement, *not* leads) is a separate Google
  OAuth (scope `youtube.readonly`) — out of scope for lead capture; revisit only
  if social-listening is wanted. YouTube *ad* leads come through Google Ads forms.

---

## 4. Data model
Reuse `CrmSourceConnection` (already built): `provider`, `externalAccountId`,
`parentConnectionId` (Meta business → its Pages/IG/forms), `status`/`authStatus`/
`lastEventAt`/`lastError` (health), `config` (JSON: wabaId, formIds, igUsername, …).
**New:** a secure per-tenant **token store** — `CrmOAuthCredential` (tenantId,
provider, accessToken **encrypted at rest**, tokenType, expiresAt, scopes,
businessId) — rather than putting live tokens in `config`. Follows the existing
`WhatsAppAccount.accessToken` pattern; must be encrypted before production.

## 5. Webhook routing
One verified endpoint per provider (`/api/webhooks/meta`, `/api/webhooks/instagram`;
WhatsApp already at `/api/webhooks/whatsapp`). Each: verify `X-Hub-Signature-256`
with the app secret, 200 fast, then process async; map `entry[].id` (page/IG id) →
`CrmSourceConnection` → tenant → `markConnectionEvent` + `processIntake`.
Idempotent on the provider's event id (leadgen_id / message id). Retain raw failed
events for retry. Duplicates/retries happen (Meta retries ~36h).

## 6. Security
Encrypt all stored tokens at rest; never log them. Always send `appsecret_proof`.
Verify every webhook signature. Scope each tenant's data strictly by `tenantId`.
A client revoking access → mark connection disconnected + admin alert; never keep
showing a dead connector as healthy.

---

## 7. Prerequisites the business must complete (external, gating go-live)
These are Meta/Google processes, not code, and block *live* data:
1. **Meta app as a Tech Provider** under BrillBrains' business portfolio
   (the existing internal campaign app may or may not qualify — likely needs a
   dedicated/reconfigured business-type app).
2. **Business Verification** of that portfolio.
3. **App Review → Advanced Access** for each permission in §1/§2 (serving assets
   you don't own requires it).
4. Create the **Facebook Login for Business configuration(s)** → `config_id`.
5. (Google) A **developer token** (Google Ads) — only if using the pull API;
   the webhook path needs no token.

## 8. Phased build plan
1. **Connection scaffolding (dev-ready now, no review needed):** `CrmOAuthCredential`
   model + encryption util; Meta FLB connect route + callback (`/api/crm/connect/meta/*`);
   asset enumeration → `CrmSourceConnection` rows; Lead Sources UI "Connect" buttons.
   Works end-to-end in a dev app; flips live when Advanced Access lands.
2. **Meta Lead Ads connector:** `/api/webhooks/meta` (verify + route) → fetch lead
   → intake with full context; idempotent + raw-retain.
3. **Instagram connector:** Instagram Login connect + `/api/webhooks/instagram` DM→intake.
4. **Facebook Page Messenger** DM→intake (same Meta webhook).
5. **Google Ads lead-form** endpoint → intake.
6. **Connector health polling** (token expiry / revoked detection) + admin alerts.

> Reality check: steps 1–2 can be built and tested against a dev Meta app now;
> they go **live** for clients only after the §7 Business Verification + App Review
> complete. Nothing here changes the B2B/B2C journey split — these are *sources*
> feeding the one intake engine.
