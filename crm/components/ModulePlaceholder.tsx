import { ArrowLeft } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useWorkspace } from '@crm/app/workspace-context';
import { Badge, Button, PermissionRestricted } from '@crm/design-system';
import { findContact, findTeam, findUser } from '@crm/mock-data';
import type { ModuleKey } from '@crm/mock-data';
import { findNavItem } from '@crm/routes/navigation';
import { PageHeader } from './PageHeader';

/**
 * Context keys a module may be handed on entry
 * (05_ROUTE_AND_STATE_CONVENTIONS.md). Scope keys (`role`, `branchId`,
 * `whatsappNumberId`) are rendered by the ScopeBar instead of here.
 */
const contextKeys = [
  'contactId',
  'segmentId',
  'campaignId',
  'orderId',
  'automationId',
  'teamId',
  'userId',
  'status',
  'dateRange',
  'source',
] as const;

/** Resolves an incoming ID to a human label so reviewers can read the handoff. */
function describe(key: string, value: string): string {
  switch (key) {
    case 'contactId':
      return findContact(value)?.name ?? value;
    case 'userId':
      return findUser(value)?.name ?? value;
    case 'teamId':
      return findTeam(value)?.name ?? value;
    default:
      return value;
  }
}

export interface ModulePlaceholderProps {
  moduleKey: ModuleKey;
}

/**
 * Standard holding screen for a module whose screen architecture has not been
 * normalised yet. It states what the module will own and echoes the context it
 * received — it deliberately does NOT design the pending module (CLAUDE.md §8).
 */
export function ModulePlaceholder({ moduleKey }: ModulePlaceholderProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { visibleModules, branch, whatsappNumber, currentUser } = useWorkspace();
  const navItem = findNavItem(moduleKey);

  if (!navItem) {
    return null;
  }

  if (!visibleModules.includes(moduleKey)) {
    return (
      <PermissionRestricted
        title="You do not have access to this area"
        description={`Your role (${currentUser.roleLabel}) cannot open ${navItem.label}. Ask a workspace owner if you need access.`}
        actions={
          <Button variant="secondary" onClick={() => navigate('/dashboard')}>
            Go to Dashboard
          </Button>
        }
      />
    );
  }

  type ContextEntry = { key: (typeof contextKeys)[number]; value: string };
  const receivedContext = contextKeys
    .map((key) => ({ key, value: searchParams.get(key) }))
    .filter((entry): entry is ContextEntry => entry.value !== null);

  const returnTo = searchParams.get('returnTo');
  const scopeSummary = [
    branch ? `Branch: ${branch.name}` : 'Branch: all branches in scope',
    whatsappNumber
      ? `WhatsApp number: ${whatsappNumber.displayName} (${whatsappNumber.displayNumber})`
      : 'WhatsApp number: all numbers in scope',
  ];

  return (
    <div className="crm-placeholder">
      <PageHeader
        title={navItem.label}
        description={navItem.ownership}
        breadcrumbs={[{ label: 'Workspace', to: '/dashboard' }, { label: navItem.label }]}
        actions={
          returnTo ? (
            <Button variant="secondary" iconLeft={<ArrowLeft />} onClick={() => navigate(returnTo)}>
              Back
            </Button>
          ) : undefined
        }
      />

      <section className="crm-placeholder__card">
        <div className="crm-placeholder__status">
          <Badge tone="warning">Screen architecture pending</Badge>
          <p>
            This route exists so cross-module links never dead-end. Its screens are built in the
            module's own batch, once its normalised screen specification is available.
          </p>
        </div>

        <div className="crm-placeholder__grid">
          <section>
            <h2 className="crm-placeholder__section-title">Active scope</h2>
            <ul className="crm-placeholder__list">
              {scopeSummary.map((line) => (
                <li key={line}>{line}</li>
              ))}
              <li>Acting as: {currentUser.name} — {currentUser.roleLabel}</li>
            </ul>
          </section>

          <section>
            <h2 className="crm-placeholder__section-title">Received context</h2>
            {receivedContext.length === 0 ? (
              <p className="crm-placeholder__muted">
                No record context was passed to this module.
              </p>
            ) : (
              <ul className="crm-placeholder__list">
                {receivedContext.map((entry) => (
                  <li key={entry.key}>
                    <code>{entry.key}</code> → {describe(entry.key, entry.value)}
                  </li>
                ))}
              </ul>
            )}
            {returnTo ? (
              <p className="crm-placeholder__muted">
                Return route preserved: <code>{returnTo}</code>
              </p>
            ) : null}
          </section>
        </div>
      </section>
    </div>
  );
}
