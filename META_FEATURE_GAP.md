# Meta WhatsApp Platform — Feature Gap Analysis

> Audit date: 2026-10-10. Cross-references the Meta WhatsApp Business Platform docs
> (templates, messaging, calling, groups, catalogs, embedded signup, coexistence)
> against the TalkTrack codebase. Priority is scored for the **jewellery B2B SME**
> use case (BrillBrains → retail jewellers).
>
> Legend: ✅ built · 🟡 partial · ❌ missing · 🔺 HIGH · ➖ MED · 🔻 LOW priority

---

## 0. How the webhook gap cascades

The single biggest structural gap: `app/api/webhooks/whatsapp/route.ts` → `lib/whatsapp/ingest.ts`
only processes **two** webhook fields — `messages` and `statuses`. Everything below that
depends on a webhook field we don't subscribe to or parse is therefore invisible to the app:

| Webhook field | What it carries | Handled? |
|---|---|---|
| `messages` | inbound messages | ✅ |
| `statuses` | message delivery/read status | ✅ |
| `message_template_status_update` | template approved / rejected / **paused** / disabled | ❌ |
| `template_category_update` | Meta re-categorised your template | ❌ |
| `account_update` | quality/limit tier changes, misuse warnings, **coexistence offboard/reconnect** | ❌ |
| `account_alerts` | scaling eligibility messages | ❌ |
| `calls` | all WhatsApp Calling events | ❌ |
| `group_*` (4 fields) | group lifecycle/participants/settings/status | ❌ |
| `smb_app_state_sync` / `history` | coexistence chat history sync | ❌ |

**Fixing the ingest router to fan out by `change.field` is the prerequisite for ~60% of
the gaps in this document.** It's a small, high-leverage change.

---

## 1. Templates

### 1.1 Creation & components (`/overview`, `/components`)
| Capability | Status | Notes |
|---|---|---|
| Body + variables, footer, text header | ✅ | |
| Buttons: quick-reply, URL, phone, copy-code | ✅ | |
| **Image/video/document header** (resumable upload) | ✅ | just shipped (`lib/meta/upload.ts`) |
| Authentication OTP template | ✅ | `toMetaTemplate` |
| Carousel / catalogue / LTO / flow / MPM / coupon components | ❌ 🔻 | removed from composer (were dead-ends). Carousel + MPM relevant later for jewellery |
| Location header | ❌ 🔻 | |

### 1.2 Template Library (`/template-library`) — 🔺 **HIGH / quick win**
| Capability | Status | Notes |
|---|---|---|
| Browse Meta's pre-written templates `GET /message_template_library` | ❌ | filter by topic/usecase/industry/language/name |
| Create from library `POST …/message_templates` with `library_template_name` | ❌ | **returns `APPROVED` immediately** — no review wait |
| Library button inputs (`library_template_button_inputs`) | ❌ | |
> **Why it matters:** library templates are **instantly approved** and exist in **many languages**.
> This is the single best answer to "make it low-effort for SMEs" and to the multilingual
> library ask from the previous turn — the client picks a use case + language and gets an
> approved template with zero drafting and zero review wait.

### 1.3 Supported languages (`/supported-languages`)
| Capability | Status | Notes |
|---|---|---|
| Language picker in composer | 🟡 | only 7 Indian locales; Meta supports ~75+ |
| Submit same template across N languages under one family | ❌ ➖ | "author once → translate → submit per locale" (ties to the LLM-translation proposal) |

### 1.4 Categorization (`/template-categorization`) — 🔺 HIGH
| Capability | Status | Notes |
|---|---|---|
| Pick category at create | ✅ | |
| Handle `template_category_update` webhook | ❌ | Meta silently moves utility→marketing (changes your **cost**) |
| Surface `correct_category` vs `category` mismatch | ❌ | API field available on templates endpoint |
| Handle `account_update` misuse/restriction (`UTILITY_TEMPLATE_ABUSE`…) | ❌ | escalating enforcement; must warn admins |

### 1.5 Review, quality, pausing, pacing
| Page | Capability | Status | Notes |
|---|---|---|---|
| `/template-review` | live status read | ✅ | `templates/route.ts` reads from Graph |
| | real-time status via `message_template_status_update` | ❌ ➖ | currently only on manual refresh |
| `/template-quality` | per-template quality score (GREEN/YELLOW/RED) | ❌ ➖ | not surfaced; drives pausing |
| `/template-pausing` | handle paused/disabled templates | ❌ ➖ | low-quality templates get paused; we don't detect |
| `/template-pacing` | new marketing templates are trial-sent to a small audience first | ❌ 🔻 | informational; affects expected reach |
| `/portfolio-pacing` | portfolio-level send pacing | ❌ 🔻 | informational |

### 1.6 Template management / lifecycle
| Page | Capability | Status | Notes |
|---|---|---|---|
| `/template-management` | **edit** an approved template via API | ❌ ➖ | no edit endpoint wired |
| | **delete** a template via API | ❌ ➖ | |
| `/template-archival` | archive/unarchive | 🟡 🔻 | `crmState=archived` is CRM-local only, not Meta |
| `/template-migration` | migrate templates between WABAs | ❌ 🔻 | only for re-platforming |
| `/time-to-live` | custom message TTL per template | ❌ ➖ | useful for OTP/auth and time-boxed offers |
| `/tap-target-url-title-override` | override URL button title/preview | ❌ 🔻 | niche |
| `/template-comparison` | (doc concept, not an API) | n/a | |
| `/template-media` | resumable upload of header sample | ✅ | just shipped |

---

## 2. Messaging features

| Page | Capability | Status | Priority | Notes |
|---|---|---|---|---|
| `/messaging-limits` | tier (250→2k→10k→100k→∞) awareness | 🟡 | 🔺 | number registry shows quality/tier; no automatic-scaling or `account_alerts` handling |
| `/upcoming-messaging-limits-changes` | track upcoming changes | ❌ | 🔻 | informational |
| `/marketing-templates/per-user-limits` | handle **error 131049** (marketing frequency cap) | ❌ | 🔺 | send loop must catch 131049, stop retrying <24h, report reduced reach |
| `/business-phone-numbers/media` | upload/download media for sending & inbound | 🟡 | ➖ | inbound stored; outbound media send path thin |
| `/messages/mark-message-as-read` | mark inbound read (blue ticks) + typing | ❌ | 🔺 | cheap UX win; expected by users |
| `/messages/contextual-replies` | reply quoting a specific message | ❌ | ➖ | improves thread clarity |
| `/typing-indicators` | show "typing…" to the user | ❌ | ➖ | pairs with mark-as-read |
| `/link-previews` | rich link previews in free-form messages | ❌ | 🔻 | |
| `/throughput` | messages-per-second capacity | n/a | 🔻 | informational (80–1000 mps) |

---

## 3. Business phone numbers

| Page | Capability | Status | Priority | Notes |
|---|---|---|---|---|
| `/registration` | register number for Cloud API | ✅ | | `lib/meta/finalize.ts` |
| `/two-step-verification` | set/manage 2FA PIN | ✅ | | `PinPrompt` + register |
| `/conversational-components` | ice-breakers (conversation starters) + commands | ❌ | ➖ | good SME onboarding touch; set once per number |

---

## 4. WhatsApp Calling — ❌ entirely unbuilt (see `/calling/*`)

> **Important:** `CrmCallLog` + `CrmTelephonyConnection` in the schema are for a **third-party
> dialer** (Exotel/Knowlarity) — unrelated to WhatsApp Calling. WhatsApp Business Calling is
> a separate, VoIP-over-WhatsApp feature and is **not started**.

### 4.1 What Meta's Calling API requires
- **Signaling** (buildable in REST): `POST /<PNID>/settings` (call hours, icon, callback perm, SIP),
  `POST /<PNID>/calls` with `action: connect|pre_accept|accept|reject|terminate`,
  `GET /<PNID>/call_permissions`.
- **Webhook** (`calls` field): `connect` (SDP answer), `call_created` (SIP), call status
  `RINGING/ACCEPTED/REJECTED`, `terminate` (duration), and `call_permission_reply` on `messages`.
- **Media** (the hard part): **WebRTC** — ICE + DTLS + SRTP, Opus/G722/PCMU/PCMA, trickle ICE,
  `setup:actpass`/`active`, pre-accept/accept within ~30–60s, media only after 200 OK.
  Alternative: **SIP over TLS** (then the `calls` webhook + REST call actions are *not* used).
- **Prereqs:** number on Cloud API (not the Business app); `whatsapp_business_messaging`;
  **daily limit ≥ 2,000** unique recipients (test/sandbox exempt); calling enabled on the number.
- **Business-initiated** needs **user call permission** first (request message/template, or
  `callback_permission_status`); missing permission → error `138006`. Prod cap: 1 permission/day,
  2/week per user. Not available for business numbers in US/CA/EG/VN/NG.
- **Pricing:** billed in **6-second pulses**, rate by destination + monthly volume tier; INR rate
  card effective 2026-04-01; user-initiated calls are free; permission messages billed as normal.

### 4.2 Page-by-page
| Page | Needs |
|---|---|
| `/calling` (overview) | capability model, prereqs |
| `/call-settings` | `POST /settings` — call hours, icon visibility, callback permission, SIP servers |
| `/business-initiated-calls` | permission request flow + `connect` + SDP offer |
| `/user-call-permissions` | `GET /call_permissions`, `call_permission_reply` webhook, expiry |
| `/user-initiated-calls` | inbound call webhook + accept/reject/terminate |
| `/call-recording` | record streams (your media server; Meta doesn't store audio) |
| `/call-transcription` | transcribe recording (external STT, e.g. your Gemini/OpenAI) |
| `/integration-examples`, `/reference` | endpoint/field contracts |
| `/sandbox` | Tech-Partner sandbox for testing without the 2k limit |
| `/troubleshooting`, `/app-review-guidelines`, `/pricing`, `/faq` | ops |

### 4.3 Reality check
The **signaling + settings + permissions + webhook + call logging** layer is implementable and
testable in the sandbox **now**. The **audio media path (WebRTC/SIP) requires media-server
infrastructure** (STUN/TURN, an SRTP endpoint) that can't be stood up or verified blind — that's
a Phase 2 with an infra decision (self-host WebRTC vs a SIP/BYOC provider).
**Recommended split:** Phase 1 = signaling/settings/permissions/webhook/logging (foundation,
sandbox-testable). Phase 2 = media + recording + transcription.

---

## 5. Groups (`/groups/*`) — ❌ · 🔻 low for B2B
- Requires the business be an **Official Business Account (OBA)**.
- Create group, invite-link (via an approved **group invite link template** from the library),
  send once a participant joins; webhooks `group_lifecycle_update`, `group_participants_update`,
  `group_settings_update`, `group_status_update`.
- **Assessment:** B2B jeweller relationships are 1:1; broadcast lists/campaigns already cover reach.
  Defer unless a clear use case (e.g. a regional reseller group) appears.

## 6. Catalogs & Commerce (`/catalogs/*`) — 🟡 local only · 🔺 HIGH for jewellery
| Capability | Status | Notes |
|---|---|---|
| Local catalogue (`CrmCatalogueItem`, jewellery fields) | ✅ | rich: purity, gross/net wt, karat, pricing modes |
| **Sync to a Meta catalog** (Commerce API / `product_items`) | ❌ | prerequisite for everything below |
| Commerce settings per number (cart on/off, visibility) | ❌ | `/set-commerce-settings` |
| **Single-product / multi-product (≤30) / catalog / carousel** messages | ❌ | jewellery is product-heavy — high value |
| Receive cart/order webhooks | ❌ | `/receive-responses` |
| India **Business Compliance Information** API | ❌ | required for commerce in India |
> **Assessment:** the local catalogue is the hard part and it's done. Wiring it to a Meta catalog
> + single/multi-product messages would let a jeweller send live stock into a chat — a strong,
> differentiated feature. Cart/checkout can stay light (B2B orders are negotiated).

## 7. Embedded Signup & Coexistence (`/embedded-signup/*`)
| Capability | Status | Priority | Notes |
|---|---|---|---|
| Core ES onboarding (FB Login for Business, code→token, register, subscribe) | ✅ | | `app/onboarding` + `app/api/auth/meta/*` |
| **ES v2 → v4 migration** | ❌ | ➖ | **v2 deprecates 2026-10-15** — must migrate before |
| Pre-filled data / website-optional / app-only-install / bypass-phone | ❌ | 🔻 | optional friction-reducers |
| Hosted ES / partner-initiated WABA creation | ❌ | 🔻 | partner-model dependent |
| Onboarding limits (10/7d → 200 after review) handling | 🟡 | ➖ | |
| **Coexistence** (Business App + Cloud API on one number) | 🟡 | ➖ | onboarding path exists; see below |
| Handle `ACCOUNT_OFFBOARDED` / `ACCOUNT_RECONNECTED` (`account_update`) | ❌ | ➖ | pause Cloud API sends during reonboard, resume after |
| Chat-history / `smb_app_state_sync` on coexistence | ❌ | 🔻 | |
> **Coexistence matters for SMEs**: most small jewellers already run the WhatsApp Business *app*.
> Coexistence lets them keep the app **and** use TalkTrack on the same number — the lowest-friction
> onboarding story. Worth making a first-class, tested path, including the offboard/reconnect webhooks.

## 8. Solution / Tech Providers (`/solution-providers/*`)
- Tech Provider vs Solution Partner (shared credit line), measurement partners, upgrade path.
- **Assessment:** a business/commercial decision (BrillBrains' partner status), not an app feature.
  Affects billing model + which ES token flow applies. No code gap per se; revisit with the
  partnership model.

---

## 9. Making it easiest for SMEs (synthesis)
Ranked by effort-saved ÷ build-cost:
1. **Template Library integration** — instant-approved, multilingual templates; near-zero drafting. 🔺
2. **Coexistence as a first-class path** — keep the Business App, add TalkTrack on the same number. 🔺
3. **Deliverability guardrails** — handle 131049 (marketing cap), `account_update` quality/limit +
   `template_category_update`/`message_template_status_update` webhooks so rejections, pauses and
   recategorisations surface instead of silently failing. 🔺
4. **Conversation UX** — mark-as-read (blue ticks) + typing indicators. ➖
5. **Catalog → Meta product messages** — send live jewellery stock into chat. 🔺 (bigger build)
6. **Ice-breakers / conversational components** — pre-set conversation starters per number. ➖
7. **ES v4 migration** before 2026-10-15. ➖ (deadline-driven)

---

## 10. Suggested build order
1. **Webhook fan-out** by `change.field` (unblocks §1.4, §1.5, §2, §4, §7). Small.
2. **Template Library** browse + create-from-library. Small, high SME value.
3. **Deliverability guardrails** (131049 + `account_update` + template webhooks). Small–medium.
4. **Mark-as-read + typing indicators.** Small.
5. **Calling Phase 1** (settings/permissions/webhook/logging). Medium.
6. **Catalog → Meta** (sync + single/multi-product messages). Medium.
7. **Coexistence** offboard/reconnect handling + tested path. Medium.
8. **Calling Phase 2** (WebRTC media + recording + transcription). Large, infra decision.
9. ES v4 migration (by 2026-10-15); conversational components; TTL.
