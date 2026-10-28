# Meta App Setup Checklist — Lead Sources (Pages + Lead Ads + Instagram)

> What to configure in Meta so clients can connect their own Facebook Pages,
> Instagram accounts and Lead Ads. The code is built; these are the external
> steps that make it go live. Companion to
> [SOCIAL_CONNECTIONS_ARCHITECTURE.md](SOCIAL_CONNECTIONS_ARCHITECTURE.md).

## 1. App type & portfolio
- A **Business-type** Meta app, owned by **BrillBrains' own Business Portfolio**
  (separate from any client's). The existing internal campaign app can be reused
  **only if** it is a business-type app under your portfolio; otherwise create a
  dedicated one.
- Complete **Business Verification** for the portfolio.

## 2. Products to add in the App Dashboard
- **Facebook Login for Business**
- **Webhooks**
- **Marketing API** (for Lead Ads)
- **Instagram** (for Instagram Login + messaging) — optional if doing IG later

## 3. Facebook Login for Business configuration (→ `config_id`)
Create a **new** configuration (separate from the WhatsApp Embedded Signup one):
- Token type: **System-user access token** (Business Integration System User).
- Permissions: `leads_retrieval`, `pages_manage_metadata`, `pages_show_list`,
  `pages_read_engagement`, `pages_manage_ads`, `ads_management`, `pages_messaging`,
  `business_management`. (Add `instagram_business_basic`,
  `instagram_business_manage_messages` for Instagram.)
- Copy the **Configuration ID** → env `NEXT_PUBLIC_META_LEADS_CONFIG_ID`.

## 4. Webhooks
- In **Webhooks → Page**, set:
  - Callback URL: `https://talktrackcrm.brillbrainsconsultants.com/api/webhooks/meta`
  - Verify token: the value in env `WHATSAPP_WEBHOOK_VERIFY_TOKEN` (reused).
  - Subscribe fields: **`leadgen`**, and `messages` / `messaging_postbacks` for DMs.
- (Instagram) In **Webhooks → Instagram**, same callback URL + verify token;
  subscribe `messages`, `messaging_postbacks`.

## 5. App Review → Advanced Access
Submit for **Advanced Access** on every permission in §3 (Standard Access only
reaches assets you own; serving clients' assets needs Advanced). Expect
screencasts + use-case justification. This is the main lead-time item.

## 6. Server environment variables
```
NEXT_PUBLIC_META_APP_ID=<app id>
META_APP_SECRET=<app secret>
NEXT_PUBLIC_META_LEADS_CONFIG_ID=<the §3 configuration id>
WHATSAPP_WEBHOOK_VERIFY_TOKEN=<your webhook verify token>   # reused for /api/webhooks/meta
META_GRAPH_VERSION=v23.0            # keep in step with the dashboard subscription version
APP_SECRET_KEY=<base64 32 bytes>    # token encryption; generate: openssl rand -base64 32
```
Set these in the VPS `.env.production`. Until `APP_SECRET_KEY` is set, token
encryption derives a key from `META_APP_SECRET` (fine for dev, set a dedicated
key for production).

## 7. Testing before review completes
- Add your own test Page/IG to the dev app; the **Connect Facebook / Instagram**
  button on **Lead Sources** runs the real flow against the dev app.
- Submit a test lead on a Lead Ad (or use Meta's Lead Ads Testing Tool) → it
  should appear in **Lead Intake** with the campaign/ad context, and the Lead
  Sources row should show a recent "last event".

## Google Ads (no app review)
No Meta steps. On **Lead Sources**, add a **Google Ads** source → copy the shown
**Webhook URL + Key** into Google Ads → *Lead form → Webhook integration* →
*Send test data* to verify. Leads then land in Lead Intake.
