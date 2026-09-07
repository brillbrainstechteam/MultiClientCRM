import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ALL_SCOPE, useWorkspace } from '@crm/app/workspace-context';
import { Button, Popover, Select } from '@crm/design-system';
import { teams } from '@crm/mock-data';

const dateRangeOptions = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'this-month', label: 'This month' },
];

const comparisonOptions = [
  { value: 'previous-period', label: 'Previous period' },
  { value: 'previous-month', label: 'Previous month' },
  { value: 'previous-year', label: 'Previous year' },
];

/**
 * DASH-S07 — Dashboard Filter. Date, team and comparison period; branch and
 * WhatsApp number are already the global ScopeBar so they are not repeated
 * here. Apply refreshes DASH-S01; Cancel discards the draft and preserves
 * whatever was previously applied.
 */
export function FiltersPopover() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { branchId } = useWorkspace();
  const open = searchParams.get('popover') === 'filters';

  // Cascading (§10): once a branch is scoped, only that branch's teams are offered.
  const cascadedTeams = branchId === ALL_SCOPE ? teams : teams.filter((team) => team.branchId === branchId);

  const [dateRange, setDateRange] = useState(searchParams.get('dateRange') ?? '7d');
  const [comparisonPeriod, setComparisonPeriod] = useState(searchParams.get('comparisonPeriod') ?? 'previous-period');
  const storedTeamId = searchParams.get('teamId') ?? '';
  const [teamId, setTeamId] = useState(
    cascadedTeams.some((team) => team.id === storedTeamId) ? storedTeamId : '',
  );

  const close = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('popover');
      return next;
    });

  if (!open) return null;

  function apply() {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('popover');
      next.set('dateRange', dateRange);
      next.set('comparisonPeriod', comparisonPeriod);
      if (teamId) next.set('teamId', teamId);
      else next.delete('teamId');
      return next;
    });
  }

  function clear() {
    setDateRange('7d');
    setComparisonPeriod('previous-period');
    setTeamId('');
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const key of ['popover', 'dateRange', 'comparisonPeriod', 'teamId']) next.delete(key);
      return next;
    });
  }

  return (
    <Popover
      open={open}
      title="Filters"
      onClose={close}
      footer={
        <>
          <Button variant="ghost" onClick={clear}>
            Clear
          </Button>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button variant="primary" onClick={apply}>
            Apply
          </Button>
        </>
      }
    >
      <Select label="Date range" options={dateRangeOptions} value={dateRange} onChange={(e) => setDateRange(e.target.value)} />
      <Select
        label="Comparison period"
        options={comparisonOptions}
        value={comparisonPeriod}
        onChange={(e) => setComparisonPeriod(e.target.value)}
      />
      <Select
        label="Team"
        options={[{ value: '', label: 'All teams' }, ...cascadedTeams.map((team) => ({ value: team.id, label: team.name }))]}
        value={teamId}
        onChange={(e) => setTeamId(e.target.value)}
      />
    </Popover>
  );
}
