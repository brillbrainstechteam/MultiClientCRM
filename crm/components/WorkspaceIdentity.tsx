import { useWorkspace } from '@crm/app/workspace-context';

const planLabel: Record<string, string> = {
  starter: 'Starter',
  growth: 'Growth',
  enterprise: 'Enterprise',
};

/**
 * Sidebar brand header. The product wordmark uses Montserrat (brand mark only);
 * the gold tile is the persistent rationed-gold moment. The tenant workspace and
 * plan sit below as functional (Inter) context so multi-tenancy stays visible.
 */
export function WorkspaceIdentity() {
  const { workspace } = useWorkspace();

  return (
    <div className="crm-brand">
      <div className="crm-brand__lockup">
        <span className="crm-brand__tile" aria-hidden="true">
          TT
        </span>
        <span className="crm-brand__wordmark">TalkTrack</span>
      </div>
      <div className="crm-brand__workspace">
        <span className="crm-brand__workspace-name" title={workspace.name}>
          {workspace.name}
        </span>
        <span className="crm-brand__plan">{planLabel[workspace.plan] ?? workspace.plan}</span>
      </div>
    </div>
  );
}
