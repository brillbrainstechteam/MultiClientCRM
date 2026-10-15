import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import {
  expireStaleSyncs, syncWindowHoursLeft, HISTORY_DAYS, MEDIA_DAYS,
} from '@/lib/whatsapp/coexistence';

/**
 * What is happening to the customer's WhatsApp history right now.
 *
 * Drives the post-connection progress screen. The point of that screen is that
 * the owner can watch their chats arriving instead of being dropped into an
 * inbox that looks empty for the first few minutes and then mysteriously fills.
 *
 * Phases map to Meta's: 0 is the last day, 1 is days 1-90, 2 is days 90-180,
 * and a phase with nothing in it sends no webhooks at all — so progress can
 * legitimately jump.
 */

const PHASE_LABEL: Record<number, string> = {
  0: 'Recent conversations',
  1: 'Last 90 days',
  2: '90–180 days',
};

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  // A sync still sitting in `requested` after the window has closed is not
  // going to arrive — mark it so the UI offers reconnection, not a retry.
  await expireStaleSyncs(user.tenantId).catch(() => {});

  const accounts = await prisma.whatsAppAccount.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { connectedAt: 'desc' },
  });
  if (accounts.length === 0) {
    return NextResponse.json({ connected: false, numbers: [] });
  }

  const numbers = await Promise.all(accounts.map(async (a) => {
    const importedConversations = a.connectionMode === 'coexistence'
      ? await prisma.conversation.count({ where: { tenantId: user.tenantId, isHistorical: true } })
      : 0;

    const hoursLeft = syncWindowHoursLeft(a.onboardedAt);
    const history = {
      status: a.historySyncStatus,
      permission: a.historyPermission,
      phase: a.historyPhase,
      phaseLabel: a.historyPhase !== null ? PHASE_LABEL[a.historyPhase] ?? null : null,
      progress: a.historyProgress,
      threads: a.historyThreads,
      messages: a.historyMessages,
      mediaPlaceholders: a.historyMediaPlaceholders,
      startedAt: a.historyStartedAt?.toISOString() ?? null,
      completedAt: a.historyCompletedAt?.toISOString() ?? null,
      error: a.historyError,
    };

    return {
      id: a.id,
      displayPhone: a.displayPhone,
      verifiedName: a.verifiedName,
      status: a.status,
      connectionMode: a.connectionMode,
      // Meta fixes the token lifetime when the Login configuration is created
      // and it cannot be renewed automatically — so the expiry is shown, not
      // just alerted on, and reconnecting can be scheduled.
      tokenExpiresAt: a.tokenExpiresAt?.toISOString() ?? null,
      tokenDaysLeft: a.tokenExpiresAt
        ? Math.ceil((a.tokenExpiresAt.getTime() - Date.now()) / 86_400_000)
        : null,
      onboardedAt: a.onboardedAt?.toISOString() ?? null,
      /** Meta only accepts the sync requests inside this window. */
      syncWindowHoursLeft: hoursLeft === null ? null : Math.round(hoursLeft * 10) / 10,
      contacts: {
        status: a.contactsSyncStatus,
        imported: a.contactsImported,
        syncedAt: a.contactsSyncedAt?.toISOString() ?? null,
        error: a.contactsError,
      },
      history,
      importedConversations,
      // One sentence the UI can show without re-deriving the rules.
      summary: describe(a.connectionMode, history.permission, history.status, history.messages),
    };
  }));

  return NextResponse.json({
    connected: true,
    numbers,
    limits: { historyDays: HISTORY_DAYS, mediaDays: MEDIA_DAYS },
  });
}

/**
 * Plain-language state. Declining is not an error and must never read like one
 * — the connection worked, the customer simply kept their chats on the phone.
 */
function describe(mode: string, permission: string, status: string, messages: number): string {
  if (mode !== 'coexistence') {
    return mode === 'migrated_from_business_app'
      ? 'This number moved fully to the API, so earlier WhatsApp Business app chats stayed on the phone.'
      : 'New conversations appear here as customers message you.';
  }
  if (permission === 'declined') {
    return 'Previous conversations were not shared during WhatsApp setup, so they remain in your WhatsApp Business app.';
  }
  switch (status) {
    case 'completed':
      return messages > 0
        ? `Imported ${messages.toLocaleString('en-IN')} earlier messages for context.`
        : 'Connected. New conversations will appear here.';
    case 'syncing':
      return 'Bringing in your recent conversations — you can keep using WhatsApp while this finishes.';
    case 'requested':
      return 'Asked WhatsApp for your recent conversations; they usually start arriving within a few minutes.';
    case 'partial':
      return 'Some earlier conversations were imported before WhatsApp closed the import window.';
    case 'expired':
      return 'WhatsApp’s one-time import window closed before the history arrived. Reconnect the number to try again.';
    case 'failed':
      return 'Your number is connected, but WhatsApp could not complete the history import.';
    default:
      return 'Connected.';
  }
}
