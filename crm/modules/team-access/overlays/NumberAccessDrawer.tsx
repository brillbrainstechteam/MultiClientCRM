import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { findBranch, findWhatsAppNumber } from '@crm/mock-data';
import { Badge, Button, Checkbox, Drawer, DisconnectedState, Toast } from '@crm/design-system';
import { accessGrantsForNumber } from '../team-access-selectors';
import { teamMembers, teamRecords } from '../team-access-mock-data';

/**
 * TEAM-S09/S10 — Number Access drawer. Manages which users/teams/branches may
 * use a number and the user/team default; connection/health stays read-only
 * and owned by Settings (SIMPLIFICATION_DECISIONS.md §11).
 */
export function NumberAccessDrawer() {
  const [searchParams, setSearchParams] = useSearchParams();
  const open = searchParams.get('drawer') === 'access' && Boolean(searchParams.get('numberId'));
  const numberId = searchParams.get('numberId') ?? '';
  const forcedState = searchParams.get('state');
  const [toast, setToast] = useState<string | null>(null);
  const [removedGrantId, setRemovedGrantId] = useState<string | null>(null);

  const close = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const key of ['drawer', 'numberId', 'state']) next.delete(key);
      return next;
    });

  if (!open) return null;

  const number = findWhatsAppNumber(numberId);
  if (!number) return null;

  const grants = accessGrantsForNumber(numberId).filter((g) => g.id !== removedGrantId);
  const teamGrants = grants.filter((g) => g.subjectType === 'team');
  const userGrants = grants.filter((g) => g.subjectType === 'user');
  const branchGrant = grants.find((g) => g.subjectType === 'branch');
  const defaultGrant = grants.find((g) => g.isDefault);

  const subjectLabel = (type: 'user' | 'team' | 'branch', id: string) => {
    if (type === 'user') return teamMembers.find((m) => m.id === id)?.name ?? id;
    if (type === 'team') return teamRecords.find((t) => t.id === id) ? id : id;
    return findBranch(id)?.name ?? id;
  };

  const isDisconnected = forcedState === 'disconnected' || number.connectionStatus === 'disconnected';
  const impactRequired = forcedState === 'impact-required';

  return (
    <>
      <Drawer
        open
        title={`Manage access — ${number.displayName}`}
        subtitle={`${number.displayNumber} · Team & Access controls who can use this number; connection and provider health stay in Settings.`}
        onClose={close}
        width="wide"
        footer={
          <>
            <Button variant="secondary" onClick={close}>
              Close
            </Button>
            <Button variant="primary" onClick={() => { setToast('Access updated.'); }}>
              Save changes
            </Button>
          </>
        }
      >
        <div className="crm-number-access">
          {isDisconnected ? (
            <DisconnectedState
              title="This number is disconnected"
              description="Access can still be configured, but sending and receiving stay disabled until it's reconnected in Settings → WhatsApp Numbers."
            />
          ) : null}

          {impactRequired ? (
            <Badge tone="warning">Removing this grant leaves 1 member with no number access — confirm before saving.</Badge>
          ) : null}

          <div className="crm-number-access__section">
            <strong>Teams with access</strong>
            {teamGrants.length === 0 ? <span>No team-level access granted.</span> : null}
            {teamGrants.map((g) => (
              <div key={g.id} className="crm-number-access__grant">
                <Checkbox label={subjectLabel('team', g.subjectId)} checked onChange={() => setRemovedGrantId(g.id)} />
                {g.isDefault ? <Badge tone="brand">Team default</Badge> : null}
              </div>
            ))}
          </div>

          <div className="crm-number-access__section">
            <strong>Users with individual access</strong>
            {userGrants.length === 0 ? <span>No individual user grants — access flows through team membership.</span> : null}
            {userGrants.map((g) => (
              <div key={g.id} className="crm-number-access__grant">
                <Checkbox label={subjectLabel('user', g.subjectId)} checked onChange={() => setRemovedGrantId(g.id)} />
                {g.isDefault ? <Badge tone="brand">User default</Badge> : null}
              </div>
            ))}
          </div>

          {branchGrant ? (
            <div className="crm-number-access__section">
              <strong>Branch fallback</strong>
              <div className="crm-number-access__grant">
                <span>{subjectLabel('branch', branchGrant.subjectId)}</span>
                <Badge tone="neutral">{branchGrant.canSend ? 'Send + receive' : 'Read-only'}</Badge>
              </div>
            </div>
          ) : null}

          <div className="crm-number-access__trace">
            <strong>Effective resolution</strong>
            <span>
              {defaultGrant
                ? `${subjectLabel(defaultGrant.subjectType, defaultGrant.subjectId)} (${defaultGrant.subjectType} default) → resolves to this number.`
                : 'No default set — falls back to tenant default number.'}
            </span>
          </div>
        </div>
      </Drawer>
      {toast ? <Toast tone="success" message={toast} onDismiss={() => setToast(null)} /> : null}
    </>
  );
}
