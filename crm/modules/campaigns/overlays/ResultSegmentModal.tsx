import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { Button, Input, Modal, Select } from '@crm/design-system';
import { recipientStatusLabel } from '../campaigns-labels';
import type { Campaign, RecipientStatus } from '../domain/types';

const resultOptions: { value: RecipientStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All recipients' },
  ...(Object.entries(recipientStatusLabel) as [RecipientStatus, string][]).map(([value, label]) => ({ value, label })),
];

/**
 * CAM-M07 — Create Result Segment. Campaigns owns result-based segmentation
 * but not the Contacts segment record itself (CLAUDE.md §Module boundaries)
 * — confirming hands off to Contacts' segment builder rather than persisting
 * a second segment store here, mirroring the Audience step's existing
 * "Save this audience as a Contacts segment" handoff.
 */
export function ResultSegmentModal({
  open,
  campaign,
  initialResult,
  onClose,
}: {
  open: boolean;
  campaign: Campaign;
  initialResult: RecipientStatus | 'all';
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const [result, setResult] = useState<RecipientStatus | 'all'>(initialResult);
  const [name, setName] = useState(
    initialResult === 'all' ? `${campaign.name} — all recipients` : `${campaign.name} — ${recipientStatusLabel[initialResult]}`,
  );

  const matchCount = campaign.recipients.filter((r) => result === 'all' || r.status === result).length;

  const handleResultChange = (value: RecipientStatus | 'all') => {
    setResult(value);
    setName(value === 'all' ? `${campaign.name} — all recipients` : `${campaign.name} — ${recipientStatusLabel[value]}`);
  };

  const handleCreate = () => {
    navigate(
      scopedHref('/contacts/segments/new', {
        source: 'campaign',
        campaignId: campaign.id,
        result,
        name,
        returnTo: scopedHref(`/campaigns/${campaign.id}`, { tab: 'recipients' }),
      }),
    );
    onClose();
  };

  return (
    <Modal
      open={open}
      title="Create result segment"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={matchCount === 0} onClick={handleCreate}>
            Create segment
          </Button>
        </>
      }
    >
      <div className="crm-camp-segment-modal">
        <Select
          label="Recipients to include"
          options={resultOptions}
          value={result}
          onChange={(e) => handleResultChange(e.target.value as RecipientStatus | 'all')}
        />
        <Input label="Segment name" value={name} onChange={(e) => setName(e.target.value)} />
        <p className="crm-camp-segment-modal__note">
          {matchCount.toLocaleString('en-IN')} recipient(s) match this result. This creates a Contacts segment — Campaigns does not keep its own copy.
        </p>
      </div>
    </Modal>
  );
}
