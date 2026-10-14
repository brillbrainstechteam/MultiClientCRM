'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, AlertTriangle, Info, MessageSquare } from 'lucide-react';
import { Button } from '@/lib/ui/Button';
import './importing.css';

/**
 * Live view of the WhatsApp history import.
 *
 * Deliberately honest about what is and is not coming: Meta gives 180 days of
 * one-to-one chats but only ~14 days of retrievable media, and no groups,
 * broadcast lists or labels at all. Promising "we'll copy your WhatsApp inbox"
 * and then delivering that is how trust is lost in the first ten minutes.
 *
 * Declining to share chats is shown as a normal outcome, not a failure — the
 * connection worked, the chats simply stayed on the phone.
 */

interface SyncNumber {
  id: string;
  displayPhone: string | null;
  verifiedName: string | null;
  connectionMode: string;
  syncWindowHoursLeft: number | null;
  contacts: { status: string; imported: number; error: string | null };
  history: {
    status: string;
    permission: string;
    phase: number | null;
    phaseLabel: string | null;
    progress: number;
    threads: number;
    messages: number;
    mediaPlaceholders: number;
    error: string | null;
  };
  importedConversations: number;
  summary: string;
}

type StepState = 'done' | 'active' | 'waiting' | 'failed' | 'skipped';

function StepRow({ state, label, detail }: { state: StepState; label: string; detail?: string }) {
  const Icon = state === 'done' ? Check
    : state === 'failed' ? AlertTriangle
      : state === 'active' ? Loader2
        : Info;
  return (
    <li className={`tt-imp__step tt-imp__step--${state}`}>
      <Icon className={state === 'active' ? 'tt-imp__spin' : undefined} aria-hidden="true" />
      <span className="tt-imp__step-text">
        <span className="tt-imp__step-label">{label}</span>
        {detail ? <span className="tt-imp__step-detail">{detail}</span> : null}
      </span>
    </li>
  );
}

const TERMINAL = ['completed', 'failed', 'expired', 'partial'];

export function ImportProgress() {
  const [data, setData] = useState<{ numbers: SyncNumber[]; limits?: { historyDays: number; mediaDays: number } } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/crm/whatsapp/sync-status', { credentials: 'same-origin' });
      const d = await res.json();
      if (d.error) { setError(d.error); return; }
      setData(d);
      return d as { numbers: SyncNumber[] };
    } catch {
      setError('Could not read the import status.');
    }
    return undefined;
  }, []);

  // Poll while anything is still moving, then stop. History arrives over
  // minutes, so this is a progress view, not a spinner the user must sit through.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let alive = true;
    const tick = async () => {
      const d = await load();
      if (!alive) return;
      const number = d?.numbers?.[0];
      const settled = number
        && TERMINAL.includes(number.history.status)
        && TERMINAL.includes(number.contacts.status);
      if (!settled) timer = setTimeout(tick, 4000);
    };
    void tick();
    return () => { alive = false; if (timer) clearTimeout(timer); };
  }, [load]);

  if (error) {
    return (
      <>
        <h1 className="tt-imp__title">WhatsApp connected</h1>
        <p className="tt-imp__lead">{error}</p>
        <Button variant="primary" size="lg" fullWidth onClick={() => { window.location.href = '/crm/inbox'; }}>
          Open Inbox
        </Button>
      </>
    );
  }

  const number = data?.numbers?.[0];
  if (!number) {
    return <p className="tt-imp__lead">Checking your connection…</p>;
  }

  const { history, contacts } = number;
  const declined = history.permission === 'declined';
  const notCoexistence = number.connectionMode !== 'coexistence';

  const contactsState: StepState = contacts.status === 'completed' ? 'done'
    : contacts.status === 'failed' || contacts.status === 'expired' ? 'failed'
      : 'active';
  const historyState: StepState = declined ? 'skipped'
    : history.status === 'completed' ? 'done'
      : history.status === 'failed' || history.status === 'expired' ? 'failed'
        : history.status === 'partial' ? 'done'
          : 'active';

  return (
    <>
      <h1 className="tt-imp__title">
        {notCoexistence
          ? 'WhatsApp connected'
          : declined
            ? 'WhatsApp connected'
            : historyState === 'done'
              ? 'Your WhatsApp is in TalkTrack'
              : 'We’re bringing your WhatsApp into TalkTrack'}
      </h1>
      <p className="tt-imp__lead">{number.summary}</p>

      <ul className="tt-imp__steps">
        <StepRow
          state="done"
          label="WhatsApp number connected"
          detail={number.displayPhone ?? undefined}
        />
        <StepRow state="done" label="New messages are connected" />
        {!notCoexistence ? (
          <StepRow state="done" label="Messages you send from your phone are connected" />
        ) : null}

        {!notCoexistence && !declined ? (
          <>
            <StepRow
              state={contactsState}
              label="Importing contacts"
              detail={
                contacts.status === 'failed' || contacts.status === 'expired'
                  ? (contacts.error ?? 'WhatsApp could not share the contact list.')
                  : contacts.imported > 0 ? `${contacts.imported.toLocaleString('en-IN')} imported` : undefined
              }
            />
            <StepRow
              state={historyState}
              label="Importing recent conversations"
              detail={
                historyState === 'failed'
                  ? (history.error ?? 'WhatsApp could not complete the import.')
                  : history.messages > 0
                    ? `${history.threads.toLocaleString('en-IN')} chats · ${history.messages.toLocaleString('en-IN')} messages`
                      + (history.phaseLabel ? ` · ${history.phaseLabel}` : '')
                    : history.phaseLabel ?? undefined
              }
            />
          </>
        ) : null}

        {declined ? (
          <StepRow
            state="skipped"
            label="Previous conversations were not shared"
            detail="They stay in your WhatsApp Business app."
          />
        ) : null}
      </ul>

      {!notCoexistence && !declined && historyState === 'active' ? (
        <div className="tt-imp__bar" role="progressbar" aria-valuenow={history.progress} aria-valuemin={0} aria-valuemax={100}>
          <span className="tt-imp__bar-fill" style={{ width: `${Math.max(4, history.progress)}%` }} />
        </div>
      ) : null}

      {history.mediaPlaceholders > 0 ? (
        <p className="tt-imp__note">
          <Info aria-hidden="true" />
          {history.mediaPlaceholders.toLocaleString('en-IN')} older photos and files appear as a
          note in the chat. WhatsApp only shares the original files from about the last two weeks.
        </p>
      ) : null}

      {historyState === 'failed' ? (
        <p className="tt-imp__note tt-imp__note--warn">
          <AlertTriangle aria-hidden="true" />
          WhatsApp only allows this import during setup, so retrying will not help. To try again,
          disconnect the number and connect it once more.
        </p>
      ) : null}

      {!notCoexistence && !declined && historyState === 'active' ? (
        <p className="tt-imp__note">
          <MessageSquare aria-hidden="true" />
          You can keep using WhatsApp Business on your phone while this finishes — nothing is
          interrupted, and the rest fills in on its own.
        </p>
      ) : null}

      <Button variant="primary" size="lg" fullWidth onClick={() => { window.location.href = '/crm/inbox'; }}>
        Open Inbox
      </Button>
      {!notCoexistence && !declined && historyState === 'active' ? (
        <p className="tt-imp__fine">The import continues in the background.</p>
      ) : null}
    </>
  );
}
