import { useSearchParams } from 'react-router-dom';
import { Stepper } from '@crm/design-system';
import { STAGE_ITEMS, type GuidedSetupMode } from '../onboarding-constants';
import { Stage1Router } from '../stages/Stage1Router';
import { Stage2Router } from '../stages/Stage2Router';
import { Stage3Router } from '../stages/Stage3Router';
import { Stage4Router } from '../stages/Stage4Router';

export interface GuidedSetupProps {
  mode?: GuidedSetupMode;
}

/**
 * ONB-S02 Guided Setup. One stable route (`/setup/connect` or
 * `/settings/whatsapp/add-number`) carrying `stage`/`step`/`strategy`/`state`
 * so every screen the source spec calls C02–C18 is a deterministic URL
 * instead of its own page (CODE_FIRST_ADAPTER.md §1). Reused unmodified for
 * Add Number via `mode="add-number"`.
 */
export default function GuidedSetup({ mode = 'first-time' }: GuidedSetupProps) {
  const [searchParams] = useSearchParams();
  const stage = searchParams.get('stage') ?? 'number';
  const numberId = searchParams.get('numberId');

  return (
    <div className="crm-guided-setup">
      <Stepper items={STAGE_ITEMS} currentId={stage} />
      <div className="crm-guided-setup__card">
        {stage === 'strategy' ? (
          <Stage2Router mode={mode} numberId={numberId} />
        ) : stage === 'meta' ? (
          <Stage3Router mode={mode} numberId={numberId} />
        ) : stage === 'activate' ? (
          <Stage4Router mode={mode} numberId={numberId} />
        ) : (
          <Stage1Router mode={mode} numberId={numberId} />
        )}
      </div>
    </div>
  );
}
