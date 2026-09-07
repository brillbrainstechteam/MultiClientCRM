import { Check } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useWorkspace } from '@crm/app/workspace-context';
import { Badge, Button, Popover } from '@crm/design-system';

interface SavedView {
  key: string;
  label: string;
  kind: 'personal' | 'admin-published';
  /** Roles this view is offered to — Manager-preset roles get Sales/Support/Operations. */
  roles: Array<'owner' | 'manager' | 'agent'>;
  apply: (params: URLSearchParams) => void;
}

const savedViews: SavedView[] = [
  {
    key: 'my-default',
    label: 'My Default',
    kind: 'personal',
    roles: ['owner', 'manager', 'agent'],
    apply: (params) => {
      for (const key of ['dateRange', 'comparisonPeriod', 'teamId']) params.delete(key);
    },
  },
  {
    key: 'management',
    label: 'Management',
    kind: 'admin-published',
    roles: ['owner'],
    apply: (params) => {
      params.set('dateRange', '30d');
      params.set('comparisonPeriod', 'previous-period');
      params.delete('teamId');
    },
  },
  {
    key: 'sales',
    label: 'Sales',
    kind: 'admin-published',
    roles: ['owner', 'manager'],
    apply: (params) => {
      // A team implies its branch — keep the scope combination valid (§10 cascading).
      params.set('branchId', 'branch_delhi');
      params.set('teamId', 'team_delhi_sales');
      params.set('dateRange', '7d');
    },
  },
  {
    key: 'support',
    label: 'Support',
    kind: 'admin-published',
    roles: ['owner', 'manager'],
    apply: (params) => {
      params.set('branchId', 'branch_delhi');
      params.set('teamId', 'team_delhi_support');
      params.set('dateRange', '7d');
    },
  },
  {
    key: 'operations',
    label: 'Operations',
    kind: 'admin-published',
    roles: ['owner', 'manager'],
    apply: (params) => {
      params.set('dateRange', 'today');
      params.delete('teamId');
    },
  },
];

/** DASH-S08 — Saved Views. Personal view plus role-permitted admin-published views. */
export function SavedViewsPopover() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { role } = useWorkspace();

  const open = searchParams.get('popover') === 'saved-views';
  const activeView = searchParams.get('view') ?? 'my-default';

  const close = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('popover');
      return next;
    });

  if (!open) return null;

  const available = savedViews.filter((view) => view.roles.includes(role));

  function select(view: SavedView) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('popover');
      next.set('view', view.key);
      view.apply(next);
      return next;
    });
  }

  return (
    <Popover
      open={open}
      title="Saved views"
      onClose={close}
      footer={
        role === 'owner' ? (
          <Button variant="secondary" onClick={() => navigate('/settings')}>
            Manage views
          </Button>
        ) : undefined
      }
    >
      <ul className="crm-saved-views__list">
        {available.map((view) => (
          <li key={view.key}>
            <button type="button" className="crm-saved-views__row" onClick={() => select(view)}>
              <span className="crm-saved-views__check" aria-hidden="true">
                {activeView === view.key ? <Check /> : null}
              </span>
              <span className="crm-saved-views__label">{view.label}</span>
              {view.kind === 'admin-published' ? (
                <Badge tone="neutral" appearance="outline">
                  Published
                </Badge>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </Popover>
  );
}
