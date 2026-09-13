import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import { graphBase, metaConfig } from './config';
import { ingestWebhookPayload } from '@/lib/whatsapp/ingest';
import { markTokenInvalid } from './account';

/**
 * End-to-end health check for a tenant's WhatsApp connection.
 *
 * Every step in the chain (token → WABA subscription → templates → webhook
 * delivery → stored conversations) is probed independently, so a failure points
 * at the exact link instead of surfacing as a blank screen in the CRM.
 */

export type CheckStatus = 'ok' | 'warn' | 'fail' | 'skip';

export interface Check {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
  /** What the operator should do when this check is not ok. */
  fix?: string;
}

export interface Diagnostics {
  checks: Check[];
  callbackUrl: string;
  verifyToken: string;
  wabaId: string | null;
}

interface GraphError {
  error?: { message?: string; type?: string; code?: number; error_subcode?: number };
}

async function graph<T>(path: string, token: string): Promise<{ ok: boolean; json: T & GraphError }> {
  const res = await fetch(`${graphBase()}/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const json = (await res.json().catch(() => ({}))) as T & GraphError;
  return { ok: res.ok, json };
}

const graphError = (json: GraphError): string =>
  json.error?.message ? `${json.error.message} (code ${json.error.code ?? '?'})` : 'Unknown Graph error.';

export async function runWhatsAppDiagnostics(tenantId: string, origin: string): Promise<Diagnostics> {
  const checks: Check[] = [];
  const callbackUrl = `${origin.replace(/\/+$/, '')}/api/webhooks/whatsapp`;

  // 1. Is a number connected at all?
  const account = await prisma.whatsAppAccount.findFirst({
    where: { tenantId, status: 'connected' },
    orderBy: { connectedAt: 'desc' },
  });

  if (!account) {
    checks.push({
      id: 'account',
      label: 'WhatsApp number connected',
      status: 'fail',
      detail: 'No connected number for this workspace.',
      fix: 'Run Embedded Signup from /onboarding.',
    });
    return { checks, callbackUrl, verifyToken: metaConfig.webhookVerifyToken, wabaId: null };
  }

  checks.push({
    id: 'account',
    label: 'WhatsApp number connected',
    status: 'ok',
    detail: `${account.displayPhone ?? 'number'} · WABA ${account.wabaId ?? '—'} · phone id ${account.phoneNumberId ?? '—'}`,
  });

  // 2. Is the stored token still usable, and does it carry the right scopes?
  let token = '';
  try {
    token = account.accessToken ? decrypt(account.accessToken) : '';
  } catch {
    token = '';
  }

  if (!token) {
    checks.push({
      id: 'token',
      label: 'Access token readable',
      status: 'fail',
      detail: 'Stored token is missing or could not be decrypted (SESSION_SECRET may have changed).',
      fix: 'Reconnect from /onboarding to store a fresh token.',
    });
    return { checks, callbackUrl, verifyToken: metaConfig.webhookVerifyToken, wabaId: account.wabaId };
  }

  const debugUrl = new URL(`${graphBase()}/debug_token`);
  debugUrl.searchParams.set('input_token', token);
  debugUrl.searchParams.set('access_token', `${metaConfig.appId}|${metaConfig.appSecret}`);
  const debugRes = await fetch(debugUrl, { cache: 'no-store' });
  const debugJson = (await debugRes.json().catch(() => ({}))) as {
    data?: {
      is_valid?: boolean;
      expires_at?: number;
      scopes?: string[];
      granular_scopes?: Array<{ scope?: string; target_ids?: string[] }>;
    };
  } & GraphError;

  const tokenData = debugJson.data;
  if (!debugRes.ok || !tokenData?.is_valid) {
    // Repair the row here too, so simply opening this page un-sticks a
    // workspace whose integration was revoked on Facebook.
    await markTokenInvalid(account.id, debugRes.ok ? 'Meta reports the token is no longer valid.' : graphError(debugJson));
    checks.push({
      id: 'token',
      label: 'Access token valid',
      status: 'fail',
      detail: `${debugRes.ok ? 'Meta reports this token is no longer valid.' : graphError(debugJson)} Marked this number as needing a reconnect.`,
      fix: 'Reconnect from /onboarding — sign-in will now take you through Embedded Signup again.',
    });
  } else {
    const expiry = tokenData.expires_at ? new Date(tokenData.expires_at * 1000) : null;
    const neverExpires = !tokenData.expires_at;
    checks.push({
      id: 'token',
      label: 'Access token valid',
      status: 'ok',
      detail: neverExpires
        ? 'Valid, does not expire (system user token).'
        : `Valid until ${expiry?.toISOString().slice(0, 16).replace('T', ' ')} UTC.`,
    });

    const granular = tokenData.granular_scopes ?? [];
    const scopeNames = new Set([...(tokenData.scopes ?? []), ...granular.map((g) => g.scope ?? '')]);
    for (const needed of ['whatsapp_business_management', 'whatsapp_business_messaging']) {
      const has = scopeNames.has(needed);
      const targets = granular.find((g) => g.scope === needed)?.target_ids ?? [];
      checks.push({
        id: `scope_${needed}`,
        label: `Permission ${needed}`,
        status: has ? 'ok' : 'fail',
        detail: has
          ? `Granted${targets.length ? ` for WABA ${targets.join(', ')}` : ''}.`
          : 'Not granted on this token.',
        fix: has ? undefined : 'Reconnect and make sure the permission is ticked in the Meta consent screen.',
      });
    }
  }

  // 3. Is our app subscribed to the WABA? Without this Meta never calls us.
  if (account.wabaId) {
    const subs = await graph<{ data?: Array<{ whatsapp_business_api_data?: { id?: string; name?: string } }> }>(
      `${account.wabaId}/subscribed_apps`,
      token,
    );
    if (!subs.ok) {
      checks.push({
        id: 'subscription',
        label: 'App subscribed to WABA webhooks',
        status: 'fail',
        detail: graphError(subs.json),
        fix: 'Use "Re-subscribe webhooks" below.',
      });
    } else {
      const apps = subs.json.data ?? [];
      const mine = apps.find((a) => a.whatsapp_business_api_data?.id === metaConfig.appId);
      checks.push({
        id: 'subscription',
        label: 'App subscribed to WABA webhooks',
        status: mine ? 'ok' : 'fail',
        detail: mine
          ? `Subscribed as "${mine.whatsapp_business_api_data?.name ?? metaConfig.appId}".`
          : apps.length
            ? `WABA is subscribed to other apps only (${apps.map((a) => a.whatsapp_business_api_data?.name).join(', ')}).`
            : 'No app is subscribed to this WABA.',
        fix: mine ? undefined : 'Use "Re-subscribe webhooks" below, then resend a test message.',
      });
    }

    // 4. Templates — the whatsapp_business_management read the CRM depends on.
    const tpl = await graph<{ data?: Array<{ name?: string; status?: string }> }>(
      `${account.wabaId}/message_templates?limit=200&fields=name,status`,
      token,
    );
    if (!tpl.ok) {
      checks.push({
        id: 'templates',
        label: 'Templates readable from WABA',
        status: 'fail',
        detail: graphError(tpl.json),
        fix: 'Usually a token/permission problem — reconnect from /onboarding.',
      });
    } else {
      const rows = tpl.json.data ?? [];
      const byStatus = rows.reduce<Record<string, number>>((acc, r) => {
        const k = (r.status ?? 'unknown').toLowerCase();
        acc[k] = (acc[k] ?? 0) + 1;
        return acc;
      }, {});
      checks.push({
        id: 'templates',
        label: 'Templates readable from WABA',
        status: rows.length ? 'ok' : 'warn',
        detail: rows.length
          ? `${rows.length} template(s): ${Object.entries(byStatus).map(([k, v]) => `${v} ${k}`).join(', ')} — ${rows.slice(0, 6).map((r) => r.name).join(', ')}`
          : 'Meta returned zero templates for this WABA.',
        fix: rows.length ? undefined : 'Create a template in Meta → WhatsApp → Manage templates, then reload /crm/templates.',
      });
    }
  }

  // 5. Has Meta actually delivered anything to our endpoint?
  const eventCount = await prisma.webhookEvent.count();
  const recent = await prisma.webhookEvent.findMany({
    where: { phoneNumberId: account.phoneNumberId },
    orderBy: { receivedAt: 'desc' },
    take: 5,
    select: { receivedAt: true, field: true },
  });
  checks.push({
    id: 'webhook_delivery',
    label: 'Webhook events received by this app',
    status: recent.length ? 'ok' : 'fail',
    detail: recent.length
      ? `${recent.length} recent event(s) for this number (${eventCount} total). Latest: ${recent[0].field ?? 'unknown'} at ${recent[0].receivedAt.toISOString().slice(0, 19).replace('T', ' ')} UTC.`
      : `Nothing has ever reached ${callbackUrl} for this number (${eventCount} event(s) stored overall).`,
    fix: recent.length
      ? undefined
      : 'In Meta → WhatsApp → Configuration, set the Callback URL and Verify token shown below and tick the "messages" field.',
  });

  // 5b. Several rows for one number send events to whichever tenant wins the
  // lookup — the classic cause of "webhook arrived but the Inbox is empty".
  if (account.phoneNumberId) {
    const rows = await prisma.whatsAppAccount.findMany({
      where: { phoneNumberId: account.phoneNumberId },
      select: { id: true, tenantId: true, status: true, connectedAt: true },
      orderBy: { connectedAt: 'desc' },
    });
    const otherTenants = rows.filter((r) => r.tenantId !== tenantId);
    checks.push({
      id: 'duplicate_accounts',
      label: 'One owner row for this number',
      status: rows.length === 1 ? 'ok' : otherTenants.length ? 'fail' : 'warn',
      detail:
        rows.length === 1
          ? 'Exactly one account row owns this phone number id.'
          : `${rows.length} rows own this number` +
            (otherTenants.length
              ? ` — ${otherTenants.length} belong to a DIFFERENT workspace, so events may be filed there.`
              : ' (all in this workspace).'),
      fix: rows.length === 1 ? undefined : 'Use "Remove stale account rows" below to keep only the live one.',
    });
  }

  // 5c. What did those events actually contain? A template send from Meta's
  // "Try it out" produces status events only — no conversation is created.
  const recentPayloads = await prisma.webhookEvent.findMany({
    where: { phoneNumberId: account.phoneNumberId },
    orderBy: { receivedAt: 'desc' },
    take: 10,
    select: { payload: true },
  });
  let inboundMsgs = 0;
  let statusOnly = 0;
  for (const row of recentPayloads) {
    const v = (row.payload as any)?.entry?.[0]?.changes?.[0]?.value;
    inboundMsgs += (v?.messages ?? []).length;
    if (!(v?.messages ?? []).length && (v?.statuses ?? []).length) statusOnly += 1;
  }
  checks.push({
    id: 'event_contents',
    label: 'Inbound messages inside those events',
    status: inboundMsgs ? 'ok' : 'warn',
    detail: `${inboundMsgs} inbound message(s) across the last ${recentPayloads.length} event(s); ${statusOnly} were delivery-status only.`,
    fix: inboundMsgs
      ? undefined
      : 'Send a message TO the business number from a registered phone (a template send from Meta only produces status events).',
  });

  // 6. Did routed messages land as conversations?
  const [convos, msgs] = await Promise.all([
    prisma.conversation.count({ where: { tenantId } }),
    prisma.message.count({ where: { conversation: { tenantId } } }),
  ]);
  checks.push({
    id: 'inbox',
    label: 'Conversations stored for the Inbox',
    status: convos ? 'ok' : 'warn',
    detail: `${convos} conversation(s), ${msgs} message(s).`,
    fix: convos ? undefined : 'Fix webhook delivery above, then message the business number from a registered phone.',
  });

  // 7. Config sanity.
  checks.push({
    id: 'verify_token',
    label: 'Webhook verify token configured',
    status: metaConfig.webhookVerifyToken ? 'ok' : 'fail',
    detail: metaConfig.webhookVerifyToken
      ? 'WHATSAPP_WEBHOOK_VERIFY_TOKEN is set on the server.'
      : 'WHATSAPP_WEBHOOK_VERIFY_TOKEN is empty — Meta’s verification handshake will always fail.',
    fix: metaConfig.webhookVerifyToken ? undefined : 'Set WHATSAPP_WEBHOOK_VERIFY_TOKEN in Vercel and redeploy.',
  });

  return { checks, callbackUrl, verifyToken: metaConfig.webhookVerifyToken, wabaId: account.wabaId };
}

/**
 * Re-run routing over the stored raw events, surfacing whatever the live
 * webhook handler had to swallow. Safe to repeat: conversations upsert and
 * messages dedupe on waMessageId.
 */
export async function replayStoredEvents(tenantId: string): Promise<string> {
  const account = await prisma.whatsAppAccount.findFirst({
    where: { tenantId, status: 'connected' },
    orderBy: { connectedAt: 'desc' },
  });
  if (!account?.phoneNumberId) return 'No connected number to replay for.';

  const events = await prisma.webhookEvent.findMany({
    where: { phoneNumberId: account.phoneNumberId },
    orderBy: { receivedAt: 'asc' },
    take: 50,
  });
  if (!events.length) return 'No stored webhook events to replay.';

  let stored = 0;
  let inbound = 0;
  const errors: string[] = [];
  for (const event of events) {
    const r = await ingestWebhookPayload(event.payload);
    stored += r.messagesStored;
    inbound += r.inboundSeen;
    errors.push(...r.errors);
  }

  const summary = `Replayed ${events.length} event(s): ${inbound} inbound message(s) seen, ${stored} newly stored.`;
  return errors.length ? `${summary} Errors: ${errors.slice(0, 5).join(' | ')}` : summary;
}

/**
 * Force this workspace back to the connect screen. Used when the integration
 * was revoked on Facebook — or to rehearse a first-time client onboarding.
 */
export async function resetConnection(tenantId: string): Promise<string> {
  const { count } = await prisma.whatsAppAccount.updateMany({
    where: { tenantId, status: 'connected' },
    data: { status: 'reconnect_required', accessToken: null, statusReason: 'Reset from diagnostics.' },
  });
  return count
    ? `Reset ${count} connection(s). Sign in again (or open /onboarding) to run Embedded Signup from the start.`
    : 'No connected number to reset.';
}

/** Drop account rows for this number that are not the live one. */
export async function removeStaleAccounts(tenantId: string): Promise<string> {
  const live = await prisma.whatsAppAccount.findFirst({
    where: { tenantId, status: 'connected' },
    orderBy: { connectedAt: 'desc' },
  });
  if (!live?.phoneNumberId) return 'No connected number.';

  const stale = await prisma.whatsAppAccount.findMany({
    where: { phoneNumberId: live.phoneNumberId, id: { not: live.id } },
    select: { id: true, tenantId: true },
  });
  if (!stale.length) return 'No stale rows — nothing to remove.';

  await prisma.whatsAppAccount.deleteMany({ where: { id: { in: stale.map((s) => s.id) } } });
  return `Removed ${stale.length} stale account row(s) for this number.`;
}

/** Re-run the WABA webhook subscription (the step that silently fails at connect time). */
export async function resubscribeWaba(tenantId: string): Promise<string> {
  const account = await prisma.whatsAppAccount.findFirst({
    where: { tenantId, status: 'connected' },
    orderBy: { connectedAt: 'desc' },
  });
  if (!account?.wabaId || !account.accessToken) return 'No connected WABA to subscribe.';

  const res = await fetch(`${graphBase()}/${account.wabaId}/subscribed_apps`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${decrypt(account.accessToken)}` },
  });
  const body = await res.text();
  return res.ok ? 'Subscribed this app to the WABA.' : `Subscribe failed (${res.status}): ${body.slice(0, 300)}`;
}
