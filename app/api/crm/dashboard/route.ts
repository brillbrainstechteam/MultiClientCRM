import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

/**
 * Real dashboard snapshot + connection state. Drives the three landing states
 * (not-connected / in-progress / connected). Counts are scoped to the tenant.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const tenantId = user.tenantId;
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);

  const [
    accounts, contacts, prospects, customers,
    conversations, openConversations, messagesToday, teamCount, onboarding,
  ] = await Promise.all([
    prisma.whatsAppAccount.findMany({ where: { tenantId }, orderBy: { connectedAt: 'desc' } }),
    prisma.crmContact.count({ where: { tenantId } }),
    prisma.crmContact.count({ where: { tenantId, lifecycleStage: 'prospect' } }),
    prisma.crmContact.count({ where: { tenantId, lifecycleStage: 'customer' } }),
    prisma.conversation.count({ where: { tenantId } }),
    prisma.conversation.count({ where: { tenantId, status: 'open' } }),
    prisma.message.count({ where: { conversation: { tenantId }, direction: 'inbound', at: { gte: startOfDay } } }),
    prisma.user.count({ where: { tenantId } }),
    prisma.onboardingSession.findUnique({ where: { tenantId } }),
  ]);

  // ---- WhatsApp number health (drives the account-overview cards) ----
  const QUALITY: Record<string, 'high' | 'medium' | 'low'> = { GREEN: 'high', YELLOW: 'medium', RED: 'low' };
  const TIER_LABEL: Record<string, string> = {
    TIER_50: '50 / day', TIER_250: '250 / day', TIER_1K: '1K / day',
    TIER_10K: '10K / day', TIER_100K: '100K / day', TIER_UNLIMITED: 'Unlimited',
  };
  // ordered rungs for the DoubleTick-style limit ladder
  const TIER_RUNGS = ['TIER_1K', 'TIER_10K', 'TIER_100K', 'TIER_UNLIMITED'];
  const connectedAccounts = accounts.filter((a) => a.status === 'connected');
  const numbers = connectedAccounts.length;
  const attention = accounts.filter(
    (a) => ['YELLOW', 'RED'].includes(a.qualityRating ?? '') || a.status === 'reconnect_required',
  ).length;
  const numbersList = connectedAccounts.slice(0, 4).map((a) => ({
    id: a.id,
    name: a.label ?? a.verifiedName ?? 'WhatsApp number',
    phone: a.displayPhone ?? '—',
    department: a.department ?? null,
    status: a.status === 'connected' ? 'active' : a.status === 'reconnect_required' ? 'reconnect' : a.status,
    quality: QUALITY[a.qualityRating ?? ''] ?? 'unrated',
    tier: a.messagingTier ?? null,
    tierLabel: a.messagingTier ? (TIER_LABEL[a.messagingTier] ?? a.messagingTier) : null,
    tierIndex: a.messagingTier ? TIER_RUNGS.indexOf(a.messagingTier) : -1,
    tierRungs: TIER_RUNGS.map((t) => ({ key: t, label: TIER_LABEL[t] })),
  }));

  const connected = numbers > 0;
  const inProgress = !connected && !!onboarding && ['strategy_selected', 'meta_launched', 'meta_returned', 'registering', 'cancelled', 'error'].includes(onboarding.status);
  const state = connected ? 'connected' : inProgress ? 'in_progress' : 'not_connected';

  return NextResponse.json({
    businessName: user.tenant.businessName,
    businessModel: user.tenant.businessModel,
    state,
    numbers, attention, numbersList,
    contacts, prospects, customers,
    conversations, openConversations, messagesToday, teamCount,
    onboarding: onboarding ? { status: onboarding.status, strategy: onboarding.strategy, lastStep: onboarding.lastStep, errorMessage: onboarding.errorMessage } : null,
    setup: {
      numberConnected: connected,
      hasContacts: contacts > 0,
      hasTeam: teamCount > 1,
    },
  });
}
