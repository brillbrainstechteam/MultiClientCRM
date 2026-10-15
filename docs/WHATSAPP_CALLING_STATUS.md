# WhatsApp Calling — what is built, what is not

Measured against *TalkTrack Meta Implementation — Part 2 — Calling, Groups &
Catalogs*, section 5.

Every API shape used here was taken from Meta's own documentation
(`call-settings`, `user-initiated-calls`, `business-initiated-calls`,
`user-call-permissions`), not inferred from the brief or from third-party
mirrors.

## Where this started

Before this work, `calls` was a single line in the webhook router that
incremented a counter and threw the event away. There was no call object, no
permission model, no settings, and nothing on any screen. The existing
**Calling & Visits** module is a different thing entirely — provider/PSTN
outbound calling with call lists and dispositions — and it is untouched.

## Built

| § | Item | State |
|---|---|---|
| 5.1 | Calling settings per number, in SME language | **Done** — `Settings → WhatsApp → Calling` |
| 5.1 | Business hours, timezone, holiday exceptions | **Done**, evaluated in the shop's own timezone |
| 5.1 | Enable/disable, call icon, inbound/outbound toggles | **Done**, pushed to Meta before the UI moves |
| 5.2 | User-initiated calls: webhook → Call object → state machine → log | **Done** (signalling; media is the gap — see below) |
| 5.2 | The eight call states from the spec | **Done** |
| 5.3 | Business-initiated calls gated on permission | **Done**, re-checked against Meta at call time |
| 5.3 | Permission storage: type, granted/expires/revoked, source | **Done** |
| 5.4 | SME-friendly permission request + rate limiting | **Done** — one per 24h, matching Meta's own limit |
| 5.5 | Region/eligibility gating via a capability registry | **Already existed**, now actually consumed |
| 5.6 | Permission request via an approved template (outside the 24h window) | **Done** |
| 5.7 | Call deep links with attribution payload | **Done** — `callDeepLink()` |
| 5.8 | Recording: setting, consent text, retention, off by default | **Settings done**; media retrieval not built |
| 5.9 | Transcription: setting and storage | **Schema + setting**; no provider wired |
| 5.10 | Missed calls land on the customer timeline and start the SLA clock | **Done** |
| 5.11 | Calling restriction / quality alerts | **Done** — `/api/cron/calling-health`, daily |

Supporting work: four new tables, a signalling audit trail, and 39 tests
covering business hours across timezones, the Meta settings mapping and the
call state machine.

## Not built, and why

**WebRTC/SIP media (§5.2).** The server never touches audio, by design — it
passes SDP through and the media runs browser-to-Meta. What is missing is the
agent-side peer connection that produces that SDP and plays the audio. That is
a front-end piece of real size (microphone permissions, device selection, ICE,
hold/mute, reconnection) and it cannot be written blind: it needs the calling
sandbox to test against. The signalling it will sit on is complete and tested.

**Recording retrieval (§5.8) and transcription (§5.9).** The settings, the
consent gate and the storage columns exist. Fetching the recording media and
producing a transcript both depend on call events we have never received, so
building them now would be writing against a guessed payload.

**App review (§5.12) and sandbox (§5.13).** Process, not code.

## What has to happen before this works end to end

1. **Subscribe the `calls` webhook field** in the Meta app dashboard. Nothing
   above receives anything until this is on.
2. **Calling needs a 2,000+ daily messaging tier.** The capability registry
   already reports this; the BrillBrains number should be checked against it.
3. **Request Calling API access** for the app — it is not on by default.
4. **Schedule the health cron** beside the existing token-health one:
   ```
   curl -fsS -H "x-cron-secret: $CRON_SECRET" https://talktrackcrm.brillbrainsconsultants.com/api/cron/calling-health
   ```

Until (1) and (3) are done, the settings screen will save locally and Meta will
reject the push — which is the correct, visible failure rather than a silent one.

## Sections 6 and 7

Untouched. Groups (§6) is counter-only in the webhook router and the capability
registry already gates it off as needing an Official Business Account. Catalogs
(§7) has a local `CrmCatalogueItem` table with no Meta catalog connection. Both
are their own builds, comparable in size to this one.
