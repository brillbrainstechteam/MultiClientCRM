import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Badge, Button, Modal } from '@crm/design-system';

const actionCopy: Record<string, { title: string; confirmPhrase: string; verb: string; danger?: boolean }> = {
  archive: { title: 'Archive templates', confirmPhrase: 'archive', verb: 'archived' },
  delete: { title: 'Delete templates', confirmPhrase: 'permanently delete', verb: 'deleted', danger: true },
  sync: { title: 'Sync with Meta', confirmPhrase: 'sync', verb: 'synced' },
  favourite: { title: 'Favourite templates', confirmPhrase: 'favourite', verb: 'favourited' },
};

/**
 * TPL-S15 — Bulk Actions. Opened from the Repository bulk toolbar as
 * `?mode=bulk&modal=bulk-action&action=…&count=…`. Destructive actions
 * require confirmation; the result communicates success/failure counts.
 */
export function BulkActionModal() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [result, setResult] = useState<'success' | 'partial' | null>(null);

  const open = searchParams.get('modal') === 'bulk-action';
  const action = searchParams.get('action') ?? 'archive';
  const count = Number(searchParams.get('count') ?? '0');
  const copy = actionCopy[action] ?? actionCopy.archive;

  const close = () => {
    setResult(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('modal');
      next.delete('action');
      next.delete('count');
      return next;
    });
  };

  if (!open) return null;

  if (result) {
    const succeeded = result === 'partial' ? Math.max(count - 1, 0) : count;
    const failed = count - succeeded;
    return (
      <Modal open title={copy.title} onClose={close} footer={<Button variant="primary" onClick={close}>Done</Button>}>
        <div className="crm-tpl-bulk__result">
          <p>{succeeded} of {count} templates {copy.verb} successfully.</p>
          {failed > 0 ? (
            <div className="crm-tpl-bulk__failure">
              <Badge tone="danger">{failed} failed</Badge>
              <p>One template is pending Meta review and cannot be changed until that review completes.</p>
            </div>
          ) : null}
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open
      title={copy.title}
      onClose={close}
      footer={
        <>
          <Button variant="secondary" onClick={close}>Cancel</Button>
          <Button variant={copy.danger ? 'danger' : 'primary'} onClick={() => setResult(count > 3 ? 'partial' : 'success')}>
            {copy.danger ? 'Delete' : 'Confirm'}
          </Button>
        </>
      }
    >
      <p className="crm-tpl-bulk__message">
        {copy.danger
          ? `This will permanently remove ${count} selected template${count === 1 ? '' : 's'} from the active repository. This action is permission-controlled and can be reviewed in Deleted.`
          : `This will ${copy.confirmPhrase} ${count} selected template${count === 1 ? '' : 's'}.`}
      </p>
    </Modal>
  );
}
