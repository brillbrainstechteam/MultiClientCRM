import { useState } from 'react';
import { History, RotateCcw, X } from 'lucide-react';
import { Badge, ConfirmDialog, IconButton } from '@crm/design-system';
import { findUser } from '@crm/mock-data';
import type { FlowVersion } from '../domain/types';

const statusTone = { draft: 'neutral', published: 'success', superseded: 'neutral' } as const;

/** Builder Versions panel (spec §14) — a simple list + rollback, no code-diff UI. */
export function VersionsPanel({
  versions,
  canRollback,
  onRollback,
  onClose,
}: {
  versions: FlowVersion[];
  canRollback: boolean;
  onRollback: (versionId: string) => void;
  onClose: () => void;
}) {
  const [confirmVersion, setConfirmVersion] = useState<FlowVersion | null>(null);
  const ordered = [...versions].sort((a, b) => b.number - a.number);

  return (
    <div className="crm-aut-nodeconfig">
      <header className="crm-aut-nodeconfig__header">
        <div className="crm-aut-nodeconfig__heading">
          <p className="crm-aut-nodeconfig__type">Versions</p>
          <p className="crm-aut-trigger__title">{versions.length} version{versions.length === 1 ? '' : 's'}</p>
        </div>
        <IconButton label="Close panel" icon={<X />} size="sm" onClick={onClose} />
      </header>

      <div className="crm-aut-nodeconfig__body">
        <ol className="crm-aut-versions__list">
          {ordered.map((version) => (
            <li key={version.id} className="crm-aut-versions__item">
              <div className="crm-aut-versions__item-head">
                <History size={14} />
                <p className="crm-aut-versions__label">{version.label}</p>
                <Badge tone={statusTone[version.status]}>{version.status}</Badge>
              </div>
              <p className="crm-aut-versions__summary">{version.summary}</p>
              <p className="crm-aut-versions__meta">
                {findUser(version.createdBy)?.name ?? version.createdBy} · {formatDate(version.publishedAt ?? version.createdAt)}
              </p>
              {canRollback && version.status !== 'draft' ? (
                <button className="crm-aut-versions__rollback" onClick={() => setConfirmVersion(version)}>
                  <RotateCcw size={12} /> Rollback to this version
                </button>
              ) : null}
            </li>
          ))}
        </ol>
      </div>

      <ConfirmDialog
        open={Boolean(confirmVersion)}
        title={`Rollback to ${confirmVersion?.label ?? ''}?`}
        message="This restores that version's steps and trigger as a new editable draft. Nothing is deleted — the current content becomes an earlier version in this list."
        confirmLabel="Rollback"
        onConfirm={() => {
          if (confirmVersion) onRollback(confirmVersion.id);
          setConfirmVersion(null);
        }}
        onCancel={() => setConfirmVersion(null)}
      />
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
