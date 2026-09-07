import { useSearchParams } from 'react-router-dom';
import { Drawer } from '@crm/design-system';
import { setupCompletionPercent, setupSteps } from '@crm/mock-data';
import { SetupChecklistWidget } from '../components';

/** DASH-S04 — Setup Checklist as a right-side drawer over any Dashboard page. */
export function SetupChecklistDrawer() {
  const [searchParams, setSearchParams] = useSearchParams();
  const open = searchParams.get('drawer') === 'setup';

  const close = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('drawer');
      return next;
    });

  if (!open) return null;

  const percent = setupCompletionPercent(setupSteps);

  return (
    <Drawer open={open} onClose={close} title="Setup checklist" subtitle={`${percent}% complete`}>
      <SetupChecklistWidget steps={setupSteps} percent={percent} />
    </Drawer>
  );
}
