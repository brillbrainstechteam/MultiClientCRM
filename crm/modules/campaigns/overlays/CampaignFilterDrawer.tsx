import { useSearchParams } from 'react-router-dom';
import { useWorkspace } from '@crm/app/workspace-context';
import { Button, Drawer, Select } from '@crm/design-system';
import { users } from '@crm/mock-data';
import { typeLabel } from '../campaigns-labels';

/**
 * CAM-DR01 — Campaign Filter Drawer. Advanced filters beyond the toolbar's
 * search/status tabs (type, creator, sender). Opened via `?drawer=filters`
 * from CampaignsOverviewScreen so it is reproducible by URL and can overlay
 * any Campaigns page (mounted once in CampaignsLayout).
 */
export function CampaignFilterDrawer() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { availableWhatsAppNumbers } = useWorkspace();

  const open = searchParams.get('drawer') === 'filters';
  const type = searchParams.get('type') ?? '';
  const creatorId = searchParams.get('creatorId') ?? '';
  const number = searchParams.get('number') ?? '';

  const close = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('drawer');
      return next;
    });

  const setParam = (key: string, value: string) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });

  const clearAll = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const key of ['type', 'creatorId', 'number']) next.delete(key);
      return next;
    });

  const typeOptions = [{ value: '', label: 'All types' }, ...Object.entries(typeLabel).map(([value, label]) => ({ value, label }))];
  const creatorOptions = [{ value: '', label: 'Anyone' }, ...users.map((u) => ({ value: u.id, label: u.name }))];
  const numberOptions = [
    { value: '', label: 'All WhatsApp numbers in scope' },
    ...availableWhatsAppNumbers.map((n) => ({ value: n.id, label: `${n.displayName} (${n.displayNumber})` })),
  ];

  return (
    <Drawer open={open} title="Filter campaigns" onClose={close} footer={
      <>
        <Button variant="ghost" onClick={clearAll}>Clear all</Button>
        <Button variant="primary" onClick={close}>Apply</Button>
      </>
    }>
      <div className="crm-camp-filter-drawer">
        <Select label="Campaign type" options={typeOptions} value={type} onChange={(e) => setParam('type', e.target.value)} />
        <Select label="Created by" options={creatorOptions} value={creatorId} onChange={(e) => setParam('creatorId', e.target.value)} />
        <Select label="WhatsApp number" options={numberOptions} value={number} onChange={(e) => setParam('number', e.target.value)} />
      </div>
    </Drawer>
  );
}
