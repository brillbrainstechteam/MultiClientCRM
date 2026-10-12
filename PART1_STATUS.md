# Part 1 (Foundation, Templates & Messaging) — status vs. the implementation doc

> Audit date 2026-10-12. Maps each section of "TalkTrack Meta Implementation —
> Part 1" to the codebase. ✅ done · 🟡 partial · ❌ not started. "Build order"
> at the bottom is what I'm implementing now.

## 2. Platform foundation
| § | Item | Status | Notes |
|---|------|--------|-------|
| 2.1 | Don't model everything under one `waba_id` | 🟡 | `WhatsAppAccount` stores wabaId + phoneNumberId per row, but there's no separate Portfolio / MessagingAccount / PhoneNumber graph. Larger refactor — flagged, not auto-started. |
| 2.2 | Capability Registry | ❌ | No per-number capability map. We store qualityRating/messagingTier only. |
| 2.3 | Central webhook infrastructure | ✅ | Phase 1 fan-out: verify → persist raw (`WebhookEvent`) → route by `change.field` → update state → notify → 200 fast. Dedup: messages by `waMessageId`, system events by `notify` dedupeKey. |
| 2.4 | Central outbound API queue (retry/backoff/idempotency/throughput) | ❌ | Sends are direct `fetch`. Larger infra — flagged. |

## 3. Templates
| § | Item | Status | Notes |
|---|------|--------|-------|
| 3.1 | Template repository (fetch/sync, Meta status, quality, filter, manual sync) | ✅ | Live from Meta; Meta status kept separate from CRM state. CRM drafts ❌ (see 3.2). |
| 3.2 | Creation: scratch/clone/library/language | ✅ | scratch, clone, ready-made (starter), create-another-language all work. **Draft (save for later)** ❌. AI gen ❌ (future). |
| 3.3 | Components: header/body/footer/buttons | 🟡 | text/image/video/document headers ✅, body+vars+examples ✅, footer ✅, buttons with **Meta limits enforced** ✅. **Location header** ❌. Full capability-driven rules *service* 🟡 (limits hard-checked, not registry-driven). |
| 3.4 | Central Media Service (upload→Meta id/handle→expiry→attach) | 🟡 | `uploadHeaderSample` (resumable) + storage layer exist; no unified media-id/expiry service for message media. |
| 3.5 | Languages (Meta codes, Hinglish as style) | ✅ | Correct Meta codes + wide list; Hinglish is a style, not a fake locale. Meta-metadata-as-reference 🟡 (list is in code). |
| 3.6 | Three libraries distinguished (TalkTrack / Meta / Yours) | ✅ | Marketing Templates (starter), Template Library (Meta, read-only), Repository (yours). |
| 3.7 | Authentication templates — dedicated composer (OTP/copy-code/one-tap/zero-tap/disclaimer/expiry/TTL) | 🟡 | OTP + disclaimer + expiry supported; one-tap/zero-tap ❌, TTL ❌. |
| 3.8 | Time-to-live | ❌ | Not implemented. |
| 3.9 | Review / rejection / appeal | 🟡 | Status + "Fix & Resubmit" + rejection reason shown; plain-language mapping + appeal flow 🟡. |
| 3.10 | Automatic category changes | 🟡 | Webhook `template_category_update` → notification. Requested/Final/ChangedAt not stored (no template DB). |
| 3.11 | Template quality (🟢🟡🔴⚪) | ✅ | "Send quality" on detail. SME-friendly wording 🟡 (shows High/Med/Low, not "customers responding well"). |
| 3.12 | Template pausing | 🟡 | Webhook → notification; `paused` status shown. pause-until / disable-send / replacement ❌. |
| 3.13 | Template pacing (Sent/Delivered/**Held**/Failed) | ❌ | Campaign shows sent/failed/capped, not "held by WhatsApp". |
| 3.14 | Portfolio pacing | ❌ | — |
| 3.15 | Automatic archival (12-mo, unarchive window) | ❌ | — |
| 3.16 | Template comparison | ⏸ | Phase 2 (defer). |
| 3.17 | Tap-target URL/title override | ❌ | Advanced, capability-gated. |
| 3.18 | Template migration (admin) | ❌ | — |
| 3.19 | Marketing per-user limits (131049) | ✅ | Guardrail in both send paths; recipient marked "capped", not retried. |

## 4. Messaging / Inbox
| § | Item | Status | Notes |
|---|------|--------|-------|
| 4.0 | Media types in inbox (image/video/doc/audio/location/contacts) | 🟡 | Inbound stored; rich outbound media 🟡. |
| 4.1 | Contextual replies (quote via Meta `context.message_id`) | 🟡 | UI picks a message to reply to; `/api/wa/send` does **not** send `context` yet. |
| 4.2 | Mark as read (blue ticks) | ✅ | On conversation open. Org-level auto-read setting ❌. |
| 4.3 | Typing indicators | ✅ | Debounced on real typing. |
| 4.4 | Link previews (preview on/off) | ❌ | Not implemented. |
| 4.5 | Conversational components / ice breakers | ❌ | Not implemented. |
| 4.6 | 24-hour messaging window awareness | 🟡 | Composer has `responseWindow.canSendFreeform`; verify it's driven by last inbound. |
| 4.7 | Messaging limits (dynamic, portfolio-aware, "X/Y used") | 🟡 | tier/quality stored + webhook-updated; dashboard "X/Y used" ❌. |
| 4.8 | Throughput (auto-throttle) | ❌ | No queue. |

## Build order (now → later)
**Building now (feasible, high-value Part-1 gaps):**
1. Contextual replies (4.1) — complete UI → `context.message_id`.
2. Link previews (4.4) — `preview_url` toggle, hidden behind plain wording.
3. Conversational components / ice breakers (4.5) — per-number setup + API.
4. Template TTL (3.8) + authentication expiry control (3.7).
5. Template drafts / "Save for later" (3.2) — `CrmTemplateDraft` + Drafts view.
6. SME-friendly quality wording (3.11); auto-read org setting (4.2).

**Flagged — larger, need your go-ahead before I refactor:**
- 2.1 account-model decoupling, 2.2 capability registry, 2.4 outbound queue / 4.8 throughput (infra).
- 3.13/3.14 pacing surfacing, 3.15 archival, 3.18 migration, 3.17 tap-target (each needs Meta fields + often a template DB).
