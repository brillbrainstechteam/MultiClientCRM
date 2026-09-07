import { useEffect, useRef } from 'react';
import { AlarmClockCheck, CalendarClock, ListChecks, PhoneCall, Plus, Users } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useWorkspace } from '@crm/app/workspace-context';
import { Button, EmptyState, KpiCard, LoadingSkeleton } from '@crm/design-system';
import { findContact } from '@crm/mock-data';
import { ContactCell, PriorityBadge, ProviderDisconnectedBanner } from '../components';
import { callingNumbers } from '../data';
import { useCallingData } from '../calling-data-context';
import { computeQueuePriority, referenceNow, type CallTask } from '../domain';
import { applyBranchScope, deskSummary, isOpenTask, sortQueue, tasksVisibleToRole } from '../calling-selectors';
import { can } from '../permissions';

/** CALL-S01 — Call Desk: the daily entry point, not another analytics dashboard. */
export default function CallDeskScreen() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const { role, currentUser, branchId } = useWorkspace();
  const { tasks: callTasks, addTask } = useCallingData();

  /**
   * "Schedule Call" handoff (SKILL.md "Cross-module navigation" — Contacts /
   * Dashboard / Inbox all link here with `contactId` + `returnTo`). Jump
   * straight into an existing open task for that contact, or create one, so
   * the CTA never dead-ends on the Desk.
   */
  const handledContactId = useRef<string | null>(null);
  useEffect(() => {
    const contactId = searchParams.get('contactId');
    if (!contactId || handledContactId.current === contactId) return;
    const contact = findContact(contactId);
    if (!contact) return;
    handledContactId.current = contactId;

    const returnTo = searchParams.get('returnTo');
    const sourceModule = searchParams.get('sourceModule');
    const extra = returnTo ? { returnTo } : undefined;

    const existing = tasksVisibleToRole(callTasks, currentUser, role)
      .filter((t) => t.contactId === contactId && isOpenTask(t))
      .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())[0];

    if (existing) {
      navigate(scopedHref(`/calling/task/${existing.id}`, extra), { replace: true });
      return;
    }

    const number = callingNumbers.find((n) => n.branchId === contact.branchId) ?? callingNumbers[0];
    const newTask: CallTask = {
      id: `task_adhoc_${Date.now()}`,
      contactId: contact.id,
      contactOwnerId: contact.ownerId,
      assigneeId: currentUser.id,
      branchId: contact.branchId,
      teamId: currentUser.teamId,
      numberId: number.id,
      dueAt: new Date().toISOString(),
      source:
        sourceModule === 'inbox'
          ? 'Scheduled from Inbox'
          : sourceModule === 'dashboard'
            ? 'Scheduled from Dashboard'
            : 'Scheduled from Contacts',
      listId: null,
      reasonTag: 'standard',
      status: 'due',
      latestDisposition: null,
      attemptCount: 0,
      createdAt: new Date().toISOString(),
      followUpOfTaskId: null,
      followUpReason: null,
    };
    addTask(newTask);
    navigate(scopedHref(`/calling/task/${newTask.id}`, extra), { replace: true });
  }, [searchParams, callTasks, currentUser, role, navigate, scopedHref, addTask]);

  const state = searchParams.get('state');
  if (state === 'loading') {
    return (
      <div className="crm-desk">
        <PageHeader title="Call Desk" description="Know who to call next, why, and how fast you can log it." />
        <LoadingSkeleton height={120} />
        <LoadingSkeleton lines={6} />
      </div>
    );
  }

  const forcedEmpty = state === 'empty';
  const scopedNumbers = callingNumbers.filter((n) => branchId === 'all' || n.branchId === branchId);
  const providerConnected = state === 'provider-disconnected' ? false : scopedNumbers.some((n) => n.providerConnected);

  const scoped = applyBranchScope(callTasks, branchId === 'all' ? null : branchId);
  const visible = forcedEmpty ? [] : tasksVisibleToRole(scoped, currentUser, role);
  const summary = deskSummary(visible, referenceNow());

  const myNextCalls = sortQueue(
    visible.filter((t) => isOpenTask(t) && t.assigneeId === currentUser.id),
    referenceNow(),
  ).slice(0, 5);

  const attentionOverdue = visible.filter((t) => isOpenTask(t) && new Date(t.dueAt) < referenceNow());
  const attentionUnassigned = visible.filter((t) => isOpenTask(t) && t.assigneeId === null);

  const todaysAssigned = visible.filter(
    (t) => t.assigneeId === currentUser.id && new Date(t.dueAt).toDateString() === referenceNow().toDateString(),
  );
  const todaysCompleted = todaysAssigned.filter((t) => t.status === 'completed').length;
  const todaysTotal = todaysAssigned.length;
  const progressPct = todaysTotal > 0 ? Math.round((todaysCompleted / todaysTotal) * 100) : 0;

  return (
    <div className="crm-desk">
      <PageHeader
        title="Call Desk"
        description="Know who to call next, why you're calling, and how fast you can log the result."
        actions={
          <>
            {can(role, 'calling.create_list') ? (
              <Button
                variant="secondary"
                iconLeft={<Plus />}
                onClick={() => navigate(scopedHref('/calling/lists/new'))}
              >
                Create Call List
              </Button>
            ) : null}
            <Button
              variant="primary"
              iconLeft={<PhoneCall />}
              onClick={() => navigate(scopedHref('/calling/queue', { view: 'today' }))}
            >
              Start Calling
            </Button>
          </>
        }
      />

      {!providerConnected ? (
        <ProviderDisconnectedBanner
          description="No calling line in this scope has a connected telephony provider. Manual calling and outcome logging work fully without one."
          actions={
            can(role, 'calling.configure_provider') ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(scopedHref('/settings', { sourceModule: 'calling', returnTo: '/calling' }))}
              >
                Configure provider
              </Button>
            ) : undefined
          }
        />
      ) : null}

      <div className="crm-desk__summary">
        <KpiCard label="Due today" value={summary.dueToday} icon={<CalendarClock />} />
        <KpiCard label="Follow-ups due" value={summary.followUpsDue} icon={<ListChecks />} />
        <KpiCard label="Overdue" value={summary.overdue} icon={<AlarmClockCheck />} emphasis={summary.overdue > 0 ? 'gold' : 'default'} />
        {can(role, 'calling.view_team') ? (
          <KpiCard label="Unassigned" value={summary.unassigned} icon={<Users />} />
        ) : null}
        <KpiCard label="Completed today" value={summary.completedToday} icon={<PhoneCall />} />
      </div>

      <div className="crm-desk__grid">
        <section className="crm-desk__panel">
          <div className="crm-desk__panel-head">
            <h2>My next calls</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate(scopedHref('/calling/queue', { view: 'my-calls' }))}>
              View queue
            </Button>
          </div>
          {myNextCalls.length === 0 ? (
            <EmptyState
              title="No calls assigned to you"
              description="Check the full queue for unassigned work, or check back after lists are distributed."
              actions={
                <Button variant="secondary" onClick={() => navigate(scopedHref('/calling/queue'))}>
                  Open queue
                </Button>
              }
            />
          ) : (
            <ul className="crm-desk__list">
              {myNextCalls.map((task) => {
                const contact = findContact(task.contactId);
                if (!contact) return null;
                const priority = computeQueuePriority(task, referenceNow());
                return (
                  <li key={task.id}>
                    <ContactCell contact={contact} to={scopedHref(`/calling/task/${task.id}`)} />
                    <PriorityBadge priority={priority} />
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="crm-desk__panel">
          <div className="crm-desk__panel-head">
            <h2>Needs attention</h2>
          </div>
          <div className="crm-desk__attention">
            <button
              type="button"
              className="crm-desk__attention-row"
              onClick={() => navigate(scopedHref('/calling/queue', { view: 'overdue' }))}
            >
              <span>Overdue calls</span>
              <span className="crm-desk__attention-count">{attentionOverdue.length}</span>
            </button>
            {can(role, 'calling.view_team') ? (
              <button
                type="button"
                className="crm-desk__attention-row"
                onClick={() => navigate(scopedHref('/calling/queue', { view: 'unassigned' }))}
              >
                <span>Unassigned calls</span>
                <span className="crm-desk__attention-count">{attentionUnassigned.length}</span>
              </button>
            ) : null}
          </div>

          <div className="crm-desk__progress">
            <div className="crm-desk__progress-head">
              <span>Today's progress</span>
              <span>
                {todaysCompleted} of {todaysTotal || 0} completed
              </span>
            </div>
            <div className="crm-desk__progress-track">
              <div className="crm-desk__progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
