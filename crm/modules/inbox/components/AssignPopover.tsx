import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCheck, Users, MapPin, UserPlus } from 'lucide-react';
import { Popover, Avatar } from '@crm/design-system';

interface AssignMember { id: string; name: string; email: string; role: string; department: string | null; }
interface AssignPopoverProps {
  open: boolean;
  currentAssigneeId: string | null;
  currentTeamId: string | null;
  conversationNumberId: string;
  contactId: string | null;
  onClose: () => void;
  onAssign: (userId: string | null, teamId: string | null) => void;
}

function nameInitials(name: string): string {
  return name.split(' ').map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase() || '?';
}
const titleCase = (s: string) => s.split('_').filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
function roleLabel(r: string) { return r === 'owner' ? 'Owner' : r === 'admin' ? 'Admin' : r === 'manager' ? 'Manager' : r === 'agent' ? 'Team member' : titleCase(r); }
function memberSub(m: AssignMember) { return m.department ? `${roleLabel(m.role)} · ${titleCase(m.department)}` : roleLabel(m.role); }

/**
 * Assign a conversation. Members are resolved by the contact's area (zone): if
 * the contact's city/state maps to an area, only that area's members show; if
 * the location is unknown or maps to no area, everyone shows. "Show everyone"
 * expands an area list, and there's always a way to add a team member.
 */
export function AssignPopover({
  open, currentAssigneeId, contactId, onClose, onAssign,
}: AssignPopoverProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<'zone' | 'all'>('all');
  const [zoneName, setZoneName] = useState<string | null>(null);
  const [members, setMembers] = useState<AssignMember[]>([]);
  const [allMembers, setAllMembers] = useState<AssignMember[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true); setShowAll(false);
    const qs = contactId ? `?contactId=${encodeURIComponent(contactId)}` : '';
    fetch(`/api/crm/team/assignable${qs}`, { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) {
          setSource(d.source ?? 'all');
          setZoneName(d.zoneName ?? null);
          setMembers(d.members ?? []);
          setAllMembers(d.allMembers ?? d.members ?? []);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [open, contactId]);

  const list = showAll ? allMembers : members;

  return (
    <Popover open={open} title="Assign conversation" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Current assignee */}
        {currentAssigneeId && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: 'var(--crm-bg-secondary)', borderRadius: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <UserCheck size={13} style={{ color: 'var(--crm-text-muted)' }} />
              <span style={{ fontSize: 12, color: 'var(--crm-text-secondary)' }}>Currently assigned to</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--crm-text-primary)' }}>
                {allMembers.find((m) => m.id === currentAssigneeId)?.name ?? 'a member'}
              </span>
            </div>
            <button
              onClick={() => { onAssign(null, null); onClose(); }}
              style={{ fontSize: 11, color: 'var(--crm-danger)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
            >
              Unassign
            </button>
          </div>
        )}

        {/* Area context */}
        {!loading && source === 'zone' && zoneName ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--crm-text-secondary)' }}>
            <MapPin size={13} style={{ color: 'var(--crm-brand-600)' }} />
            <span>Members for the <strong style={{ color: 'var(--crm-text-primary)' }}>{zoneName}</strong> area</span>
          </div>
        ) : !loading ? (
          <div style={{ fontSize: 12, color: 'var(--crm-text-muted)' }}>All team members</div>
        ) : null}

        {/* Member list */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--crm-text-muted)', fontSize: 12 }}>Loading members…</div>
        ) : list.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--crm-text-muted)', fontSize: 12 }}>
            <Users size={20} style={{ display: 'block', margin: '0 auto 6px', opacity: 0.4 }} />
            No team members yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 300, overflowY: 'auto' }}>
            {list.map((m) => {
              const isCurrent = m.id === currentAssigneeId;
              return (
                <button
                  key={m.id}
                  onClick={() => { if (!isCurrent) { onAssign(m.id, null); onClose(); } }}
                  disabled={isCurrent}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                    borderRadius: 8, cursor: isCurrent ? 'default' : 'pointer',
                    border: '1px solid transparent',
                    background: isCurrent ? 'var(--crm-bg-secondary)' : 'transparent',
                    borderColor: isCurrent ? 'var(--crm-border)' : 'transparent',
                    textAlign: 'left', width: '100%',
                  }}
                  onMouseOver={(e) => { if (!isCurrent) (e.currentTarget as HTMLButtonElement).style.background = 'var(--crm-bg-tertiary)'; }}
                  onMouseOut={(e) => { if (!isCurrent) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                >
                  <Avatar initials={nameInitials(m.name)} name={m.name} size="sm" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--crm-text-primary)' }}>{m.name}</span>
                      {isCurrent && <span style={{ fontSize: 10, color: 'var(--crm-text-brand)', fontWeight: 600 }}>current</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--crm-text-muted)' }}>{memberSub(m)}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Show everyone (only when scoped to an area and there are more people) */}
        {!loading && source === 'zone' && !showAll && allMembers.length > members.length ? (
          <button
            onClick={() => setShowAll(true)}
            style={{ fontSize: 12, color: 'var(--crm-text-brand)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, textAlign: 'left', padding: '2px 4px' }}
          >
            Show all team members ({allMembers.length})
          </button>
        ) : null}
      </div>

      <div style={{ borderTop: '1px solid var(--crm-border)', padding: '10px 12px' }}>
        <button
          onClick={() => navigate('/team-access/people?sourceModule=inbox&returnTo=/inbox')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--crm-text-brand)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <UserPlus size={14} /> Add a team member
        </button>
      </div>
    </Popover>
  );
}
