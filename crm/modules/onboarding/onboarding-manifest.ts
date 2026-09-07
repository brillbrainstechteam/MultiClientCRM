/**
 * Canonical Onboarding screen manifest (ONBOARDING_GENERATION_SPEC.md +
 * CODE_FIRST_ADAPTER.md). Every C/B/N/H/P id maps to exactly one entry so the
 * final source-coverage audit (Batch 7) has one place to check against.
 */

export interface OnboardingScreen {
  id: string;
  title: string;
  route: string;
  surface: 'page' | 'overlay' | 'settings' | 'provider';
  purpose: string;
  batch: number;
}

export const onboardingScreens: OnboardingScreen[] = [
  { id: 'ONB-S01/C01', title: 'Setup Home', route: '/setup', surface: 'page', purpose: 'Resume, progress, blockers, next step.', batch: 1 },
  { id: 'C02', title: 'Business & Number — Basics', route: '/setup/connect?stage=number&step=basics', surface: 'page', purpose: 'Business name, country, number, primary use, multi-location.', batch: 1 },
  { id: 'C03', title: 'Organisation (optional)', route: '/setup/connect?stage=number&step=organisation', surface: 'page', purpose: 'Main Business default, add location/unit, department preset.', batch: 1 },
  { id: 'C04', title: 'Number Readiness', route: '/setup/connect?stage=number&step=readiness', surface: 'page', purpose: 'Progressive plain-language technical audit questionnaire.', batch: 1 },
  { id: 'C05', title: 'Connection Strategy', route: '/setup/connect?stage=strategy', surface: 'page', purpose: 'Recommended + eligible alternative connection strategies.', batch: 1 },
  { id: 'C06', title: 'Compare Options', route: '/setup/connect?stage=strategy&drawer=compare', surface: 'overlay', purpose: 'Large modal comparing every strategy.', batch: 1 },
  { id: 'C07', title: 'Coexistence acknowledgement', route: '/setup/connect?stage=strategy&strategy=coexistence&step=acknowledge', surface: 'page', purpose: 'What stays in Business App vs CRM, limitations, duplicate-reply risk.', batch: 1 },
  { id: 'C08', title: 'Migration', route: '/setup/connect?stage=strategy&strategy=migrate-business-app|migrate-provider', surface: 'page', purpose: 'Business App→Platform and existing API/provider→new setup branches.', batch: 1 },
  { id: 'C09', title: 'New Number', route: '/setup/connect?stage=strategy&strategy=new-number', surface: 'page', purpose: 'Purpose, business/location, handling team, old-number status.', batch: 1 },
  { id: 'C10', title: 'Meta Preflight', route: '/setup/connect?stage=meta&step=preflight', surface: 'page', purpose: 'Authorised account, business access, verification access, ack complete.', batch: 2 },
  { id: 'META-EXT', title: 'Meta external placeholder', route: '/setup/connect?stage=meta&step=external', surface: 'page', purpose: 'Hosted Embedded Signup placeholder — CRM does not reproduce Meta UI.', batch: 2 },
  { id: 'C11', title: 'Meta Return', route: '/setup/connect?stage=meta&step=return&state=completed|cancelled|error|permission-missing', surface: 'page', purpose: 'Completed/cancelled/error/permission-missing/assets-received states.', batch: 2 },
  { id: 'C12', title: 'Review Connected Assets', route: '/setup/connect?stage=meta&step=review', surface: 'page', purpose: 'Business, WABA context, number/display name, strategy, mapping.', batch: 2 },
  { id: 'C13', title: 'Verification', route: '/setup/connect?stage=meta&step=verification&state=required|complete', surface: 'page', purpose: 'Phone ownership, Cloud API registration, two-step PIN — conditional.', batch: 2 },
  { id: 'C14', title: 'Connection Setup Progress', route: '/setup/connect?stage=meta&step=progress', surface: 'page', purpose: 'Business-language progress + Technical Details accordion.', batch: 2 },
  { id: 'C15', title: 'Setup Issue', route: '/setup/connect?stage=meta&step=progress&drawer=issue&issue=webhook', surface: 'overlay', purpose: 'What happened / what to do / who can fix it.', batch: 2 },
  { id: 'B01', title: 'Plan Activation', route: '/setup/connect?stage=activate&step=plan', surface: 'page', purpose: 'Plan, cycle, included users/numbers, add-on policy, amount, tax.', batch: 3 },
  { id: 'B02', title: 'Messaging Funding', route: '/setup/connect?stage=activate&step=funding&payer=provider_wallet|direct_meta', surface: 'page', purpose: 'Paid/promo balance, optional top-up/auto top-up, or Meta-billed state.', batch: 3 },
  { id: 'B03', title: 'Payment Result', route: '/setup/connect?stage=activate&step=payment&state=pending|success|failed', surface: 'page', purpose: 'Pending/success/failed, idempotent-safe retry.', batch: 3 },
  { id: 'C16', title: 'Who Handles This Number?', route: '/setup/connect?stage=activate&step=team', surface: 'page', purpose: 'Manager/owner, inbox visibility, advanced permissions deep link.', batch: 4 },
  { id: 'C19/ONB-S03', title: 'Readiness & Go Live', route: '/setup/ready', surface: 'page', purpose: 'Connection/Inbox/Outbound/Billing/History independent readiness.', batch: 4 },
  { id: 'C17', title: 'History (optional card)', route: '/setup/ready?card=history', surface: 'page', purpose: 'Optional import/reference/manual/do-later choice.', batch: 4 },
  { id: 'C18', title: 'Rollout guidance', route: '/setup/ready?card=rollout', surface: 'page', purpose: 'Non-blocking rollout guidance cards.', batch: 4 },
  { id: 'ONB-S04/N01', title: 'WhatsApp Number Registry', route: '/settings/whatsapp', surface: 'settings', purpose: 'Ongoing list of numbers, purpose, mapping, connection, quality, actions.', batch: 5 },
  { id: 'ONB-S05/N02', title: 'Number Detail', route: '/settings/whatsapp/numbers/:numberId', surface: 'settings', purpose: 'Overview/Connection/Mapping/History/Usage/Activity tabs.', batch: 5 },
  { id: 'N03', title: 'Add Number', route: '/settings/whatsapp/add-number', surface: 'settings', purpose: 'Reuses Guided Setup with mode=add-number, skipping known basics.', batch: 5 },
  { id: 'N04', title: 'Number Mapping', route: '/settings/whatsapp/numbers/:numberId?modal=mapping', surface: 'overlay', purpose: 'Business/location, department, team, primary manager.', batch: 5 },
  { id: 'N05', title: 'Stop / Disconnect / Move', route: '/settings/whatsapp/numbers/:numberId?modal=number-action&intent=…', surface: 'overlay', purpose: 'Fix / pause / stop-in-CRM / deregister / move intents.', batch: 5 },
  { id: 'N06', title: 'Plan vs Meta capacity', route: '/settings/whatsapp?state=plan-limit|meta-capacity-limit', surface: 'settings', purpose: 'Independent plan-allowance and Meta-capacity blockers.', batch: 5 },
  { id: 'H01', title: 'Historical Data Centre', route: '/settings/history', surface: 'settings', purpose: 'Per-number import/reference/live status.', batch: 6 },
  { id: 'H02', title: 'History Import Wizard', route: '/settings/history?wizard=import&step=upload|validate|map|review|result', surface: 'overlay', purpose: 'Upload, validate, map, review, result (incl. partial).', batch: 6 },
  { id: 'H03', title: 'Manual History Summary', route: '/settings/history?drawer=manual-summary', surface: 'overlay', purpose: 'Quotation/order/payment/follow-up context note.', batch: 6 },
  { id: 'P01', title: 'Meta Platform Readiness', route: '/provider?tab=platform', surface: 'provider', purpose: 'App review, permissions, embedded-signup readiness, production test.', batch: 6 },
  { id: 'P02', title: 'Client Onboarding Monitor', route: '/provider?tab=clients', surface: 'provider', purpose: 'Tenant, first-number state, step, blocker, billing state.', batch: 6 },
  { id: 'P03', title: 'Client Connection Support', route: '/provider/clients/:tenantId?tab=connection', surface: 'provider', purpose: 'Technical IDs, registration, webhook, recent events, safe retry.', batch: 6 },
  { id: 'P04', title: 'Client Billing / Payer Health', route: '/provider/clients/:tenantId?tab=billing', surface: 'provider', purpose: 'Payer mode, credit line/attachment, currency, wallet risk, audit.', batch: 6 },
];
