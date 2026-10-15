# Creating a new Embedded Signup configuration

A Facebook Login for Business **configuration** decides what a business customer
is asked to grant when they connect their WhatsApp number: which products, which
assets, which permissions, and — the part that matters most here — **what kind of
access token is minted and how long it lives**.

Several of those choices are permanent. The dashboard says *"This can't be
changed later"* on the **Products**, **Access token type** and **Token
expiration** steps, and it means it. Changing any of them means a new
configuration.

That is not as alarming as it sounds, because a configuration only affects
customers who connect **after** you start using it. Nothing already connected is
touched. The rest of this document is the procedure and the proof.

---

## Why you would make a new one

The common reason: the current configuration issues **60-day** tokens.

Meta offers no server-to-server refresh for a business integration token. When
one expires, the only recovery is the customer completing Embedded Signup again.
On a 60-day configuration that is a scheduled outage for every customer, every
two months. A configuration set to **Never** removes the problem permanently.

---

## 1. Record the current state first

So that "did we break something?" has an answer rather than an opinion.

1. Open `/diagnostics/whatsapp` while signed in.
2. Screenshot it, or note each check's status.
3. Note the current `NEXT_PUBLIC_META_CONFIG_ID` — this is your rollback.

The two checks to care about afterwards are **Access token valid** and **App
subscribed to WABA webhooks**. If those are green before and after, nothing that
matters changed.

---

## 2. Check the app-level settings (usually already correct)

These live on the **app**, not the configuration, so a new configuration
inherits them and you should not need to change anything. Verify rather than
edit.

**App Dashboard → Facebook Login for Business → Settings → Client OAuth
settings.** All of these should be **Yes**:

- Client OAuth login
- Web OAuth login
- Enforce HTTPS
- Embedded Browser OAuth Login
- Use Strict Mode for redirect URIs
- Login with the JavaScript SDK

**Allowed domains** must contain the domain that hosts the signup page, and
because TalkTrack uses a server-side redirect flow as well as the JS SDK popup,
**Valid OAuth redirect URIs** must contain the callback exactly:

```
https://talktrackcrm.brillbrainsconsultants.com/api/auth/meta/callback
```

If that URI is missing, the redirect flow fails with OAuthException 36008 and
only the popup path works.

---

## 3. Create the configuration

**App Dashboard → Facebook Login for Business → Configurations → Create
configuration.**

> ## Known blocker (tested 15 Oct 2026)
>
> **"Create configuration" does not offer a Products step**, on this app, under
> any login variation we could select. Its steps are Name → Login variation →
> Access token → Assets → Permissions, and the Assets list has no *WhatsApp
> accounts* entry. Meta's rule is that selecting products is what makes a
> configuration v4, so a configuration made this way is not v4 and cannot
> onboard a WhatsApp number.
>
> Editing it afterwards does **not** reveal the Products step either — config
> `1448781003477056` was created this way and is unusable. It is inert, so it
> was left in place rather than risking anything.
>
> That leaves a bind. The only template offered is *"WhatsApp Embedded Signup
> Configuration With 60 Expiration Token"*, which produces a proper v4
> configuration **but fixes the token at 60 days**, and expiration cannot be
> changed later. So today you can have Products **or** Never, not both.
>
> **Current decision: keep the existing configuration** (`1008244875575120`).
> It has the Products step, the WhatsApp accounts asset, and the six products
> selected. Its 60-day token expiry is covered by the `token-health` cron, which
> warns at 14, 7, 3 and 1 days — an annoyance with a safety net, which is a far
> better position than a configuration that cannot onboard anyone.
>
> Worth raising with Meta support: ask why the Products step is absent from the
> create flow for this app. If they enable it, redo this procedure and pick
> **Never**.

| Step | Choose | Why |
|---|---|---|
| **Name** | e.g. `WhatsApp Embedded Signup — Never expiry` | Make it obvious which is current; you will have two |
| **Login variation** | **WhatsApp Embedded Signup** | Any other variation has no Products step and is not v4 |
| **Products** | Match the existing configuration | See below |
| **Access token** | **System-user access token** | Required for continuous access to business assets |
| **Token expiration** | **Never** | The whole point of the exercise |
| **Assets** | Accept what the products select | Driven by Products; see the caution below |
| **Permissions** | Accept what the products select | Each needs Advanced Access before live customers are asked |

### Products — match what you already have

Ticking fewer products than the old configuration would quietly remove
capability from new customers. The current set is:

- WhatsApp Cloud API
- Marketing Messages API for WhatsApp
- Click to WhatsApp Ads (CTWA)
- Click to Direct Ads (CTD)
- Conversions API for Business Messaging — Instagram **and** WhatsApp

### Caution on assets

Products pull assets in automatically, and the current set pulls in **Catalogs**
and **Pixels** alongside WhatsApp accounts, Pages, Ad accounts and Instagram
accounts. Meta's own warning is that customers abandon the flow at a selection
screen for an asset they do not recognise, and Catalogs is the example they use.

If the Assets step lets you deselect Catalogs without dropping a product you
need, do. If not, watch completion on the first few onboardings — a second, lean
configuration for non-advertising customers is the escape hatch.

When the flow completes, **copy the Configuration ID.**

---

## 4. Swap it in

```bash
# Local
#   .env                  -> NEXT_PUBLIC_META_CONFIG_ID="<new id>"
# On the VPS
#   /home/talktrackcrm/app/.env.production -> same
```

**It must be a rebuild, not a restart.** `NEXT_PUBLIC_*` values are compiled into
the browser bundle at build time, so a restart keeps serving the old id:

```bash
cd /home/talktrackcrm/app && ./deploy/deploy.sh
```

---

## 5. Verify

Open `/diagnostics/whatsapp` again and compare with step 1.

| Check | Expected |
|---|---|
| **Embedded Signup configuration** | Shows the **new** id. If it still shows the old one, the build did not pick up the env change |
| **Access token valid** | Still green — existing tokens are untouched |
| **Access token lifetime** | Still whatever it was for existing numbers; new connections will read "does not expire" |
| **App subscribed to WABA webhooks** | Still green |
| **Templates readable from WABA** | Still green |

Then do the one test that actually proves it: **connect a number through the new
configuration** — a sandbox account is ideal — and confirm the new connection's
token reads *does not expire*.

---

## What cannot break, and why

| Thing | Safe? | Why |
|---|---|---|
| Existing connections | ✅ | A token is held against the customer's business portfolio and your app, not against a configuration. Replacing the configuration cannot revoke it |
| Existing token lifetimes | ✅ *(and unchanged)* | A token already minted keeps the lifetime it was issued with. A Never configuration does not retroactively extend a 60-day token, and does not shorten a permanent one |
| Webhook delivery | ✅ | Subscriptions are on the WABA, created during onboarding. The configuration plays no part |
| Templates, contacts, conversations | ✅ | Ours, in our database |
| Permissions already granted | ✅ | Attached to the existing token |

The one real consequence: a customer connected under the old configuration still
has whatever token it issued. If that token expires, they reconnect — and because
the app now points at the new configuration, the replacement never expires. The
`token-health` cron is what tells you before it happens.

---

## Rollback

Restore the previous `NEXT_PUBLIC_META_CONFIG_ID` and redeploy. The old
configuration is not deleted by creating a new one, so this is a one-line
reversal. Keep the old configuration until the new one has onboarded a customer
successfully.

---

## Related

- `docs/VPS.md` — "Scheduled jobs (crontab)" covers the `token-health` job that
  warns before a token lapses, and why it exists.
- `lib/meta/embedded-signup.ts` — how finish events map to connection modes, and
  why `sessionInfoVersion` must only be sent on v2/v3.
