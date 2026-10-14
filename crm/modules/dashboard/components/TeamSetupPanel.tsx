import { UsersRound, UserPlus, ArrowRight, Lock, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@crm/design-system';
import { useDashboardHref } from '../dashboard-links';
import type { SetupTeamState } from '../use-setup-state';
import './TeamSetupPanel.css';

/**
 * Building the team, surfaced on the dashboard rather than buried in a module.
 *
 * This is the step that turns a single-user account into a working CRM: the
 * owner creates an account for each sales and marketing person, hands them
 * contacts, and from then on each of them signs in and sees only their own.
 * Nothing else the owner does has that effect, so it earns space on the
 * landing page until it is done.
 *
 * It appears once a plan and a connected number exist — before that, inviting
 * people burns seats on a workspace that cannot send a message — and it
 * disappears once contacts have actually been handed over.
 */
export function TeamSetupPanel({ team, canManage }: { team: SetupTeamState; canManage: boolean }) {
  const navigate = useNavigate();
  const dashHref = useDashboardHref();

  // Only the people who can act on it should see it.
  if (!canManage) return null;
  // Nothing to prompt before the basics, or once contacts are delegated.
  if (!team.unlocked) return null;
  if (team.memberCount > 0 && team.contactsDelegated > 0) return null;

  const stage = team.memberCount === 0 ? 'no-team' : 'no-assignment';

  return (
    <section className="crm-teamsetup">
      <div className="crm-teamsetup__icon" aria-hidden="true">
        <UsersRound />
      </div>

      <div className="crm-teamsetup__body">
        <h2 className="crm-teamsetup__title">
          {stage === 'no-team' ? 'Add your sales and marketing team' : 'Hand your contacts to the team'}
        </h2>
        <p className="crm-teamsetup__text">
          {stage === 'no-team' ? (
            <>
              Create an account for each person with their email and a password. They sign in
              to this same workspace and get the Inbox, Calling, Campaigns and every other
              module — but only for the contacts you give them.
            </>
          ) : (
            <>
              You have {team.memberCount} team member{team.memberCount === 1 ? '' : 's'} but
              none of your {team.contactsTotal} contact{team.contactsTotal === 1 ? '' : 's'} are
              assigned to them yet, so they sign in to an empty workspace. Each contact takes a
              sales owner and, optionally, a marketing owner — both can see and work it, and the
              sales owner also picks up the WhatsApp conversation.
            </>
          )}
        </p>

        <ol className="crm-teamsetup__steps">
          <li className={team.memberCount > 0 ? 'is-done' : ''}>
            {team.memberCount > 0 ? <CheckCircle2 aria-hidden="true" /> : <span className="crm-teamsetup__num">1</span>}
            Create their accounts
          </li>
          <li className={team.contactsDelegated > 0 ? 'is-done' : ''}>
            {team.contactsDelegated > 0 ? <CheckCircle2 aria-hidden="true" /> : <span className="crm-teamsetup__num">2</span>}
            Assign contacts to them
          </li>
          <li>
            <span className="crm-teamsetup__num">3</span>
            They sign in and work only their own
          </li>
        </ol>

        <div className="crm-teamsetup__actions">
          {stage === 'no-team' ? (
            <Button
              variant="primary"
              iconLeft={<UserPlus />}
              onClick={() => navigate(dashHref('/team-access/people?drawer=invite&step=identity'))}
            >
              Add a team member
            </Button>
          ) : (
            <Button
              variant="primary"
              iconRight={<ArrowRight />}
              onClick={() => navigate(dashHref('/contacts/all'))}
            >
              Assign contacts
            </Button>
          )}
          <Button variant="ghost" onClick={() => navigate(dashHref('/team-access/people'))}>
            Manage team
          </Button>
        </div>

        <p className="crm-teamsetup__seats">
          <Lock aria-hidden="true" />
          {team.seatsUsed} seat{team.seatsUsed === 1 ? '' : 's'} in use on the {team.plan} plan.
          Roles decide reach: an agent sees only their own contacts, a manager sees their
          department, an admin sees everything.
        </p>
      </div>
    </section>
  );
}
