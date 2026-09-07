import { useNavigate } from 'react-router-dom';
import { useQueryPatch } from '@crm/app/use-query-patch';
import { ConnectionStrategyStep } from './stage2/ConnectionStrategyStep';
import { CoexistenceAcknowledgement } from './stage2/CoexistenceAcknowledgement';
import { MigrationStep } from './stage2/MigrationStep';
import { NewNumberStep } from './stage2/NewNumberStep';
import type { StageRouterProps } from './Stage1Router';

/**
 * Stage 2 — Best Connection Option (C05 Strategy, C06 Compare, C07
 * Coexistence acknowledgement, C08 Migration, C09 New Number).
 */
export function Stage2Router({ mode, numberId }: StageRouterProps) {
  const navigate = useNavigate();
  const [params, patch] = useQueryPatch();
  const strategy = params.get('strategy');
  const step = params.get('step');
  const usageToday = (params.get('usageToday') as import('@crm/mock-data').NumberUsageToday | null) ?? 'business_app';
  const forceUnavailable = params.get('state') === 'coexistence-unavailable';
  const exitTo = mode === 'add-number' ? '/settings/whatsapp' : '/setup';
  void numberId;

  if (strategy === 'coexistence' && step === 'acknowledge') {
    return (
      <CoexistenceAcknowledgement
        onBack={() => patch({ strategy: null, step: null })}
        onContinue={() => patch({ stage: 'meta', step: 'preflight', strategy: 'coexistence', drawer: null })}
      />
    );
  }

  if (strategy === 'migrate-business-app' || strategy === 'migrate-provider') {
    return (
      <MigrationStep
        variant={strategy === 'migrate-business-app' ? 'business-app' : 'provider'}
        onBack={() => patch({ strategy: null })}
        onContinue={() =>
          patch({
            stage: 'meta',
            step: 'preflight',
            strategy: strategy === 'migrate-business-app' ? 'migrate_business_app' : 'migrate_provider',
          })
        }
      />
    );
  }

  if (strategy === 'new-number') {
    return (
      <NewNumberStep
        onBack={() => patch({ strategy: null })}
        onContinue={() => patch({ stage: 'meta', step: 'preflight', strategy: 'new_number' })}
      />
    );
  }

  return (
    <ConnectionStrategyStep
      usageToday={usageToday}
      forceUnavailable={forceUnavailable}
      onBack={() => (mode === 'add-number' ? navigate(exitTo) : patch({ stage: 'number', step: 'readiness' }))}
      onSelect={(selected) => {
        if (selected === 'coexistence') {
          patch({ strategy: 'coexistence', step: 'acknowledge' });
        } else if (selected === 'migrate_business_app') {
          patch({ strategy: 'migrate-business-app' });
        } else if (selected === 'migrate_provider') {
          patch({ strategy: 'migrate-provider' });
        } else {
          patch({ strategy: 'new-number' });
        }
      }}
    />
  );
}
