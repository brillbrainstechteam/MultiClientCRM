import { useNavigate } from 'react-router-dom';
import { useQueryPatch } from '@crm/app/use-query-patch';
import { findOnboardingNumber } from '@crm/mock-data';
import type { GuidedSetupMode } from '../onboarding-constants';
import { BusinessBasicsStep } from './stage1/BusinessBasicsStep';
import { OrganisationStep } from './stage1/OrganisationStep';
import { NumberReadinessStep } from './stage1/NumberReadinessStep';

export interface StageRouterProps {
  mode: GuidedSetupMode;
  numberId: string | null;
}

/**
 * Stage 1 — Your Number (C02 Basics, optional C03 Organisation, C04
 * Readiness). Add Number mode skips basics/organisation — that information is
 * already known for the tenant — and starts directly on the number-specific
 * readiness questionnaire (ONBOARDING_GENERATION_SPEC.md §12).
 */
export function Stage1Router({ mode, numberId }: StageRouterProps) {
  const navigate = useNavigate();
  const [params, patch] = useQueryPatch();
  const step = params.get('step') ?? (mode === 'add-number' ? 'readiness' : 'basics');
  const record = numberId ? findOnboardingNumber(numberId) : undefined;

  const exitTo = mode === 'add-number' ? '/settings/whatsapp' : '/setup';

  if (step === 'organisation' && mode === 'first-time') {
    return (
      <OrganisationStep
        onBack={() => patch({ step: 'basics' })}
        onContinue={() => patch({ step: 'readiness' })}
      />
    );
  }

  if (step === 'readiness') {
    return (
      <NumberReadinessStep
        record={record}
        onBack={() => (mode === 'add-number' ? navigate(exitTo) : patch({ step: 'organisation' }))}
        onContinue={(usageToday) => patch({ stage: 'strategy', step: null, usageToday })}
      />
    );
  }

  return (
    <BusinessBasicsStep
      onBack={() => navigate(exitTo)}
      onContinue={() => patch({ step: 'organisation' })}
    />
  );
}
