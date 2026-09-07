import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useWorkspace } from '@crm/app/workspace-context';
import {
  Badge,
  Button,
  Checkbox,
  Input,
  Select,
  WizardShell,
  type StepperItem,
} from '@crm/design-system';
import { branches, contacts as allContacts, findSegment, findUser, segments, users, type Contact } from '@crm/mock-data';
import { evaluateSegment } from '@crm/modules/contacts/segment-eval';
import { useCallingData } from '../calling-data-context';
import { callingNumbers } from '../data';
import { isOpenTask } from '../calling-selectors';
import { referenceNow, type CallList, type CallTask } from '../domain';

type AudienceMode = 'segment' | 'filters' | 'manual';
type AssignMode = 'single' | 'equal' | 'owner' | 'manual';

const steps: StepperItem[] = [
  { id: 'audience', label: 'Audience' },
  { id: 'assignment', label: 'Assignment' },
  { id: 'review', label: 'Review' },
];

/** CALL-W01–W03 — Create Call List wizard. One route, three query-driven steps. */
export default function CreateCallListWizard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const { currentUser } = useWorkspace();
  const { tasks, addList, addTasks } = useCallingData();

  const step = searchParams.get('step') ?? 'audience';
  const prefilledSegmentId = searchParams.get('segmentId');

  const todayStr = referenceNow().toISOString().slice(0, 10);
  const [name, setName] = useState('');
  const [callDate, setCallDate] = useState(todayStr);
  const [creationDate, setCreationDate] = useState(todayStr);
  const [audienceMode, setAudienceMode] = useState<AudienceMode>(prefilledSegmentId ? 'segment' : 'filters');
  const [segmentId, setSegmentId] = useState(prefilledSegmentId ?? '');
  const [stageFilter, setStageFilter] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [manualIncluded, setManualIncluded] = useState<Set<string>>(new Set());
  const [manualExcluded, setManualExcluded] = useState<Set<string>>(new Set());
  const [includeConflicts, setIncludeConflicts] = useState<Set<string>>(new Set());
  const [assignMode, setAssignMode] = useState<AssignMode>('equal');
  const [singleAgentId, setSingleAgentId] = useState('');
  const [equalAgentIds, setEqualAgentIds] = useState<string[]>([]);
  const [assigneeOverrides, setAssigneeOverrides] = useState<Record<string, string>>({});

  const agents = users.filter((u) => u.role === 'agent' || u.role === 'manager');

  const goStep = (id: string) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('step', id);
      return next;
    });

  const cancel = () => navigate(scopedHref('/calling/lists'));

  const baseAudience: Contact[] = useMemo(() => {
    if (audienceMode === 'segment') {
      const segment = segmentId ? findSegment(segmentId) : undefined;
      if (!segment) return [];
      return evaluateSegment({
        groups: segment.conditionGroups ?? [],
        groupJoiner: segment.groupJoiner ?? 'and',
        scope: segment.scope,
      });
    }
    if (audienceMode === 'filters') {
      return allContacts.filter(
        (c) =>
          (!stageFilter || c.stage === stageFilter) &&
          (!tierFilter || c.salesTier === tierFilter) &&
          (!tagFilter || c.tags.includes(tagFilter)) &&
          (!branchFilter || c.branchId === branchFilter),
      );
    }
    return [];
  }, [audienceMode, segmentId, stageFilter, tierFilter, tagFilter, branchFilter]);

  const audience: Contact[] = useMemo(() => {
    if (audienceMode === 'manual') {
      return allContacts.filter((c) => manualIncluded.has(c.id));
    }
    const included = baseAudience.filter((c) => !manualExcluded.has(c.id));
    const extra = allContacts.filter((c) => manualIncluded.has(c.id) && !included.some((x) => x.id === c.id));
    return [...included, ...extra];
  }, [audienceMode, baseAudience, manualExcluded, manualIncluded]);

  const missingPhone = audience.filter((c) => !c.mobile);
  const duplicateActive = audience.filter((c) => tasks.some((t) => t.contactId === c.id && isOpenTask(t)));
  const duplicateActiveIds = new Set(duplicateActive.map((c) => c.id));
  const excludedForConflict = duplicateActive.filter((c) => !includeConflicts.has(c.id));
  const eligible = audience.filter(
    (c) => c.mobile && (!duplicateActiveIds.has(c.id) || includeConflicts.has(c.id)),
  );

  const toggleEqualAgent = (id: string) =>
    setEqualAgentIds((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));

  const defaultAssigneeFor = (contact: Contact, index: number): string | null => {
    if (assignMode === 'single') return singleAgentId || null;
    if (assignMode === 'equal') return equalAgentIds.length > 0 ? equalAgentIds[index % equalAgentIds.length] : null;
    if (assignMode === 'owner') return contact.ownerId || null;
    return assigneeOverrides[contact.id] ?? null;
  };

  const assigneeFor = (contact: Contact, index: number): string | null =>
    assignMode === 'manual'
      ? (assigneeOverrides[contact.id] ?? null)
      : (assigneeOverrides[contact.id] ?? defaultAssigneeFor(contact, index));

  const assignmentSummary = useMemo(() => {
    const counts: Record<string, number> = {};
    eligible.forEach((contact, index) => {
      const id = assigneeFor(contact, index) ?? 'unassigned';
      counts[id] = (counts[id] ?? 0) + 1;
    });
    return counts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligible, assignMode, singleAgentId, equalAgentIds, assigneeOverrides]);

  const canContinueAudience = name.trim().length > 0 && eligible.length > 0;
  const canContinueAssignment =
    assignMode === 'single' ? !!singleAgentId : assignMode === 'equal' ? equalAgentIds.length > 0 : true;

  const createList = () => {
    const listId = `list_${Date.now()}`;
    // Tasks are due on the scheduled call date (09:00), else in 4 hours.
    const dueAt = callDate
      ? new Date(`${callDate}T09:00:00+05:30`).toISOString()
      : new Date(referenceNow().getTime() + 4 * 60 * 60 * 1000).toISOString();
    const newTasks: CallTask[] = eligible.map((contact, index) => {
      const number =
        callingNumbers.find((n) => n.branchId === contact.branchId && n.providerConnected) ??
        callingNumbers.find((n) => n.branchId === contact.branchId) ??
        callingNumbers[0];
      return {
        id: `task_${listId}_${contact.id}`,
        contactId: contact.id,
        contactOwnerId: contact.ownerId,
        assigneeId: assigneeFor(contact, index),
        branchId: contact.branchId,
        teamId: null,
        numberId: number?.id ?? 'cn_delhi_sales',
        dueAt,
        source: `Call List: ${name.trim()}`,
        listId,
        reasonTag: 'standard',
        status: 'scheduled',
        latestDisposition: null,
        attemptCount: 0,
        createdAt: new Date().toISOString(),
        followUpOfTaskId: null,
        followUpReason: null,
      };
    });

    const branchCounts = new Map<string, number>();
    for (const t of newTasks) branchCounts.set(t.branchId, (branchCounts.get(t.branchId) ?? 0) + 1);
    const listBranchId =
      [...branchCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? currentUser.branchId;

    const assigneeIds = [
      ...new Set(newTasks.map((t) => t.assigneeId).filter((id): id is string => Boolean(id))),
    ];

    const newList: CallList = {
      id: listId,
      name: name.trim(),
      status: 'active',
      source:
        audienceMode === 'segment' && segmentId
          ? `Segment: ${findSegment(segmentId)?.name ?? 'Selected segment'}`
          : audienceMode === 'filters'
            ? 'Filtered audience'
            : 'Manual selection',
      branchId: listBranchId,
      teamId: null,
      ownerId: currentUser.id,
      assigneeIds,
      createdAt: creationDate ? new Date(`${creationDate}T09:00:00+05:30`).toISOString() : new Date().toISOString(),
      callDate: callDate ? new Date(`${callDate}T09:00:00+05:30`).toISOString() : null,
      taskIds: newTasks.map((t) => t.id),
      closedNote: null,
    };

    addList(newList);
    addTasks(newTasks);
    navigate(scopedHref(`/calling/lists/${listId}`));
  };

  const stageOptions = [
    { value: '', label: 'Any lifecycle stage' },
    { value: 'new', label: 'New' },
    { value: 'engaged', label: 'Engaged' },
    { value: 'qualified', label: 'Qualified' },
    { value: 'customer', label: 'Customer' },
    { value: 'dormant', label: 'Dormant' },
  ];
  const tierOptions = [
    { value: '', label: 'Any sales tier' },
    { value: 'platinum', label: 'Platinum' },
    { value: 'gold', label: 'Gold' },
    { value: 'silver', label: 'Silver' },
    { value: 'standard', label: 'Standard' },
  ];
  const branchOptions = [{ value: '', label: 'Any branch' }, ...branches.map((b) => ({ value: b.id, label: b.name }))];
  const distinctTags = [...new Set(allContacts.flatMap((c) => c.tags))].sort();
  const tagOptions = [{ value: '', label: 'Any tag' }, ...distinctTags.map((t) => ({ value: t, label: t }))];

  return (
    <WizardShell
      title="Create Call List"
      subtitle="Select an audience, assign the work, then review before creating call tasks."
      steps={steps}
      currentId={step}
      onCancel={cancel}
      footer={renderFooter()}
    >
      {step === 'audience' ? renderAudience() : step === 'assignment' ? renderAssignment() : renderReview()}
    </WizardShell>
  );

  function renderAudience() {
    return (
      <div className="crm-listwiz">
        <Input label="List name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Diwali Outreach — Delhi" required />

        <div className="crm-listwiz__schedule">
          <Input
            label="Call date"
            type="date"
            value={callDate}
            onChange={(e) => setCallDate(e.target.value)}
            hint="When these calls should be made"
          />
          <Input
            label="Creation date"
            type="date"
            value={creationDate}
            onChange={(e) => setCreationDate(e.target.value)}
            hint="Defaults to today"
          />
        </div>

        <div className="crm-listwiz__mode">
          {(['segment', 'filters', 'manual'] as AudienceMode[]).map((mode) => (
            <label key={mode} className="crm-listwiz__radio">
              <input type="radio" name="audience-mode" checked={audienceMode === mode} onChange={() => setAudienceMode(mode)} />
              {mode === 'segment' ? 'Saved segment' : mode === 'filters' ? 'Lifecycle / tag / attributes' : 'Manually select'}
            </label>
          ))}
        </div>

        {audienceMode === 'segment' ? (
          <Select
            label="Segment"
            options={[{ value: '', label: 'Choose a segment…' }, ...segments.map((s) => ({ value: s.id, label: `${s.name} (~${s.count})` }))]}
            value={segmentId}
            onChange={(e) => setSegmentId(e.target.value)}
          />
        ) : null}

        {audienceMode === 'filters' ? (
          <div className="crm-listwiz__filters">
            <Select label="Lifecycle stage" hideLabel options={stageOptions} value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} />
            <Select label="Sales tier" hideLabel options={tierOptions} value={tierFilter} onChange={(e) => setTierFilter(e.target.value)} />
            <Select label="Tag" hideLabel options={tagOptions} value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} />
            <Select label="Branch" hideLabel options={branchOptions} value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} />
          </div>
        ) : null}

        {audienceMode === 'manual' ? (
          <div className="crm-listwiz__manual">
            {allContacts.map((c) => (
              <Checkbox
                key={c.id}
                label={`${c.name}${c.company ? ` — ${c.company}` : ''}`}
                checked={manualIncluded.has(c.id)}
                onChange={() =>
                  setManualIncluded((prev) => {
                    const next = new Set(prev);
                    if (next.has(c.id)) next.delete(c.id);
                    else next.add(c.id);
                    return next;
                  })
                }
              />
            ))}
          </div>
        ) : (
          audience.length > 0 && (
            <div className="crm-listwiz__preview">
              <p className="crm-listwiz__preview-title">
                {audience.length} contact{audience.length === 1 ? '' : 's'} matched — deselect any that should not be included.
              </p>
              <ul>
                {audience.map((c) => (
                  <li key={c.id}>
                    <Checkbox
                      label={c.name}
                      checked={!manualExcluded.has(c.id)}
                      onChange={() =>
                        setManualExcluded((prev) => {
                          const next = new Set(prev);
                          if (next.has(c.id)) next.delete(c.id);
                          else next.add(c.id);
                          return next;
                        })
                      }
                    />
                  </li>
                ))}
              </ul>
            </div>
          )
        )}

        <div className="crm-listwiz__summary">
          <div className="crm-listwiz__stat">
            <span className="crm-listwiz__stat-value">{audience.length}</span>
            <span className="crm-listwiz__stat-label">In audience</span>
          </div>
          <div className="crm-listwiz__stat">
            <span className="crm-listwiz__stat-value">{eligible.length}</span>
            <span className="crm-listwiz__stat-label">Eligible</span>
          </div>
          <div className="crm-listwiz__stat">
            <span className="crm-listwiz__stat-value">{missingPhone.length}</span>
            <span className="crm-listwiz__stat-label">Missing phone</span>
          </div>
          <div className="crm-listwiz__stat">
            <span className="crm-listwiz__stat-value">{duplicateActive.length}</span>
            <span className="crm-listwiz__stat-label">Duplicate active task</span>
          </div>
        </div>

        {duplicateActive.length > 0 ? (
          <div className="crm-listwiz__conflicts">
            <h3>Contacts with an existing open call</h3>
            <p className="crm-listwiz__muted">
              Excluded by default so this list does not create a duplicate active task. Include anyway if this list is for a
              different purpose.
            </p>
            <ul>
              {duplicateActive.map((c) => (
                <li key={c.id}>
                  <Checkbox
                    label={`Create another call for ${c.name} anyway`}
                    checked={includeConflicts.has(c.id)}
                    onChange={() =>
                      setIncludeConflicts((prev) => {
                        const next = new Set(prev);
                        if (next.has(c.id)) next.delete(c.id);
                        else next.add(c.id);
                        return next;
                      })
                    }
                  />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    );
  }

  function renderAssignment() {
    return (
      <div className="crm-listwiz">
        <p className="crm-listwiz__note">
          Assigning here sets <strong>Call Assignee</strong> only. <strong>Contact Owner</strong> is never changed.
        </p>

        <div className="crm-listwiz__mode">
          {(['equal', 'single', 'owner', 'manual'] as AssignMode[]).map((mode) => (
            <label key={mode} className="crm-listwiz__radio">
              <input type="radio" name="assign-mode" checked={assignMode === mode} onChange={() => setAssignMode(mode)} />
              {mode === 'equal'
                ? 'Distribute equally'
                : mode === 'single'
                  ? 'Assign to one agent'
                  : mode === 'owner'
                    ? 'Keep contact owner as assignee'
                    : 'Set individually'}
            </label>
          ))}
        </div>

        {assignMode === 'single' ? (
          <Select
            label="Assign to"
            options={[{ value: '', label: 'Choose an agent…' }, ...agents.map((a) => ({ value: a.id, label: `${a.name} — ${a.roleLabel}` }))]}
            value={singleAgentId}
            onChange={(e) => setSingleAgentId(e.target.value)}
          />
        ) : null}

        {assignMode === 'equal' ? (
          <fieldset className="crm-listwiz__equal">
            <legend>Distribute across</legend>
            {agents.map((agent) => (
              <Checkbox key={agent.id} label={agent.name} checked={equalAgentIds.includes(agent.id)} onChange={() => toggleEqualAgent(agent.id)} />
            ))}
          </fieldset>
        ) : null}

        <div className="crm-listwiz__table">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Contact owner</th>
                <th>Call assignee</th>
              </tr>
            </thead>
            <tbody>
              {eligible.map((contact, index) => {
                const owner = findUser(contact.ownerId);
                const assignee = assigneeFor(contact, index);
                return (
                  <tr key={contact.id}>
                    <td>{contact.name}</td>
                    <td>{owner ? owner.name : 'Unowned'}</td>
                    <td>
                      {assignMode === 'manual' ? (
                        <Select
                          label={`Assignee for ${contact.name}`}
                          hideLabel
                          size="sm"
                          options={[{ value: '', label: 'Unassigned' }, ...agents.map((a) => ({ value: a.id, label: a.name }))]}
                          value={assigneeOverrides[contact.id] ?? ''}
                          onChange={(e) =>
                            setAssigneeOverrides((prev) => ({ ...prev, [contact.id]: e.target.value }))
                          }
                        />
                      ) : (
                        <span>{assignee ? findUser(assignee)?.name ?? assignee : 'Unassigned'}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderReview() {
    return (
      <div className="crm-listwiz">
        <section className="crm-listwiz__review-section">
          <h3>List</h3>
          <p>
            <strong>{name || 'Untitled list'}</strong>
          </p>
          <p className="crm-listwiz__muted">
            Audience source:{' '}
            {audienceMode === 'segment'
              ? (segmentId ? findSegment(segmentId)?.name : 'No segment selected')
              : audienceMode === 'filters'
                ? 'Filtered contacts'
                : 'Manually selected contacts'}
          </p>
        </section>

        <section className="crm-listwiz__review-section">
          <h3>Audience</h3>
          <div className="crm-listwiz__summary">
            <div className="crm-listwiz__stat">
              <span className="crm-listwiz__stat-value">{audience.length}</span>
              <span className="crm-listwiz__stat-label">In audience</span>
            </div>
            <div className="crm-listwiz__stat">
              <span className="crm-listwiz__stat-value">{eligible.length}</span>
              <span className="crm-listwiz__stat-label">Will get a call task</span>
            </div>
            <div className="crm-listwiz__stat">
              <span className="crm-listwiz__stat-value">{excludedForConflict.length}</span>
              <span className="crm-listwiz__stat-label">Excluded — duplicate active task</span>
            </div>
          </div>
          {excludedForConflict.length > 0 ? (
            <ul className="crm-listwiz__exclusion-list">
              {excludedForConflict.map((c) => (
                <li key={c.id}>{c.name} — already has an open call</li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className="crm-listwiz__review-section">
          <h3>Assignment summary</h3>
          <ul className="crm-listwiz__assignment-summary">
            {Object.entries(assignmentSummary).map(([agentId, count]) => (
              <li key={agentId}>
                <Badge tone="neutral" appearance="outline">
                  {agentId === 'unassigned' ? 'Unassigned' : findUser(agentId)?.name ?? agentId}
                </Badge>
                <span>
                  {count} call{count === 1 ? '' : 's'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    );
  }

  function renderFooter() {
    if (step === 'audience') {
      return (
        <>
          <Button variant="secondary" onClick={cancel}>
            Cancel
          </Button>
          <Button variant="primary" iconRight={<ArrowRight />} disabled={!canContinueAudience} onClick={() => goStep('assignment')}>
            Continue
          </Button>
        </>
      );
    }
    if (step === 'assignment') {
      return (
        <>
          <Button variant="secondary" iconLeft={<ArrowLeft />} onClick={() => goStep('audience')}>
            Back
          </Button>
          <Button variant="primary" iconRight={<ArrowRight />} disabled={!canContinueAssignment} onClick={() => goStep('review')}>
            Continue
          </Button>
        </>
      );
    }
    return (
      <>
        <Button variant="secondary" iconLeft={<ArrowLeft />} onClick={() => goStep('assignment')}>
          Back
        </Button>
        <Button variant="primary" iconLeft={<Check />} onClick={createList}>
          Create Call List
        </Button>
      </>
    );
  }
}
