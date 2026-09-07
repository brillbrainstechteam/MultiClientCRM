import {
  Bot,
  MessageCirclePlus,
  Megaphone,
  PhoneCall,
  Plus,
  ShoppingBag,
  Upload,
  UserPlus,
  UserRoundPlus,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useWorkspace } from '@crm/app/workspace-context';
import { Popover } from '@crm/design-system';
import type { ModuleKey } from '@crm/mock-data';

interface QuickAction {
  key: string;
  label: string;
  icon: LucideIcon;
  module: ModuleKey;
  path: string;
  params?: Record<string, string>;
}

const quickActions: QuickAction[] = [
  { key: 'start-chat', label: 'Start a chat', icon: MessageCirclePlus, module: 'inbox', path: '/inbox', params: { compose: 'new' } },
  { key: 'add-contact', label: 'Add contact', icon: UserPlus, module: 'contacts', path: '/contacts/all', params: { drawer: 'contact', mode: 'add' } },
  { key: 'import-contacts', label: 'Import contacts', icon: Upload, module: 'contacts', path: '/contacts/imports/new/method' },
  { key: 'add-followup', label: 'Add follow-up', icon: PhoneCall, module: 'calling', path: '/calling', params: { drawer: 'add-followup' } },
  { key: 'create-campaign', label: 'Create campaign', icon: Megaphone, module: 'campaigns', path: '/campaigns/new' },
  { key: 'create-automation', label: 'Create automation', icon: Bot, module: 'automation', path: '/automation/new' },
  { key: 'add-product', label: 'Add product', icon: Plus, module: 'catalogue-orders', path: '/catalogue-orders', params: { drawer: 'add-product' } },
  { key: 'create-order', label: 'Create order', icon: ShoppingBag, module: 'catalogue-orders', path: '/catalogue-orders/new' },
  { key: 'invite-user', label: 'Invite user', icon: UserRoundPlus, module: 'team-access', path: '/team-access', params: { drawer: 'invite' } },
];

/**
 * DASH-S10 — Quick Actions. A launcher, not a wizard: every action hands off
 * immediately to its owning module. Options are limited to modules the acting
 * role can see (`visibleModules` already encodes the Agent-preset restriction).
 */
export function QuickActionsPopover() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const { visibleModules } = useWorkspace();

  const open = searchParams.get('popover') === 'quick-actions';

  const close = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('popover');
      return next;
    });

  if (!open) return null;

  const available = quickActions.filter((action) => visibleModules.includes(action.module));

  function go(action: QuickAction) {
    navigate(scopedHref(action.path, { ...action.params, returnTo: '/dashboard' }));
  }

  return (
    <Popover open={open} title="Quick actions" onClose={close}>
      <div className="crm-quick-actions__grid">
        {available.map((action) => {
          const Icon = action.icon;
          return (
            <button key={action.key} type="button" className="crm-quick-actions__item" onClick={() => go(action)}>
              <span className="crm-quick-actions__icon" aria-hidden="true">
                <Icon />
              </span>
              {action.label}
            </button>
          );
        })}
      </div>
    </Popover>
  );
}
