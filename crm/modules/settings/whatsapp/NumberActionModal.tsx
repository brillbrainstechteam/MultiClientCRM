import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryPatch } from '@crm/app/use-query-patch';
import { Button, Modal, PermissionRestricted, Toast } from '@crm/design-system';
import type { DisconnectIntent, OnboardingNumberRecord, OnboardingRole } from '@crm/mock-data';
import { ChoiceCard } from '@crm/modules/onboarding/components/ChoiceCard';
import { can } from '@crm/modules/onboarding/permissions';

export interface NumberActionModalProps {
  record: OnboardingNumberRecord;
  role: OnboardingRole;
}

interface IntentMeta {
  title: string;
  listDescription: string;
  confirmDescription: string;
  confirmLabel: string;
  tone: 'danger' | 'default';
  requiresOwner: boolean;
}

/** N05 — intent-based stop/disconnect/move (SKILL.md "Stop / Disconnect / Move"). Never one ambiguous "Disconnect". */
const INTENT_META: Record<DisconnectIntent, IntentMeta> = {
  fix: {
    title: 'Fix connection',
    listDescription: 'Resume the connection wizard to repair the current technical issue.',
    confirmDescription: '',
    confirmLabel: 'Resume connection',
    tone: 'default',
    requiresOwner: false,
  },
  pause: {
    title: 'Temporarily stop sending',
    listDescription: 'Pause outbound messaging while keeping the number connected. Resume any time.',
    confirmDescription: 'Outbound messages will stop sending from this number until you resume it. Inbound messages and Inbox access are unaffected.',
    confirmLabel: 'Pause sending',
    tone: 'default',
    requiresOwner: false,
  },
  'stop-crm': {
    title: 'Stop using in this CRM',
    listDescription: 'The number stays registered with Meta, but the CRM stops sending or receiving through it.',
    confirmDescription: 'This number will no longer send or receive through this CRM. It remains registered with Meta and can be reconnected later. History and audit records are preserved.',
    confirmLabel: 'Stop using in CRM',
    tone: 'danger',
    requiresOwner: true,
  },
  deregister: {
    title: 'Remove / deregister from platform',
    listDescription: 'Fully deregisters this number from the WhatsApp Business Platform.',
    confirmDescription: 'This permanently deregisters the number from the WhatsApp Business Platform. This cannot be undone from here — you would need to reconnect it as a new number. History and audit records are preserved.',
    confirmLabel: 'Deregister number',
    tone: 'danger',
    requiresOwner: true,
  },
  move: {
    title: 'Move to another provider/setup',
    listDescription: 'Start a guided handoff to move this number to another provider or BSP.',
    confirmDescription: 'Our support team will contact you to coordinate moving this number. The number keeps working in this CRM until the move is complete.',
    confirmLabel: 'Start move request',
    tone: 'default',
    requiresOwner: true,
  },
};

const INTENT_ORDER: DisconnectIntent[] = ['fix', 'pause', 'stop-crm', 'deregister', 'move'];

/** Renders a Toast, driven by query state, after a demo action completes. */
export function NumberActionModal({ record, role }: NumberActionModalProps) {
  const navigate = useNavigate();
  const [params, patch] = useQueryPatch();
  const [done, setDone] = useState<DisconnectIntent | null>(null);

  const open = params.get('modal') === 'number-action';
  const intent = params.get('intent') as DisconnectIntent | null;

  const close = () => {
    setDone(null);
    patch({ modal: null, intent: null });
  };

  if (done) {
    return (
      <Toast
        tone="success"
        message={`${INTENT_META[done].title} — done for ${record.displayName}.`}
        onDismiss={close}
      />
    );
  }

  if (!open) return null;

  if (!intent) {
    return (
      <Modal open={open} title={`Manage ${record.displayName}`} onClose={close}>
        <div className="crm-number-action__list" role="radiogroup" aria-label="Connection actions">
          {INTENT_ORDER.map((id) => (
            <ChoiceCard
              key={id}
              title={INTENT_META[id].title}
              description={INTENT_META[id].listDescription}
              onSelect={() => {
                if (id === 'fix') {
                  close();
                  navigate(`/setup/connect?stage=meta&step=progress&numberId=${record.id}`);
                  return;
                }
                patch({ intent: id });
              }}
            />
          ))}
        </div>
      </Modal>
    );
  }

  const meta = INTENT_META[intent];
  const blocked = meta.requiresOwner && !can(role, 'manageDisconnect');

  return (
    <Modal
      open={open}
      title={meta.title}
      onClose={close}
      footer={
        blocked ? (
          <Button variant="secondary" onClick={close}>
            Close
          </Button>
        ) : (
          <>
            <Button variant="secondary" onClick={() => patch({ intent: null })}>
              Back
            </Button>
            <Button variant={meta.tone === 'danger' ? 'danger' : 'primary'} onClick={() => setDone(intent)}>
              {meta.confirmLabel}
            </Button>
          </>
        )
      }
    >
      {blocked ? (
        <PermissionRestricted
          title="You don't have permission for this action"
          description="This action needs Owner / Super Admin or an explicit Client Admin permission. Ask your workspace owner."
        />
      ) : (
        <p className="crm-number-action__description">{meta.confirmDescription}</p>
      )}
    </Modal>
  );
}
