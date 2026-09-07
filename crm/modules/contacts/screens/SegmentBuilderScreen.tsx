import { useMemo, useRef, useState } from 'react';
import { Eye, Plus, Save, Trash2, TriangleAlert } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useWorkspace } from '@crm/app/workspace-context';
import {
  Button,
  IconButton,
  Input,
  Select,
  Textarea,
  type SelectOption,
} from '@crm/design-system';
import { ALL_SCOPE } from '@crm/app/workspace-context';
import { branches, findSegment } from '@crm/mock-data';
import type { ConditionJoiner, Segment, SegmentConditionGroup } from '@crm/mock-data';
import {
  evaluateSegment,
  fieldDef,
  fieldDefs,
  isValuelessOperator,
  operatorLabels,
} from '../segment-eval';

/**
 * CON-S06 — Segment Builder (new + edit). Dynamic vs Snapshot, AND/OR condition
 * groups, a live match count and a zero-match warning. Reuses shared controls.
 */
export default function SegmentBuilderScreen() {
  const { segmentId } = useParams();
  const existing = segmentId ? findSegment(segmentId) : undefined;
  // Key by target so switching between new/edit (same component type) remounts
  // and re-seeds field state from the correct segment.
  return <SegmentBuilderForm key={segmentId ?? 'new'} existing={existing} />;
}

function SegmentBuilderForm({ existing }: { existing: Segment | undefined }) {
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const { availableBranches } = useWorkspace();

  const idCounter = useRef(0);
  const nextId = (prefix: string) => `${prefix}_${(idCounter.current += 1)}`;

  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [type, setType] = useState<'dynamic' | 'snapshot'>(existing?.type ?? 'dynamic');
  const [branchId, setBranchId] = useState(existing?.scope.branchId ?? ALL_SCOPE);
  const [groupJoiner, setGroupJoiner] = useState<ConditionJoiner>(existing?.groupJoiner ?? 'and');
  const [groups, setGroups] = useState<SegmentConditionGroup[]>(
    existing?.conditionGroups && existing.conditionGroups.length
      ? existing.conditionGroups
      : [freshGroup('group_seed', 'cond_seed')],
  );

  function freshGroup(gid: string, cid: string): SegmentConditionGroup {
    return {
      id: gid,
      joiner: 'and',
      conditions: [{ id: cid, field: 'stage', operator: 'is', value: 'qualified' }],
    };
  }

  const matches = useMemo(
    () =>
      evaluateSegment({
        groups,
        groupJoiner,
        scope: { branchId: branchId === ALL_SCOPE ? null : branchId },
      }),
    [groups, groupJoiner, branchId],
  );
  const zeroMatch = matches.length === 0;

  /* ---- Group / condition mutations ------------------------------------- */
  const updateGroup = (gid: string, patch: Partial<SegmentConditionGroup>) =>
    setGroups((prev) => prev.map((g) => (g.id === gid ? { ...g, ...patch } : g)));

  const addCondition = (gid: string) =>
    setGroups((prev) =>
      prev.map((g) =>
        g.id === gid
          ? { ...g, conditions: [...g.conditions, { id: nextId('cond'), field: 'stage', operator: 'is', value: 'qualified' }] }
          : g,
      ),
    );

  const removeCondition = (gid: string, cid: string) =>
    setGroups((prev) =>
      prev
        .map((g) => (g.id === gid ? { ...g, conditions: g.conditions.filter((c) => c.id !== cid) } : g))
        .filter((g) => g.conditions.length > 0),
    );

  const updateCondition = (gid: string, cid: string, patch: Partial<{ field: string; operator: string; value: string }>) =>
    setGroups((prev) =>
      prev.map((g) =>
        g.id === gid
          ? {
              ...g,
              conditions: g.conditions.map((c) => {
                if (c.id !== cid) return c;
                const nextField = patch.field ?? c.field;
                // When the field changes, reset operator/value to sensible defaults.
                if (patch.field && patch.field !== c.field) {
                  const def = fieldDef(patch.field);
                  const op = def?.operators[0] ?? 'is';
                  const val = def?.type === 'enum' ? def.options?.[0]?.value ?? '' : '';
                  return { ...c, field: nextField, operator: op, value: val };
                }
                return { ...c, ...patch } as typeof c;
              }),
            }
          : g,
      ),
    );

  const addGroup = () =>
    setGroups((prev) => [...prev, freshGroup(nextId('group'), nextId('cond'))]);

  const removeGroup = (gid: string) => setGroups((prev) => prev.filter((g) => g.id !== gid));

  const isEdit = Boolean(existing);
  const canSave = name.trim().length > 0;

  const onSave = () => {
    // Prototype: no persistence — return to the (existing or list) detail view.
    navigate(scopedHref(existing ? `/contacts/segments/${existing.id}` : '/contacts/segments'));
  };

  const fieldOptions: SelectOption[] = fieldDefs.map((f) => ({ value: f.key, label: f.label }));

  return (
    <div className="crm-sb">
      <PageHeader
        breadcrumbs={[
          { label: 'Contacts', to: scopedHref('/contacts') },
          { label: 'Segments', to: scopedHref('/contacts/segments') },
          { label: isEdit ? 'Edit' : 'New segment' },
        ]}
        title={isEdit ? `Edit · ${existing?.name}` : 'Segment Builder'}
        description="Define who belongs to this audience. The match count updates as you edit."
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              iconLeft={<Eye />}
              onClick={() => navigate(scopedHref('/contacts/all'))}
            >
              Preview in list
            </Button>
            <Button variant="primary" iconLeft={<Save />} onClick={onSave} disabled={!canSave} title={canSave ? undefined : 'Name the segment first'}>
              {isEdit ? 'Save changes' : 'Save segment'}
            </Button>
          </>
        }
      />

      <div className="crm-sb__layout">
        <div className="crm-sb__main">
          <section className="crm-sb__card">
            <div className="crm-sb__row2">
              <Input label="Segment name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. High-value · Delhi" />
              <Select
                label="Scope — branch"
                options={[{ value: ALL_SCOPE, label: 'All branches' }, ...(availableBranches.length ? availableBranches : branches).map((b) => ({ value: b.id, label: b.name }))]}
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
              />
            </div>
            <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} hint="Optional — helps teammates understand the audience" />

            <fieldset className="crm-sb__type">
              <legend>Segment type</legend>
              <label className={`crm-sb__type-opt${type === 'dynamic' ? ' crm-sb__type-opt--active' : ''}`}>
                <input type="radio" name="seg-type" checked={type === 'dynamic'} onChange={() => setType('dynamic')} />
                <span>
                  <strong>Dynamic</strong>
                  <span className="crm-sb__type-desc">Recalculates automatically as contacts change.</span>
                </span>
              </label>
              <label className={`crm-sb__type-opt${type === 'snapshot' ? ' crm-sb__type-opt--active' : ''}`}>
                <input type="radio" name="seg-type" checked={type === 'snapshot'} onChange={() => setType('snapshot')} />
                <span>
                  <strong>Snapshot</strong>
                  <span className="crm-sb__type-desc">Freezes the current matches at save time.</span>
                </span>
              </label>
            </fieldset>
          </section>

          <section className="crm-sb__card">
            <div className="crm-sb__conditions-head">
              <h2 className="crm-sb__section-title">Conditions</h2>
              {groups.length > 1 ? (
                <JoinerToggle value={groupJoiner} onChange={setGroupJoiner} ariaLabel="Combine groups with" />
              ) : null}
            </div>

            {groups.map((group, gi) => (
              <div key={group.id}>
                {gi > 0 ? <div className="crm-sb__group-joiner">{groupJoiner.toUpperCase()}</div> : null}
                <div className="crm-sb__group">
                  <div className="crm-sb__group-head">
                    <JoinerToggle value={group.joiner} onChange={(j) => updateGroup(group.id, { joiner: j })} ariaLabel="Combine conditions with" />
                    {groups.length > 1 ? (
                      <IconButton label="Remove group" icon={<Trash2 />} size="sm" onClick={() => removeGroup(group.id)} />
                    ) : null}
                  </div>

                  {group.conditions.map((cond, ci) => {
                    const def = fieldDef(cond.field);
                    const opOptions: SelectOption[] = (def?.operators ?? []).map((op) => ({ value: op, label: operatorLabels[op] }));
                    return (
                      <div key={cond.id} className="crm-sb__cond">
                        <span className="crm-sb__cond-joiner">{ci === 0 ? 'Where' : group.joiner.toUpperCase()}</span>
                        <Select label="Field" hideLabel size="sm" options={fieldOptions} value={cond.field} onChange={(e) => updateCondition(group.id, cond.id, { field: e.target.value })} />
                        <Select label="Operator" hideLabel size="sm" options={opOptions} value={cond.operator} onChange={(e) => updateCondition(group.id, cond.id, { operator: e.target.value })} />
                        {isValuelessOperator(cond.operator) ? (
                          <span className="crm-sb__cond-novalue">—</span>
                        ) : def?.type === 'enum' ? (
                          <Select label="Value" hideLabel size="sm" options={def.options ?? []} value={cond.value} onChange={(e) => updateCondition(group.id, cond.id, { value: e.target.value })} />
                        ) : (
                          <Input label="Value" hideLabel value={cond.value} onChange={(e) => updateCondition(group.id, cond.id, { value: e.target.value })} placeholder={def?.type === 'date' ? 'days' : 'value'} />
                        )}
                        <IconButton label="Remove condition" icon={<Trash2 />} size="sm" onClick={() => removeCondition(group.id, cond.id)} />
                      </div>
                    );
                  })}

                  <Button variant="ghost" size="sm" iconLeft={<Plus />} onClick={() => addCondition(group.id)}>
                    Add condition
                  </Button>
                </div>
              </div>
            ))}

            <Button variant="secondary" size="sm" iconLeft={<Plus />} onClick={addGroup}>
              Add condition group
            </Button>
          </section>
        </div>

        <aside className="crm-sb__side">
          <div className="crm-sb__match">
            <span className="crm-sb__match-label">Live match count</span>
            <span className="crm-sb__match-count">{matches.length}</span>
            <span className="crm-sb__match-note">contacts in the current sample</span>
          </div>
          {zeroMatch ? (
            <div className="crm-sb__warn">
              <TriangleAlert aria-hidden="true" />
              <div>
                <strong>No contacts match</strong>
                <p>This is allowed, but the segment will be empty until a contact qualifies.</p>
              </div>
            </div>
          ) : (
            <div className="crm-sb__sample">
              <span className="crm-sb__sample-title">Sample</span>
              <ul>
                {matches.slice(0, 5).map((c) => (
                  <li key={c.id}>{c.name}</li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function JoinerToggle({
  value,
  onChange,
  ariaLabel,
}: {
  value: ConditionJoiner;
  onChange: (j: ConditionJoiner) => void;
  ariaLabel: string;
}) {
  return (
    <div className="crm-joiner" role="group" aria-label={ariaLabel}>
      {(['and', 'or'] as const).map((j) => (
        <button
          key={j}
          type="button"
          className={value === j ? 'crm-joiner__btn crm-joiner__btn--active' : 'crm-joiner__btn'}
          aria-pressed={value === j}
          onClick={() => onChange(j)}
        >
          {j.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
