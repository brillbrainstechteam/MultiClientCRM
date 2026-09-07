import { AlertTriangle, MessageSquare, PhoneCall, User as UserIcon, Video } from 'lucide-react';
import { Badge, Button, Drawer } from '@crm/design-system';
import { findContact, findUser } from '@crm/mock-data';
import type { CallAttempt, CallTask } from '../domain';
import { ConnectionStatusBadge, DispositionBadge } from './Badges';

export interface CallRecordDrawerProps {
  open: boolean;
  attempt: CallAttempt | undefined;
  task: CallTask | undefined;
  onClose: () => void;
  onWhatsApp: (contactId: string) => void;
  onViewProfile: (contactId: string) => void;
  onViewTask: (taskId: string) => void;
}

/**
 * CALL-S07 — Call Record Detail. Read-only attempt record opened from
 * History; recording/transcript stay a deferred indicator only
 * (SKILL.md "Recordings/transcripts").
 */
export function CallRecordDrawer({
  open,
  attempt,
  task,
  onClose,
  onWhatsApp,
  onViewProfile,
  onViewTask,
}: CallRecordDrawerProps) {
  if (!attempt) return null;
  const contact = findContact(attempt.contactId);
  const agent = findUser(attempt.agentId);

  return (
    <Drawer
      open={open}
      title="Call record"
      subtitle={contact?.name ?? attempt.contactId}
      onClose={onClose}
      footer={
        <>
          {contact ? (
            <Button variant="secondary" iconLeft={<UserIcon />} onClick={() => onViewProfile(contact.id)}>
              View profile
            </Button>
          ) : null}
          {contact ? (
            <Button variant="secondary" iconLeft={<MessageSquare />} onClick={() => onWhatsApp(contact.id)}>
              WhatsApp
            </Button>
          ) : null}
          {task ? (
            <Button variant="primary" iconLeft={<PhoneCall />} onClick={() => onViewTask(task.id)}>
              Open call task
            </Button>
          ) : null}
        </>
      }
    >
      <div className="crm-record">
        <div className="crm-record__status">
          <ConnectionStatusBadge status={attempt.connectionStatus} />
          {attempt.disposition ? <DispositionBadge disposition={attempt.disposition} /> : null}
          <Badge tone="neutral" appearance="outline">
            {attempt.mode === 'manual' ? 'Manual call' : 'Provider call'}
          </Badge>
        </div>

        {attempt.connectionStatus === 'invalid' ? (
          <div className="crm-record__invalid">
            <AlertTriangle size={16} />
            <div>
              <p>This number looks invalid or disconnected.</p>
              {contact ? (
                <Button variant="secondary" size="sm" onClick={() => onViewProfile(contact.id)}>
                  Update customer record
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}

        <dl className="crm-record__facts">
          <div>
            <dt>When</dt>
            <dd>{formatDateTime(attempt.startedAt)}</dd>
          </div>
          <div>
            <dt>Duration</dt>
            <dd>{attempt.durationSeconds !== null ? formatDuration(attempt.durationSeconds) : '—'}</dd>
          </div>
          <div>
            <dt>Agent</dt>
            <dd>{agent ? agent.name : attempt.agentId}</dd>
          </div>
          <div>
            <dt>Provider reference</dt>
            <dd>{attempt.providerReference ?? 'Not provided by telephony provider'}</dd>
          </div>
        </dl>

        <section className="crm-record__section">
          <h3>
            <Video size={14} /> Recording
          </h3>
          <p className="crm-record__muted">
            {attempt.recordingAvailable
              ? 'Recording indicator present on this attempt — playback is not enabled in this prototype.'
              : 'Recording unavailable / feature not enabled.'}
          </p>
        </section>

        {attempt.requirement ? (
          <section className="crm-record__section">
            <h3>Requirement</h3>
            <p>{attempt.requirement}</p>
          </section>
        ) : null}

        {attempt.objection ? (
          <section className="crm-record__section">
            <h3>Objection</h3>
            <p>{attempt.objection}</p>
          </section>
        ) : null}

        {attempt.lifecycleChangeTo ? (
          <section className="crm-record__section">
            <h3>Lifecycle suggested</h3>
            <p className="crm-record__capitalize">{attempt.lifecycleChangeTo}</p>
          </section>
        ) : null}

        {attempt.notes ? (
          <section className="crm-record__section">
            <h3>Notes</h3>
            <p>{attempt.notes}</p>
          </section>
        ) : null}

        {task ? (
          <section className="crm-record__section">
            <h3>Call task</h3>
            <p className="crm-record__muted">{task.source}</p>
          </section>
        ) : null}
      </div>
    </Drawer>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
