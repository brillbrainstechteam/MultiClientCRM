import { CheckCircle2, PlugZap } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Badge, Button, Modal } from '@crm/design-system';

/**
 * CON-S28 — Google Contacts connection modal. Opened via `?modal=google-contacts`.
 * Connection status is read from `?googleAuth=connected|disconnected` so both
 * states are reproducible; connecting flips the flag (no real OAuth in the
 * prototype). Import-only integration: CRM stays the source of truth.
 */
export function GoogleContactsModal() {
  const [searchParams, setSearchParams] = useSearchParams();

  if (searchParams.get('modal') !== 'google-contacts') return null;

  const connected = searchParams.get('googleAuth') === 'connected';

  const close = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('modal');
      return next;
    });

  const setAuth = (value: 'connected' | 'disconnected') =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('googleAuth', value);
      if (value === 'connected') next.delete('modal');
      return next;
    });

  return (
    <Modal
      open
      title="Connect Google Contacts"
      onClose={close}
      footer={
        connected ? (
          <>
            <Button variant="danger" onClick={() => setAuth('disconnected')}>
              Disconnect
            </Button>
            <Button variant="primary" onClick={close}>
              Done
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button variant="primary" iconLeft={<PlugZap />} onClick={() => setAuth('connected')}>
              Connect account
            </Button>
          </>
        )
      }
    >
      <div className="crm-gmodal">
        <div className="crm-gmodal__row">
          <span className="crm-gmodal__label">Account</span>
          <span>anita.sharma@northline.example</span>
        </div>
        <div className="crm-gmodal__row">
          <span className="crm-gmodal__label">Requested access</span>
          <span>Read contacts (import only)</span>
        </div>
        <div className="crm-gmodal__row">
          <span className="crm-gmodal__label">Status</span>
          {connected ? (
            <Badge tone="success" icon={<CheckCircle2 />}>
              Connected
            </Badge>
          ) : (
            <Badge tone="danger">Not connected</Badge>
          )}
        </div>
        <p className="crm-gmodal__note">
          Google Contacts is import-only. TalkTrack remains the source of truth and will not push
          changes back to Google. Export naming is configurable in Settings.
        </p>
      </div>
    </Modal>
  );
}
