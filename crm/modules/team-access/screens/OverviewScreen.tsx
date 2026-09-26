import { useEffect, useState } from 'react';
import { ChartNoAxesCombined, MapPin, PhoneCall, UserRoundPlus, Users, ClipboardList } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { useWorkspace } from '@crm/app/workspace-context';
import { Button, KpiCard } from '@crm/design-system';
import { PageHeader } from '@crm/components';
import './OverviewScreen.css';

interface Seats { used: number; included: number | null; overage: number; }
interface Totals { assignedContacts: number; calls: number; followUpInProgress: number; notInterested: number; enquiryReceived: number; }

/**
 * TEAM-S01 — Overview. A clean, real snapshot of the team operating model:
 * seats + member count, and the calling totals the Performance report rolls up.
 * Every card drills into a live screen (Members / Zone routing / Performance).
 */
export default function OverviewScreen() {
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const { role, currentUser } = useWorkspace();
  const canManage = role === 'owner';

  const [seats, setSeats] = useState<Seats | null>(null);
  const [members, setMembers] = useState<number>(0);
  const [totals, setTotals] = useState<Totals | null>(null);

  useEffect(() => {
    fetch('/api/crm/team/members', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d) => { if (!d.error) { setSeats(d.seats ?? null); setMembers((d.members ?? []).length); } })
      .catch(() => {});
    fetch('/api/crm/team/performance', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d) => { if (!d.error) setTotals(d.totals ?? null); })
      .catch(() => {});
  }, []);

  const go = (path: string) => navigate(scopedHref(path));

  return (
    <div className="crm-team-overview">
      <PageHeader
        title="Team & Access"
        description="Members, zone routing and calling performance"
        actions={
          canManage ? (
            <>
              <Button variant="secondary" iconLeft={<MapPin />} onClick={() => go('/team-access/zones')}>
                Zone routing
              </Button>
              <Button variant="primary" iconLeft={<UserRoundPlus />} onClick={() => go('/team-access/people')}>
                Add member
              </Button>
            </>
          ) : undefined
        }
      />

      <section aria-label="Key figures" className="crm-team-overview__kpis">
        <KpiCard label="Team members" value={members} icon={<Users />} meta={seats?.included != null ? `${seats.used}/${seats.included} seats used` : `${seats?.used ?? members} active`} />
        {seats && seats.overage > 0
          ? <KpiCard label="Paid extra seats" value={seats.overage} meta="Beyond your plan" emphasis="gold" />
          : <KpiCard label="Assigned contacts" value={totals?.assignedContacts ?? '—'} icon={<ClipboardList />} meta="Across the team" />}
        <KpiCard label="Calls done" value={totals?.calls ?? '—'} icon={<PhoneCall />} meta="Logged outcomes" />
        <KpiCard label="Enquiries received" value={totals?.enquiryReceived ?? '—'} meta="Handed to sales" emphasis="gold" />
      </section>

      <section aria-label="Manage" className="crm-team-overview__section">
        <h2 className="crm-team-overview__section-title">Manage</h2>
        <div className="crm-team-overview__cards">
          <NavCard
            icon={<Users />}
            title="Members"
            body="Create agents & managers, set departments, reset passwords and manage seats."
            onClick={() => go('/team-access/people')}
          />
          <NavCard
            icon={<MapPin />}
            title="Zone routing"
            body="Map states & cities to zones and assign members. New contacts auto-route to their zone's member."
            onClick={() => go('/team-access/zones')}
          />
          {role !== 'agent' ? (
            <NavCard
              icon={<ChartNoAxesCombined />}
              title="Performance"
              body="Per-member report: assigned, calls done, follow-ups in progress, not interested and enquiries."
              onClick={() => go('/team-access/performance')}
            />
          ) : null}
        </div>
      </section>

      {role === 'agent' ? (
        <p className="crm-team-overview__note">
          You’re signed in as <strong>{currentUser.name}</strong> (Agent). You see only the contacts assigned to you.
        </p>
      ) : null}
    </div>
  );
}

function NavCard({ icon, title, body, onClick }: { icon: React.ReactNode; title: string; body: string; onClick: () => void }) {
  return (
    <button type="button" className="crm-team-navcard" onClick={onClick}>
      <span className="crm-team-navcard__icon">{icon}</span>
      <span className="crm-team-navcard__title">{title}</span>
      <span className="crm-team-navcard__body">{body}</span>
    </button>
  );
}
