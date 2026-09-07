import { useState, useMemo } from 'react';
import { UserCheck, AlertTriangle, WifiOff, Users } from 'lucide-react';
import { Popover, Avatar, Button } from '@crm/design-system';
import { users, teams, findUser } from '@crm/mock-data';
import type { User } from '@crm/mock-data';

interface AssignPopoverProps {
  open: boolean;
  currentAssigneeId: string | null;
  currentTeamId: string | null;
  conversationNumberId: string;
  onClose: () => void;
  onAssign: (userId: string | null, teamId: string | null) => void;
}

function nameInitials(name: string): string {
  return name.split(' ').map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase() || '?';
}

const AVAILABILITY_LABEL: Record<string, string> = {
  available: 'Available',
  busy: 'Busy',
  offline: 'Offline',
};

const AVAILABILITY_COLOR: Record<string, string> = {
  available: 'var(--crm-success)',
  busy: 'var(--crm-warning)',
  offline: 'var(--crm-text-muted)',
};

// Mock workload (open conversations count per agent)
const MOCK_WORKLOAD: Record<string, number> = {
  user_meera: 4,
  user_rohan: 8,
  user_vikram: 2,
  user_anita: 1,
  user_farida: 6,
  user_karan: 11,
};

function AvailabilityDot({ status }: { status: string }) {
  return (
    <span style={{
      width: 8, height: 8, borderRadius: '50%', display: 'inline-block', flexShrink: 0,
      background: AVAILABILITY_COLOR[status] ?? 'var(--crm-text-muted)',
    }} />
  );
}

export function AssignPopover({
  open, currentAssigneeId, conversationNumberId, onClose, onAssign,
}: AssignPopoverProps) {
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  const eligibleUsers = useMemo(() =>
    users.filter((u) => u.permittedWhatsAppNumberIds.includes(conversationNumberId)),
    [conversationNumberId],
  );

  const filtered = useMemo(() => {
    if (teamFilter === 'all') return eligibleUsers;
    return eligibleUsers.filter((u) => u.teamId === teamFilter);
  }, [eligibleUsers, teamFilter]);

  const teamTabs = [
    { id: 'all', label: 'All' },
    ...teams.map((t) => ({ id: t.id, label: t.name })),
  ];

  const pendingUser = pendingUserId ? findUser(pendingUserId) : null;

  function confirmAssign(userId: string | null) {
    const user = userId ? findUser(userId) : null;
    if (user && (user.availability === 'busy' || user.availability === 'offline') && pendingUserId === null) {
      setPendingUserId(userId);
      return;
    }
    const teamId = user ? user.teamId : null;
    onAssign(userId, teamId);
    setPendingUserId(null);
    onClose();
  }

  if (pendingUser) {
    return (
      <Popover
        open={open}
        title="Confirm Assignment"
        onClose={() => { setPendingUserId(null); onClose(); }}
        footer={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" size="sm" onClick={() => setPendingUserId(null)}>Back</Button>
            <Button variant="primary" size="sm" onClick={() => confirmAssign(pendingUserId)}>
              Assign Anyway
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <AlertTriangle size={16} style={{ color: 'var(--crm-warning)', flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--crm-text-primary)', marginBottom: 4 }}>
              {pendingUser.name} is {AVAILABILITY_LABEL[pendingUser.availability ?? 'offline'].toLowerCase()}
            </div>
            <div style={{ fontSize: 12, color: 'var(--crm-text-secondary)', lineHeight: 1.4 }}>
              {pendingUser.availability === 'offline'
                ? `${pendingUser.name} is currently offline and may not respond promptly.`
                : `${pendingUser.name} is currently handling ${MOCK_WORKLOAD[pendingUser.id] ?? 0} conversations.`}
              {' '}Assign anyway?
            </div>
          </div>
        </div>
      </Popover>
    );
  }

  return (
    <Popover open={open} title="Assign Conversation" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Current assignee */}
        {currentAssigneeId && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: 'var(--crm-bg-secondary)', borderRadius: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <UserCheck size={13} style={{ color: 'var(--crm-text-muted)' }} />
              <span style={{ fontSize: 12, color: 'var(--crm-text-secondary)' }}>Currently assigned to</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--crm-text-primary)' }}>
                {findUser(currentAssigneeId)?.name ?? 'Unknown'}
              </span>
            </div>
            <button
              onClick={() => confirmAssign(null)}
              style={{ fontSize: 11, color: 'var(--crm-danger)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
            >
              Unassign
            </button>
          </div>
        )}

        {/* Team filter tabs */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {teamTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTeamFilter(tab.id)}
              style={{
                padding: '2px 8px', borderRadius: 999, fontSize: 11, cursor: 'pointer',
                border: '1px solid var(--crm-border)',
                background: teamFilter === tab.id ? 'var(--crm-text-brand)' : 'transparent',
                color: teamFilter === tab.id ? 'var(--crm-on-dark)' : 'var(--crm-text-secondary)',
                fontWeight: teamFilter === tab.id ? 600 : 400,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* User list */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--crm-text-muted)', fontSize: 12 }}>
            <Users size={20} style={{ display: 'block', margin: '0 auto 6px', opacity: 0.4 }} />
            No eligible agents for this WhatsApp number.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 280, overflowY: 'auto' }}>
            {filtered.map((user: User) => {
              const isCurrentAssignee = user.id === currentAssigneeId;
              const workload = MOCK_WORKLOAD[user.id] ?? 0;
              return (
                <button
                  key={user.id}
                  onClick={() => confirmAssign(user.id)}
                  disabled={isCurrentAssignee}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                    borderRadius: 6, cursor: isCurrentAssignee ? 'default' : 'pointer',
                    border: '1px solid transparent',
                    background: isCurrentAssignee ? 'var(--crm-bg-secondary)' : 'transparent',
                    borderColor: isCurrentAssignee ? 'var(--crm-border)' : 'transparent',
                    textAlign: 'left', width: '100%',
                    opacity: user.availability === 'offline' ? 0.7 : 1,
                  }}
                  onMouseOver={(e) => {
                    if (!isCurrentAssignee) (e.currentTarget as HTMLButtonElement).style.background = 'var(--crm-bg-tertiary)';
                  }}
                  onMouseOut={(e) => {
                    if (!isCurrentAssignee) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  }}
                >
                  <Avatar initials={nameInitials(user.name)} name={user.name} size="sm" />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--crm-text-primary)' }}>{user.name}</span>
                      {isCurrentAssignee && (
                        <span style={{ fontSize: 10, color: 'var(--crm-text-brand)', fontWeight: 600 }}>current</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--crm-text-muted)' }}>{user.roleLabel}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <AvailabilityDot status={user.availability ?? 'offline'} />
                      <span style={{ fontSize: 10, color: AVAILABILITY_COLOR[user.availability ?? 'offline'] }}>
                        {AVAILABILITY_LABEL[user.availability ?? 'offline']}
                      </span>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--crm-text-muted)' }}>
                      {workload} open
                    </div>
                    {user.availability === 'offline' && (
                      <WifiOff size={10} style={{ color: 'var(--crm-text-muted)' }} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div style={{ borderTop: '1px solid var(--crm-border)', padding: '8px 12px', fontSize: 11, color: 'var(--crm-text-muted)' }}>
        <a
          href="/team-access?sourceModule=inbox&returnTo=/inbox"
          style={{ color: 'var(--crm-text-brand)', textDecoration: 'none' }}
          onClick={(e) => { e.preventDefault(); window.location.href = '/team-access?sourceModule=inbox&returnTo=/inbox'; }}
        >
          Manage team &amp; access →
        </a>
      </div>
    </Popover>
  );
}
