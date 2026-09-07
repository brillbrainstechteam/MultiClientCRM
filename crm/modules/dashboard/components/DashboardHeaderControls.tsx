import { useState } from 'react';
import {
  Bookmark,
  Download,
  LayoutGrid,
  MoreVertical,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, IconButton, Select } from '@crm/design-system';
import { useDashboardHref } from '../dashboard-links';
import { dateRangeLabels, type DateRange } from '@crm/mock-data';
import { formatRelativeTime } from '../dashboard-presentation';

export interface DashboardHeaderControlsProps {
  lastUpdatedIso: string;
  nowIso: string;
  onRefresh: () => void;
  refreshing: boolean;
  canCustomise: boolean;
  canExport: boolean;
}

const rangeOrder: DateRange[] = ['today', '7d', '30d', 'this-month'];

/**
 * Dashboard header controls: date filter, refresh, New message, and a ⋯ menu
 * holding the low-frequency Saved views / Export / Customise actions (kept out
 * of the primary row per the redesign brief). Search, profile, notifications
 * and the branch/number filters remain in the global TopBar/ScopeBar.
 */
export function DashboardHeaderControls({
  lastUpdatedIso,
  nowIso,
  onRefresh,
  refreshing,
  canCustomise,
  canExport,
}: DashboardHeaderControlsProps) {
  const navigate = useNavigate();
  const dashHref = useDashboardHref();
  const [searchParams, setSearchParams] = useSearchParams();
  const [menuOpen, setMenuOpen] = useState(false);

  const dateRange = (searchParams.get('dateRange') as DateRange) ?? '7d';

  const setDateRange = (value: string) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('dateRange', value);
      return next;
    });

  const goto = (params: Record<string, string>) => {
    setMenuOpen(false);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(params)) next.set(k, v);
      return next;
    });
  };

  return (
    <div className="crm-dash-header-controls">
      <Select
        label="Date range"
        hideLabel
        size="sm"
        options={rangeOrder.map((r) => ({ value: r, label: dateRangeLabels[r] }))}
        value={dateRange}
        onChange={(e) => setDateRange(e.target.value)}
      />

      <span className="crm-dash-header-controls__updated">
        {refreshing ? 'Updating…' : `Updated ${formatRelativeTime(lastUpdatedIso, nowIso)}`}
      </span>
      <IconButton
        label="Refresh dashboard"
        icon={<RefreshCw className={refreshing ? 'crm-dash-header-controls__spin' : undefined} />}
        onClick={onRefresh}
      />

      <Button
        variant="primary"
        size="sm"
        iconLeft={<Plus />}
        onClick={() => navigate(dashHref('/inbox?compose=new&returnTo=%2Fdashboard'))}
      >
        New message
      </Button>

      <div className="crm-dash-menu">
        <IconButton
          label="More dashboard actions"
          icon={<MoreVertical />}
          variant="outline"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
        />
        {menuOpen ? (
          <>
            <button className="crm-dash-menu__backdrop" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
            <div className="crm-dash-menu__panel" role="menu">
              <button className="crm-dash-menu__item" role="menuitem" onClick={() => goto({ popover: 'saved-views' })}>
                <Bookmark aria-hidden="true" /> Saved views
              </button>
              {canExport ? (
                <button className="crm-dash-menu__item" role="menuitem" onClick={() => goto({ modal: 'export' })}>
                  <Download aria-hidden="true" /> Export
                </button>
              ) : null}
              {canCustomise ? (
                <button className="crm-dash-menu__item" role="menuitem" onClick={() => goto({ mode: 'customise' })}>
                  <LayoutGrid aria-hidden="true" /> Customise dashboard
                </button>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
