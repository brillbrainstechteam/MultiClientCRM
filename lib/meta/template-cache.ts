import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import { graphBase } from '@/lib/meta/config';
import { graphErrorMessage, isAuthError, markTokenInvalid, type GraphErrorBody } from '@/lib/meta/account';

/**
 * Local mirror of a WABA's message templates.
 *
 * Meta remains the system of record: templates are created, reviewed, paused
 * and deleted there, and nothing here tries to second-guess that. What this
 * does is stop every read being a Graph round trip — the repository screen, the
 * campaign builder, the inbox picker and the onboarding checklist all wanted
 * the list, and each was fetching it again.
 *
 * Two consequences worth stating, because they shape the design:
 *
 *  - **A cache can be wrong.** Everything served from it carries `lastSyncedAt`,
 *    a refresh is always one call away, and anything that must be correct right
 *    now (submitting a template, sending a campaign) still talks to Meta.
 *  - **The webhook makes it nearly live.** Meta pushes status, category and
 *    quality changes, so those land here the moment they happen rather than at
 *    the next poll. That is the part a cache usually cannot offer.
 *
 * Deletes are soft. A campaign that went out under a template Meta has since
 * removed should still be able to say what it sent.
 */

/** How old the mirror may be before a read refreshes it in the background. */
export const STALE_AFTER_MS = 10 * 60 * 1000;

export interface MetaTemplateRaw {
  id?: string;
  name?: string;
  language?: string;
  status?: string;
  category?: string;
  components?: unknown[];
  quality_score?: { score?: string };
  rejected_reason?: string;
}

export interface CachedTemplate {
  id: string;
  metaTemplateId: string | null;
  name: string;
  language: string;
  status: string;
  category: string;
  qualityScore: string | null;
  rejectedReason: string | null;
  components: unknown[];
  lastSyncedAt: string;
}

export interface TemplateReadResult {
  connected: boolean;
  wabaId: string | null;
  account: { wabaId: string; name: string; displayPhone: string | null } | null;
  templates: MetaTemplateRaw[];
  /** When the mirror was last reconciled with Meta, null when never. */
  cachedAt: string | null;
  /** True when this response came from the mirror rather than a fresh fetch. */
  fromCache: boolean;
  /** Set when a refresh was attempted and failed; the cached list is still returned. */
  syncError?: string;
  reconnectRequired?: boolean;
}

function toRaw(row: {
  metaTemplateId: string | null; name: string; language: string; status: string;
  category: string; qualityScore: string | null; rejectedReason: string | null;
  components: unknown;
}): MetaTemplateRaw {
  return {
    id: row.metaTemplateId ?? undefined,
    name: row.name,
    language: row.language,
    status: row.status,
    category: row.category,
    components: (row.components ?? []) as unknown[],
    ...(row.qualityScore ? { quality_score: { score: row.qualityScore } } : {}),
    ...(row.rejectedReason ? { rejected_reason: row.rejectedReason } : {}),
  };
}

/** Pull the live list from Meta and reconcile the mirror against it. */
export async function syncTemplatesFromMeta(input: {
  tenantId: string;
  wabaId: string;
  accessToken: string;
}): Promise<{ ok: true; count: number } | { ok: false; error: string; reconnectRequired?: boolean }> {
  const { tenantId, wabaId } = input;
  const url = `${graphBase()}/${wabaId}/message_templates`
    + '?limit=200&fields=name,language,status,category,components,id,quality_score,rejected_reason';

  let json: ({ data?: MetaTemplateRaw[] } & GraphErrorBody) | null = null;
  let res: Response;
  try {
    res = await fetch(url, { headers: { Authorization: `Bearer ${input.accessToken}` } });
    json = (await res.json().catch(() => ({}))) as { data?: MetaTemplateRaw[] } & GraphErrorBody;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not reach Meta.' };
  }

  if (!res.ok) {
    // A revoked Business Integration surfaces here first — repair the account
    // row so the next sign-in routes back through Embedded Signup.
    if (isAuthError(json)) {
      await markTokenInvalid(
        (await prisma.whatsAppAccount.findFirst({ where: { tenantId, wabaId }, select: { id: true } }))?.id ?? '',
        json?.error?.message ?? 'Meta rejected the stored token.',
      ).catch(() => {});
      return { ok: false, error: 'Reconnect required.', reconnectRequired: true };
    }
    return { ok: false, error: graphErrorMessage(json ?? undefined, 'Could not load templates from Meta.') };
  }

  const live = json?.data ?? [];
  const now = new Date();
  const seen = new Set<string>();

  for (const t of live) {
    const name = t.name?.trim();
    const language = t.language?.trim();
    if (!name || !language) continue;
    seen.add(`${name}::${language}`);

    const data = {
      wabaId,
      metaTemplateId: t.id ?? null,
      status: String(t.status ?? 'UNKNOWN').toUpperCase(),
      category: String(t.category ?? 'UTILITY').toUpperCase(),
      qualityScore: t.quality_score?.score ? String(t.quality_score.score).toUpperCase() : null,
      rejectedReason: t.rejected_reason && t.rejected_reason !== 'NONE' ? String(t.rejected_reason) : null,
      components: (t.components ?? []) as object,
      deletedAt: null,
      lastSyncedAt: now,
    };
    await prisma.crmTemplate.upsert({
      where: { tenantId_name_language: { tenantId, name, language } },
      update: data,
      create: { tenantId, name, language, ...data },
    });
  }

  // Anything Meta no longer lists is marked gone rather than removed, so a
  // campaign that used it can still report what it sent.
  const stored = await prisma.crmTemplate.findMany({
    where: { tenantId, wabaId, deletedAt: null },
    select: { id: true, name: true, language: true },
  });
  const vanished = stored.filter((r) => !seen.has(`${r.name}::${r.language}`)).map((r) => r.id);
  if (vanished.length) {
    await prisma.crmTemplate.updateMany({ where: { id: { in: vanished } }, data: { deletedAt: now } });
  }

  return { ok: true, count: live.length };
}

/**
 * The tenant's templates, from the mirror, refreshing it when it is stale or
 * when the caller insists.
 *
 * A failed refresh never fails the read: the cached list is returned with
 * `syncError` set, because a stale list the operator can see beats an error
 * page where their templates used to be.
 */
export async function readTemplates(
  tenantId: string,
  opts: { force?: boolean } = {},
): Promise<TemplateReadResult> {
  const account = await prisma.whatsAppAccount.findFirst({
    where: { tenantId, status: 'connected' },
    orderBy: { connectedAt: 'desc' },
  });
  if (!account?.wabaId || !account.accessToken) {
    return { connected: false, wabaId: null, account: null, templates: [], cachedAt: null, fromCache: false };
  }

  const summary = {
    wabaId: account.wabaId,
    name: account.verifiedName ?? account.displayPhone ?? 'WhatsApp Business Account',
    displayPhone: account.displayPhone,
  };

  const newest = await prisma.crmTemplate.findFirst({
    where: { tenantId, wabaId: account.wabaId },
    orderBy: { lastSyncedAt: 'desc' },
    select: { lastSyncedAt: true },
  });
  const age = newest ? Date.now() - newest.lastSyncedAt.getTime() : Infinity;
  const shouldSync = opts.force || age > STALE_AFTER_MS;

  let syncError: string | undefined;
  let reconnectRequired: boolean | undefined;
  if (shouldSync) {
    const r = await syncTemplatesFromMeta({
      tenantId,
      wabaId: account.wabaId,
      accessToken: decrypt(account.accessToken),
    });
    if (!r.ok) {
      syncError = r.error;
      reconnectRequired = r.reconnectRequired;
    }
  }

  const rows = await prisma.crmTemplate.findMany({
    where: { tenantId, wabaId: account.wabaId, deletedAt: null },
    orderBy: [{ name: 'asc' }, { language: 'asc' }],
  });

  return {
    connected: true,
    wabaId: account.wabaId,
    account: summary,
    templates: rows.map(toRaw),
    cachedAt: rows[0]?.lastSyncedAt.toISOString() ?? null,
    fromCache: !shouldSync || !!syncError,
    ...(syncError ? { syncError } : {}),
    ...(reconnectRequired ? { reconnectRequired } : {}),
  };
}

/* ---- Webhook write-backs -------------------------------------------------- */

/**
 * Apply a template webhook event to the mirror.
 *
 * Matched on name + language because that is what Meta sends on these events;
 * the template id is present on some but not all of them. A row that does not
 * exist yet is left alone — the next sync will create it with the full
 * component payload, which the event does not carry.
 */
export async function applyTemplateEvent(input: {
  tenantId: string;
  name?: string | null;
  language?: string | null;
  status?: string | null;
  category?: string | null;
  qualityScore?: string | null;
  rejectedReason?: string | null;
}): Promise<boolean> {
  const name = input.name?.trim();
  const language = input.language?.trim();
  if (!name) return false;

  const data: Record<string, unknown> = {};
  if (input.status) data.status = String(input.status).toUpperCase();
  if (input.category) data.category = String(input.category).toUpperCase();
  if (input.qualityScore) data.qualityScore = String(input.qualityScore).toUpperCase();
  if (input.rejectedReason !== undefined) {
    data.rejectedReason = input.rejectedReason && input.rejectedReason !== 'NONE'
      ? String(input.rejectedReason)
      : null;
  }
  if (Object.keys(data).length === 0) return false;

  // Without a language the event applies to every language variant of the name.
  const r = await prisma.crmTemplate.updateMany({
    where: { tenantId: input.tenantId, name, ...(language ? { language } : {}) },
    data,
  });
  return r.count > 0;
}

/** Approved, sendable templates — what the onboarding checklist actually asks. */
export async function approvedTemplateCount(tenantId: string): Promise<number> {
  return prisma.crmTemplate.count({ where: { tenantId, status: 'APPROVED', deletedAt: null } });
}
