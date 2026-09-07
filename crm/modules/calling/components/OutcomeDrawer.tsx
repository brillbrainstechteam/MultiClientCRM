import { useState } from 'react';
import { Button, Drawer, Select, Textarea } from '@crm/design-system';
import { nextActionLabel } from '../calling-labels';
import type { BusinessDisposition, CallTask, ConnectionStatus, NextActionKey } from '../domain';

export interface OutcomeResult {
  connectionStatus: ConnectionStatus;
  disposition: BusinessDisposition | null;
  nextAction: NextActionKey;
  notes: string;
  requirement: string;
  objection: string;
  lifecycleChangeTo: string | null;
}

export interface OutcomeDrawerProps {
  open: boolean;
  task: CallTask;
  contactName: string;
  durationSeconds: number | null;
  onClose: () => void;
  onSave: (result: OutcomeResult, openWhatsAppAfter: boolean) => void;
}

const connectionOptions: { value: ConnectionStatus; label: string }[] = [
  { value: 'connected', label: 'Connected' },
  { value: 'no_answer', label: 'No answer' },
  { value: 'busy', label: 'Busy' },
  { value: 'unreachable', label: 'Unreachable' },
  { value: 'invalid', label: 'Invalid number' },
];

const dispositionOptions: { value: BusinessDisposition; label: string }[] = [
  { value: 'interested', label: 'Interested' },
  { value: 'not_interested', label: 'Not interested' },
  { value: 'follow_up', label: 'Follow-up needed' },
  { value: 'completed', label: 'Completed' },
];

/**
 * Every logged call resolves to one of: closed, follow-up, or no-response
 * (kept open). This drives the "each call has a closure or a follow-up status"
 * requirement and is shown to the agent before they save.
 */
function resolutionFor(
  connection: ConnectionStatus | null,
  disposition: BusinessDisposition | null,
): { kind: 'closed' | 'follow_up' | 'open' | 'no_response'; text: string; tone: string } | null {
  if (!connection) return null;
  if (connection === 'invalid') {
    return { kind: 'open', tone: 'warn', text: 'Invalid number — update the contact before retrying.' };
  }
  if (connection !== 'connected') {
    return { kind: 'no_response', tone: 'warn', text: 'No response — the call stays open for another attempt.' };
  }
  if (disposition === 'completed' || disposition === 'not_interested') {
    return { kind: 'closed', tone: 'success', text: 'This call will be marked Closed.' };
  }
  if (disposition === 'follow_up') {
    return { kind: 'follow_up', tone: 'info', text: 'A follow-up will be scheduled — the call stays tracked.' };
  }
  if (disposition === 'interested') {
    return { kind: 'open', tone: 'info', text: 'Open — capture the next step (e.g. send WhatsApp).' };
  }
  return null;
}

function suggestedNextAction(connection: ConnectionStatus | null, disposition: BusinessDisposition | null): NextActionKey {
  if (connection === 'invalid') return 'update_customer';
  if (connection !== 'connected') return 'none';
  if (disposition === 'follow_up') return 'schedule_follow_up';
  if (disposition === 'interested') return 'send_whatsapp';
  return 'none';
}

const nextActionOptionsFor = (connection: ConnectionStatus | null): NextActionKey[] =>
  connection === 'connected'
    ? ['none', 'schedule_follow_up', 'send_whatsapp', 'update_customer', 'escalate']
    : ['none', 'update_customer', 'escalate'];

const lifecycleOptions = [
  { value: '', label: 'No change' },
  { value: 'engaged', label: 'Engaged' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'customer', label: 'Customer' },
  { value: 'dormant', label: 'Dormant' },
];

/**
 * CALL-S04 — progressive Outcome drawer. Connection + disposition + next
 * action are the only required steps; notes/requirement/objection/lifecycle
 * stay collapsed (SIMPLIFICATION_DECISIONS.md "Call Outcome").
 */
export function OutcomeDrawer({ open, task, contactName, durationSeconds, onClose, onSave }: OutcomeDrawerProps) {
  const [connection, setConnection] = useState<ConnectionStatus | null>(null);
  const [disposition, setDisposition] = useState<BusinessDisposition | null>(null);
  const [nextAction, setNextAction] = useState<NextActionKey | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [requirement, setRequirement] = useState('');
  const [objection, setObjection] = useState('');
  const [lifecycleChangeTo, setLifecycleChangeTo] = useState('');

  if (!open) return null;

  const effectiveNextAction = nextAction ?? suggestedNextAction(connection, disposition);
  const canSave = connection !== null && (connection !== 'connected' || disposition !== null);
  const resolution = resolutionFor(connection, disposition);

  const reset = () => {
    setConnection(null);
    setDisposition(null);
    setNextAction(null);
    setDetailsOpen(false);
    setNotes('');
    setRequirement('');
    setObjection('');
    setLifecycleChangeTo('');
  };

  const buildResult = (): OutcomeResult | null => {
    if (!connection || (connection === 'connected' && !disposition)) return null;
    return {
      connectionStatus: connection,
      disposition: connection === 'connected' ? disposition : null,
      nextAction: effectiveNextAction,
      notes,
      requirement,
      objection,
      lifecycleChangeTo: lifecycleChangeTo || null,
    };
  };

  const save = (openWhatsAppAfter: boolean) => {
    const result = buildResult();
    if (!result) return;
    onSave(result, openWhatsAppAfter);
    reset();
  };

  return (
    <Drawer
      open={open}
      title="Log outcome"
      subtitle={contactName}
      onClose={() => {
        reset();
        onClose();
      }}
      footer={
        <>
          <Button
            variant="secondary"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Cancel
          </Button>
          {effectiveNextAction === 'send_whatsapp' ? (
            <Button variant="secondary" disabled={!canSave} onClick={() => save(true)}>
              Save &amp; open WhatsApp
            </Button>
          ) : null}
          <Button variant="primary" disabled={!canSave} onClick={() => save(false)}>
            Save outcome
          </Button>
        </>
      }
    >
      <div className="crm-outcome">
        {durationSeconds !== null ? (
          <p className="crm-outcome__duration">Call duration: {formatDuration(durationSeconds)}</p>
        ) : null}

        <fieldset className="crm-outcome__step">
          <legend>Connection status</legend>
          <div className="crm-outcome__options">
            {connectionOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`crm-outcome__chip${connection === option.value ? ' crm-outcome__chip--active' : ''}`}
                onClick={() => {
                  setConnection(option.value);
                  if (option.value !== 'connected') setDisposition(null);
                  setNextAction(null);
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>

        {connection === 'connected' ? (
          <fieldset className="crm-outcome__step">
            <legend>Business disposition</legend>
            <div className="crm-outcome__options">
              {dispositionOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`crm-outcome__chip${disposition === option.value ? ' crm-outcome__chip--active' : ''}`}
                  onClick={() => {
                    setDisposition(option.value);
                    setNextAction(null);
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>
        ) : null}

        {canSave && resolution ? (
          <div className={`crm-outcome__resolution crm-outcome__resolution--${resolution.tone}`}>
            <strong>{resolutionHeading(resolution.kind)}</strong>
            <span>{resolution.text}</span>
          </div>
        ) : null}

        {connection ? (
          <Textarea
            label="Call summary"
            hint="A short summary of what happened — powers follow-ups and call intelligence."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        ) : null}

        {connection ? (
          <Select
            label="Next action"
            options={nextActionOptionsFor(connection).map((key) => ({ value: key, label: nextActionLabel[key] }))}
            value={effectiveNextAction}
            onChange={(e) => setNextAction(e.target.value as NextActionKey)}
          />
        ) : null}

        {connection ? (
          <div className="crm-outcome__details">
            <button type="button" className="crm-outcome__toggle" onClick={() => setDetailsOpen((v) => !v)}>
              {detailsOpen ? 'Hide' : 'Add'} requirement, objection &amp; lifecycle
            </button>
            {detailsOpen ? (
              <div className="crm-outcome__collapsed">
                <Textarea
                  label="Requirement"
                  value={requirement}
                  onChange={(e) => setRequirement(e.target.value)}
                />
                <Textarea label="Objection" value={objection} onChange={(e) => setObjection(e.target.value)} />
                <Select
                  label="Lifecycle update"
                  options={lifecycleOptions}
                  value={lifecycleChangeTo}
                  onChange={(e) => setLifecycleChangeTo(e.target.value)}
                />
                <p className="crm-outcome__hint">
                  Lifecycle changes obey Contacts permissions — this is recorded on the attempt as a suggestion.
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {task.followUpReason ? (
          <p className="crm-outcome__hint">Earlier context: {task.followUpReason}</p>
        ) : null}
      </div>
    </Drawer>
  );
}

function resolutionHeading(kind: 'closed' | 'follow_up' | 'open' | 'no_response'): string {
  if (kind === 'closed') return 'Closed';
  if (kind === 'follow_up') return 'Follow-up';
  if (kind === 'no_response') return 'No response';
  return 'Open';
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
