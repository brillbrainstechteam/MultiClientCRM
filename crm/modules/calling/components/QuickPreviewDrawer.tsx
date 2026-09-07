import { MessageSquare, Phone, User as UserIcon } from 'lucide-react';
import { Avatar, Badge, Button, Drawer } from '@crm/design-system';
import { findContact, findUser } from '@crm/mock-data';
import { attemptsForContact } from '../calling-selectors';
import { findCallContext } from '../data';
import { computeQueuePriority, referenceNow, type CallAttempt, type CallTask } from '../domain';
import { ConnectionStatusBadge, PriorityBadge } from './Badges';

export interface QuickPreviewDrawerProps {
  open: boolean;
  task: CallTask | undefined;
  attempts: CallAttempt[];
  onClose: () => void;
  onOpenWorkspace: (taskId: string) => void;
  onWhatsApp: (contactId: string) => void;
  onViewProfile: (contactId: string) => void;
}

/**
 * CALL-S11 — utility drawer over the Queue, not a navigation page
 * (CODE_FIRST_ADAPTER.md §3). Secondary metadata that the compact queue row
 * hides lives here (city, contact owner, product interest, notes).
 */
export function QuickPreviewDrawer({
  open,
  task,
  attempts,
  onClose,
  onOpenWorkspace,
  onWhatsApp,
  onViewProfile,
}: QuickPreviewDrawerProps) {
  if (!task) return null;
  const contact = findContact(task.contactId);
  if (!contact) return null;

  const owner = findUser(task.contactOwnerId);
  const assignee = task.assigneeId ? findUser(task.assigneeId) : null;
  const context = findCallContext(task.contactId);
  const priority = computeQueuePriority(task, referenceNow());
  const recentCalls = attemptsForContact(attempts, task.contactId).slice(0, 3);

  return (
    <Drawer
      open={open}
      title="Quick preview"
      subtitle={contact.name}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" iconLeft={<UserIcon />} onClick={() => onViewProfile(contact.id)}>
            Full profile
          </Button>
          <Button variant="secondary" iconLeft={<MessageSquare />} onClick={() => onWhatsApp(contact.id)}>
            WhatsApp
          </Button>
          <Button variant="primary" iconLeft={<Phone />} onClick={() => onOpenWorkspace(task.id)}>
            Call
          </Button>
        </>
      }
    >
      <div className="crm-preview">
        <div className="crm-preview__identity">
          <Avatar initials={initialsFor(contact.name)} name={contact.name} size="lg" />
          <div>
            <p className="crm-preview__name">{contact.name}</p>
            <p className="crm-preview__meta">
              {contact.company ?? 'No company on file'} · {contact.city}
            </p>
            <p className="crm-preview__meta">{contact.mobile}</p>
          </div>
        </div>

        <PriorityBadge priority={priority} />

        <dl className="crm-preview__facts">
          <div>
            <dt>Contact owner</dt>
            <dd>{owner ? owner.name : 'Unowned'}</dd>
          </div>
          <div>
            <dt>Call assignee</dt>
            <dd>{assignee ? assignee.name : 'Unassigned'}</dd>
          </div>
          <div>
            <dt>Lifecycle</dt>
            <dd className="crm-preview__capitalize">{contact.stage}</dd>
          </div>
          <div>
            <dt>Sales tier</dt>
            <dd className="crm-preview__capitalize">{contact.salesTier}</dd>
          </div>
        </dl>

        {contact.tags.length > 0 ? (
          <div className="crm-preview__tags">
            {contact.tags.map((tag) => (
              <Badge key={tag} tone="neutral" appearance="outline">
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}

        {context ? (
          <section className="crm-preview__section">
            <h3>Current requirement</h3>
            <p>{context.currentRequirement ?? 'Not captured yet.'}</p>
            {context.openObjection ? (
              <p className="crm-preview__objection">Objection: {context.openObjection}</p>
            ) : null}
            {context.lastWhatsAppSummary ? (
              <p className="crm-preview__note">
                <strong>Last WhatsApp:</strong> {context.lastWhatsAppSummary}
              </p>
            ) : null}
          </section>
        ) : null}

        {task.followUpReason ? (
          <section className="crm-preview__section">
            <h3>Existing follow-up</h3>
            <p>{task.followUpReason}</p>
          </section>
        ) : null}

        <section className="crm-preview__section">
          <h3>Recent calls</h3>
          {recentCalls.length === 0 ? (
            <p className="crm-preview__muted">No prior call attempts.</p>
          ) : (
            <ul className="crm-preview__calls">
              {recentCalls.map((attempt) => (
                <li key={attempt.id}>
                  <ConnectionStatusBadge status={attempt.connectionStatus} />
                  <span className="crm-preview__muted">{formatDate(attempt.startedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Drawer>
  );
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
