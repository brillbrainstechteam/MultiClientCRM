import { ConfirmDialog } from '@crm/design-system';

/**
 * CAM-M05 — Archive Confirmation. Archive is not a seventh delivery status
 * (CLAUDE.md §Campaign status model) — it only hides the campaign from
 * default operational views (`isArchived`); the underlying status (usually
 * Completed) is preserved and the record stays visible under the Archived view.
 */
export function ArchiveConfirmModal({
  open,
  campaignName,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  campaignName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <ConfirmDialog
      open={open}
      title="Archive campaign?"
      message={
        <>
          Archiving <strong>{campaignName}</strong> hides it from the default Campaigns views. Its status,
          results and history are preserved, and you can find it again under the Archived view.
        </>
      }
      confirmLabel="Archive"
      cancelLabel="Cancel"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
