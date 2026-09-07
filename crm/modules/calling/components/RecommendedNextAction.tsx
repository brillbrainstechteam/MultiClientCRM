import { CheckCircle2, MessageSquare, PhoneForwarded, Sparkles, User as UserIcon } from 'lucide-react';
import { Button } from '@crm/design-system';
import type { BusinessDisposition, NextActionKey } from '../domain';

export interface RecommendedNextActionProps {
  disposition: BusinessDisposition | null;
  nextAction: NextActionKey;
  followUpSummary?: string | null;
  onOpenWhatsApp: () => void;
  onOpenFollowUp: () => void;
  onEscalate: () => void;
  onOpenProfile: () => void;
  onBackToQueue: () => void;
}

/**
 * CALL-S13 — inline card after Save Outcome. One clear recommended CTA
 * instead of a new page (SKILL.md "AI behavior" / "Recommended Next Action").
 */
export function RecommendedNextAction({
  disposition,
  nextAction,
  followUpSummary,
  onOpenWhatsApp,
  onOpenFollowUp,
  onEscalate,
  onOpenProfile,
  onBackToQueue,
}: RecommendedNextActionProps) {
  const { title, description, action } = describe(nextAction, disposition, followUpSummary);

  return (
    <div className="crm-next-action">
      <span className="crm-next-action__icon" aria-hidden="true">
        <Sparkles />
      </span>
      <div className="crm-next-action__text">
        <p className="crm-next-action__title">{title}</p>
        <p className="crm-next-action__description">{description}</p>
      </div>
      <div className="crm-next-action__actions">
        {action === 'whatsapp' ? (
          <Button variant="primary" iconLeft={<MessageSquare />} onClick={onOpenWhatsApp}>
            Open WhatsApp
          </Button>
        ) : null}
        {action === 'follow-up' ? (
          <Button variant="primary" iconLeft={<CheckCircle2 />} onClick={onOpenFollowUp}>
            View follow-up
          </Button>
        ) : null}
        {action === 'escalate' ? (
          <Button variant="primary" iconLeft={<PhoneForwarded />} onClick={onEscalate}>
            Escalate
          </Button>
        ) : null}
        {action === 'profile' ? (
          <Button variant="primary" iconLeft={<UserIcon />} onClick={onOpenProfile}>
            Update customer record
          </Button>
        ) : null}
        <Button variant="secondary" onClick={onBackToQueue}>
          Next call / back to queue
        </Button>
      </div>
    </div>
  );
}

function describe(
  nextAction: NextActionKey,
  disposition: BusinessDisposition | null,
  followUpSummary?: string | null,
): { title: string; description: string; action: 'whatsapp' | 'follow-up' | 'escalate' | 'profile' | 'none' } {
  if (nextAction === 'schedule_follow_up') {
    return {
      title: 'Follow-up scheduled',
      description: followUpSummary ?? 'A future call task has been created for this contact.',
      action: 'follow-up',
    };
  }
  if (nextAction === 'send_whatsapp') {
    return {
      title: 'Open WhatsApp to continue the conversation',
      description: 'The customer showed interest — send the catalogue or agreed next step on WhatsApp.',
      action: 'whatsapp',
    };
  }
  if (nextAction === 'escalate') {
    return {
      title: 'Escalate this call',
      description: 'Flag this to a manager for review before the next contact attempt.',
      action: 'escalate',
    };
  }
  if (nextAction === 'update_customer') {
    return {
      title: 'Update the customer record',
      description: 'The number looked invalid or disconnected — verify and update it on the contact record.',
      action: 'profile',
    };
  }
  if (disposition === 'not_interested') {
    return {
      title: 'No further action',
      description: 'Logged as not interested. No follow-up is scheduled.',
      action: 'none',
    };
  }
  return {
    title: 'No further action needed',
    description: 'Outcome saved. Move on to the next call whenever you are ready.',
    action: 'none',
  };
}
