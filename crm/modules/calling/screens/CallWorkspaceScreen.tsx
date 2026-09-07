import { useEffect, useState } from 'react';
import { Copy, MessageSquare, PhoneCall, PhoneOff, StickyNote, User as UserIcon, UserCog } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useWorkspace } from '@crm/app/workspace-context';
import { Badge, Button, EmptyState, Modal, Textarea, Toast } from '@crm/design-system';
import { findContact, findUser } from '@crm/mock-data';
import { useCallingData } from '../calling-data-context';
import {
  AssignmentModal,
  FollowUpDrawer,
  OutcomeDrawer,
  ProviderDisconnectedBanner,
  ProviderFailureBanner,
  RecommendedNextAction,
  RescheduleModal,
  type FollowUpDetails,
  type OutcomeResult,
} from '../components';
import { findCallContext, findCallingNumber } from '../data';
import type { BusinessDisposition, NextActionKey } from '../domain';
import { providerCapabilitiesFor } from '../domain';
import { inboxHandoffPath } from '../inbox-handoff';

interface JustSaved {
  disposition: BusinessDisposition | null;
  nextAction: NextActionKey;
  followUpSummary: string | null;
}

export default function CallWorkspaceScreen() {
  const { taskId } = useParams<{ taskId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const { role, currentUser } = useWorkspace();
  const { tasks, notesByTask, updateTask, addAttempt, addTask, addNote } = useCallingData();

  const [connectedAt, setConnectedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [toast, setToast] = useState<{ tone: 'success' | 'info'; message: string } | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [justSaved, setJustSaved] = useState<JustSaved | null>(null);

  const callState = searchParams.get('callState');

  useEffect(() => {
    if (!connectedAt) return;
    const id = window.setInterval(() => setElapsed(Math.floor((Date.now() - connectedAt) / 1000)), 1000);
    return () => window.clearInterval(id);
  }, [connectedAt]);

  useEffect(() => {
    if (callState !== 'calling') return;
    const id = window.setTimeout(() => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('callState', 'connected');
        return next;
      });
      setConnectedAt(Date.now());
    }, 1100);
    return () => window.clearTimeout(id);
  }, [callState, setSearchParams]);

  const task = tasks.find((t) => t.id === taskId);

  if (!task) {
    return (
      <div className="crm-workspace">
        <EmptyState
          title="Call task not found"
          description="It may have been completed or removed."
          actions={
            <Button variant="secondary" onClick={() => navigate(scopedHref('/calling/queue'))}>
              Back to queue
            </Button>
          }
        />
      </div>
    );
  }

  const contact = findContact(task.contactId);
  if (!contact) {
    return (
      <div className="crm-workspace">
        <EmptyState title="Contact record not found" description="This call task references a contact that no longer exists." />
      </div>
    );
  }

  const number = findCallingNumber(task.numberId);
  const capabilities = providerCapabilitiesFor(number);
  const modeParam = searchParams.get('mode');
  const effectiveMode: 'manual' | 'provider' = modeParam === 'provider' && capabilities.clickToCall ? 'provider' : 'manual';
  const stateParam = searchParams.get('state');
  const forcedProviderFailure = stateParam === 'provider-failure';
  const aiUnavailable = stateParam === 'ai-unavailable';
  const forcedNextAction = stateParam === 'next-action';
  const drawer = searchParams.get('drawer');

  const context = findCallContext(task.contactId);
  const assignee = task.assigneeId ? findUser(task.assigneeId) : null;
  const owner = findUser(task.contactOwnerId);

  const returnTo = `/calling/task/${task.id}`;
  const originReturnTo = searchParams.get('returnTo');
  const originLabel = originReturnTo?.startsWith('/contacts')
    ? 'Contacts'
    : originReturnTo?.startsWith('/inbox')
      ? 'Inbox'
      : originReturnTo?.startsWith('/dashboard')
        ? 'Dashboard'
        : null;

  const clearTransient = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('callState');
      next.delete('drawer');
      return next;
    });
  };

  const openOutcome = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('callState');
      next.set('drawer', 'outcome');
      return next;
    });
  };

  const startProviderCall = () => {
    if (forcedProviderFailure) {
      setToast({ tone: 'info', message: 'Provider call failed to connect — continue manually below.' });
      return;
    }
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('callState', 'calling');
      return next;
    });
  };

  const endCall = () => {
    openOutcome();
  };

  const copyNumber = async () => {
    try {
      await navigator.clipboard?.writeText(contact.mobile);
      setToast({ tone: 'success', message: `Copied ${contact.mobile}` });
    } catch {
      setToast({ tone: 'info', message: contact.mobile });
    }
  };

  const handleOutcomeSave = (result: OutcomeResult, openWhatsAppAfter: boolean) => {
    const attemptId = `attempt_${Date.now()}`;
    const durationSeconds = connectedAt ? elapsed : null;
    addAttempt({
      id: attemptId,
      taskId: task.id,
      contactId: task.contactId,
      agentId: currentUser.id,
      startedAt: new Date(Date.now() - (durationSeconds ?? 0) * 1000).toISOString(),
      endedAt: new Date().toISOString(),
      durationSeconds,
      connectionStatus: result.connectionStatus,
      disposition: result.disposition,
      nextAction: result.nextAction,
      notes: result.notes || null,
      requirement: result.requirement || null,
      objection: result.objection || null,
      lifecycleChangeTo: result.lifecycleChangeTo,
      providerReference: effectiveMode === 'provider' ? `SIM-${attemptId.slice(-6).toUpperCase()}` : null,
      recordingAvailable: false,
      mode: effectiveMode,
    });

    const terminal = result.connectionStatus === 'connected';
    updateTask(task.id, {
      attemptCount: task.attemptCount + 1,
      latestDisposition: result.disposition,
      status: terminal ? 'completed' : task.status,
    });

    setConnectedAt(null);
    setElapsed(0);

    if (result.nextAction === 'schedule_follow_up') {
      setJustSaved({ disposition: result.disposition, nextAction: result.nextAction, followUpSummary: null });
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('drawer', 'follow-up');
        return next;
      });
    } else if (openWhatsAppAfter) {
      navigate(inboxHandoffPath(task.contactId, { callTaskId: task.id }));
    } else {
      setJustSaved({ disposition: result.disposition, nextAction: result.nextAction, followUpSummary: null });
      clearTransient();
    }
  };

  const handleScheduleFollowUp = (details: FollowUpDetails) => {
    const newTask = {
      id: `task_${Date.now()}`,
      contactId: task.contactId,
      contactOwnerId: task.contactOwnerId,
      assigneeId: details.assigneeId,
      branchId: task.branchId,
      teamId: task.teamId,
      numberId: task.numberId,
      dueAt: details.dueAt,
      source: 'Follow-up — scheduled after call',
      listId: null,
      reasonTag: 'standard' as const,
      status: 'scheduled' as const,
      latestDisposition: null,
      attemptCount: 0,
      createdAt: new Date().toISOString(),
      followUpOfTaskId: task.id,
      followUpReason: details.reason,
    };
    addTask(newTask);
    clearTransient();
    setJustSaved((prev) => ({
      disposition: prev?.disposition ?? task.latestDisposition,
      nextAction: 'schedule_follow_up',
      followUpSummary: `Follow-up set for ${formatDateTime(details.dueAt)} with ${findUser(details.assigneeId)?.name ?? 'the assignee'}.`,
    }));
  };

  const handleKeepExisting = (existingTaskId: string) => {
    const existing = tasks.find((t) => t.id === existingTaskId);
    clearTransient();
    setJustSaved((prev) => ({
      disposition: prev?.disposition ?? task.latestDisposition,
      nextAction: 'schedule_follow_up',
      followUpSummary: existing
        ? `Kept the existing follow-up on ${formatDateTime(existing.dueAt)}.`
        : 'Kept the existing follow-up.',
    }));
  };

  const handleRescheduleExisting = (existingTaskId: string, dueAt: string) => {
    updateTask(existingTaskId, { dueAt });
    clearTransient();
    setJustSaved((prev) => ({
      disposition: prev?.disposition ?? task.latestDisposition,
      nextAction: 'schedule_follow_up',
      followUpSummary: `Rescheduled the existing follow-up to ${formatDateTime(dueAt)}.`,
    }));
  };

  const displayNextAction: JustSaved | null =
    justSaved ??
    (forcedNextAction
      ? {
          disposition: task.latestDisposition,
          nextAction: task.followUpOfTaskId || task.latestDisposition === 'follow_up' ? 'schedule_follow_up' : 'none',
          followUpSummary: null,
        }
      : null);

  const notes = notesByTask[task.id] ?? [];

  return (
    <div className="crm-workspace">
      <PageHeader
        title={contact.name}
        description={contact.company ?? contact.mobile}
        breadcrumbs={[
          { label: 'Call Desk', to: scopedHref('/calling') },
          { label: 'Queue', to: scopedHref('/calling/queue') },
          { label: contact.name },
        ]}
        actions={
          <>
            {originReturnTo && originLabel ? (
              <Button variant="secondary" onClick={() => navigate(originReturnTo)}>
                Back to {originLabel}
              </Button>
            ) : null}
            <Button variant="secondary" onClick={() => navigate(scopedHref('/calling/queue'))}>
              Back to queue
            </Button>
          </>
        }
      />

      {forcedProviderFailure ? (
        <ProviderFailureBanner />
      ) : !capabilities.clickToCall ? (
        <ProviderDisconnectedBanner description="This line has no connected provider. Use Call Manually and log the outcome yourself." />
      ) : null}

      {displayNextAction ? (
        <RecommendedNextAction
          disposition={displayNextAction.disposition}
          nextAction={displayNextAction.nextAction}
          followUpSummary={displayNextAction.followUpSummary}
          onOpenWhatsApp={() => navigate(inboxHandoffPath(task.contactId, { callTaskId: task.id }))}
          onOpenFollowUp={() => {
            /* Follow-up already resolved; nothing further to open. */
          }}
          onEscalate={() => setToast({ tone: 'info', message: 'Escalated to your manager (simulated).' })}
          onOpenProfile={() => navigate(scopedHref(`/contacts/customer/${contact.id}`, { returnTo }))}
          onBackToQueue={() => navigate(scopedHref('/calling/queue'))}
        />
      ) : null}

      <div className="crm-workspace__grid">
        <section className="crm-workspace__panel">
          <h2>Customer snapshot</h2>
          <dl className="crm-workspace__facts">
            <div>
              <dt>Company</dt>
              <dd>{contact.company ?? '—'}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{contact.mobile}</dd>
            </div>
            <div>
              <dt>City</dt>
              <dd>{contact.city}</dd>
            </div>
            <div>
              <dt>Contact owner</dt>
              <dd>{owner ? owner.name : 'Unowned'}</dd>
            </div>
            <div>
              <dt>Call assignee</dt>
              <dd>{assignee ? assignee.name : 'Unassigned'}</dd>
            </div>
            <div>
              <dt>Lifecycle</dt>
              <dd className="crm-workspace__capitalize">{contact.stage}</dd>
            </div>
            <div>
              <dt>Sales tier</dt>
              <dd className="crm-workspace__capitalize">{contact.salesTier}</dd>
            </div>
            <div>
              <dt>Last activity</dt>
              <dd>{formatDate(contact.lastActivityAt)}</dd>
            </div>
          </dl>
          {contact.tags.length > 0 ? (
            <div className="crm-workspace__tags">
              {contact.tags.map((tag) => (
                <Badge key={tag} tone="neutral" appearance="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null}
        </section>

        <section className="crm-workspace__panel">
          <h2>Why you're calling</h2>
          <p className="crm-workspace__reason">{task.source}</p>
          {context?.lastWhatsAppSummary ? (
            <p>
              <strong>Last WhatsApp:</strong> {context.lastWhatsAppSummary}
            </p>
          ) : null}
          {context?.lastCallSummary ? (
            <p>
              <strong>Last call:</strong> {context.lastCallSummary}
            </p>
          ) : null}
          {context?.currentRequirement ? (
            <p>
              <strong>Requirement:</strong> {context.currentRequirement}
            </p>
          ) : null}
          {context?.openObjection ? (
            <p className="crm-workspace__objection">
              <strong>Objection:</strong> {context.openObjection}
            </p>
          ) : null}

          {context && context.talkingPoints.length > 0 ? (
            <div className="crm-workspace__talking-points">
              <h3>Talking points</h3>
              <ul>
                {context.talkingPoints.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {aiUnavailable ? (
            <p className="crm-workspace__ai-unavailable">
              AI suggestions unavailable right now — CRM talking points above are unaffected.
            </p>
          ) : context?.aiSuggestion ? (
            <div className="crm-workspace__ai">
              <span className="crm-workspace__ai-label">AI suggestion</span>
              <p>{context.aiSuggestion}</p>
            </div>
          ) : null}

          {notes.length > 0 ? (
            <div className="crm-workspace__notes">
              <h3>Notes</h3>
              <ul>
                {notes.map((note) => (
                  <li key={note.id}>
                    <span>{note.text}</span>
                    <span className="crm-workspace__note-meta">
                      {findUser(note.authorId)?.name} · {formatDate(note.at)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </div>

      <section className="crm-workspace__controls">
        {effectiveMode === 'provider' && !forcedProviderFailure ? (
          callState === 'calling' ? (
            <div className="crm-workspace__call-state">
              <span className="crm-workspace__pulse" aria-hidden="true" />
              Calling {contact.name}…
            </div>
          ) : callState === 'connected' ? (
            <div className="crm-workspace__call-state crm-workspace__call-state--connected">
              <span>Connected · {formatDuration(elapsed)}</span>
              <Button variant="danger" iconLeft={<PhoneOff />} onClick={endCall}>
                End call
              </Button>
            </div>
          ) : (
            <Button variant="primary" size="lg" iconLeft={<PhoneCall />} onClick={startProviderCall}>
              Call {contact.name}
            </Button>
          )
        ) : (
          <div className="crm-workspace__manual">
            <a className="crm-button crm-button--primary crm-button--lg" href={`tel:${contact.mobile}`}>
              <span className="crm-button__icon">
                <PhoneCall />
              </span>
              <span className="crm-button__label">Call manually</span>
            </a>
            <Button variant="secondary" iconLeft={<Copy />} onClick={copyNumber}>
              Copy number
            </Button>
            <Button variant="secondary" onClick={openOutcome}>
              Mark call attempted
            </Button>
          </div>
        )}

        <div className="crm-workspace__secondary-actions">
          <Button variant="ghost" iconLeft={<MessageSquare />} onClick={() => navigate(inboxHandoffPath(task.contactId, { callTaskId: task.id }))}>
            Open WhatsApp
          </Button>
          <Button
            variant="ghost"
            iconLeft={<UserIcon />}
            onClick={() => navigate(scopedHref(`/contacts/customer/${contact.id}`, { returnTo }))}
          >
            Open customer profile
          </Button>
          <Button variant="ghost" iconLeft={<UserCog />} onClick={() => setAssignOpen(true)}>
            Reassign
          </Button>
          <Button variant="ghost" onClick={() => setRescheduleOpen(true)}>
            Reschedule
          </Button>
          <Button variant="ghost" iconLeft={<StickyNote />} onClick={() => setNoteOpen(true)}>
            Add note
          </Button>
        </div>
      </section>

      <OutcomeDrawer
        open={drawer === 'outcome'}
        task={task}
        contactName={contact.name}
        durationSeconds={connectedAt ? elapsed : null}
        onClose={clearTransient}
        onSave={handleOutcomeSave}
      />

      <FollowUpDrawer
        open={drawer === 'follow-up'}
        task={task}
        contactName={contact.name}
        tasks={tasks}
        role={role}
        onClose={clearTransient}
        onSchedule={handleScheduleFollowUp}
        onKeepExisting={handleKeepExisting}
        onRescheduleExisting={handleRescheduleExisting}
      />

      <AssignmentModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        taskIds={[task.id]}
        tasks={tasks}
        onAssign={(assignments) => {
          for (const [id, agentId] of Object.entries(assignments)) updateTask(id, { assigneeId: agentId });
          setToast({ tone: 'success', message: 'Call assignee updated. Contact owner is unchanged.' });
        }}
      />

      <RescheduleModal
        open={rescheduleOpen}
        onClose={() => setRescheduleOpen(false)}
        taskIds={[task.id]}
        tasks={tasks}
        onReschedule={(taskIds, dueAt) => {
          updateTask(taskIds[0], { dueAt, status: 'scheduled' });
          setToast({ tone: 'success', message: 'Call rescheduled.' });
        }}
      />

      <Modal
        open={noteOpen}
        title="Add note"
        onClose={() => setNoteOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setNoteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!noteText.trim()}
              onClick={() => {
                addNote(task.id, {
                  id: `note_${Date.now()}`,
                  text: noteText.trim(),
                  at: new Date().toISOString(),
                  authorId: currentUser.id,
                });
                setNoteText('');
                setNoteOpen(false);
              }}
            >
              Save note
            </Button>
          </>
        }
      >
        <Textarea label="Note" hideLabel value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add context for the next agent…" />
      </Modal>

      {toast ? <Toast tone={toast.tone === 'info' ? 'info' : 'success'} message={toast.message} onDismiss={() => setToast(null)} /> : null}
    </div>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' });
}
