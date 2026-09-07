import type { ReactNode } from 'react';
import { useQueryPatch } from '@crm/app/use-query-patch';
import { connectionProgressFor, findOnboardingNumber, type ConnectionStrategy, type MetaReturnState } from '@crm/mock-data';
import { AssetReviewStep } from './stage3/AssetReviewStep';
import { ConnectionProgressStep } from './stage3/ConnectionProgressStep';
import { MetaExternalStep } from './stage3/MetaExternalStep';
import { MetaPreflightStep } from './stage3/MetaPreflightStep';
import { MetaReturnStep } from './stage3/MetaReturnStep';
import { SetupIssueDrawer } from './stage3/SetupIssueDrawer';
import { VerificationStep } from './stage3/VerificationStep';
import type { StageRouterProps } from './Stage1Router';

/**
 * Stage 3 — Connect with Meta (C10 Preflight, external placeholder, C11
 * Return, C12 Review, C13 Verification, C14 Progress, C15 Issue drawer).
 */
export function Stage3Router({ numberId }: StageRouterProps) {
  const [params, patch] = useQueryPatch();
  const step = params.get('step') ?? 'preflight';
  const strategy = (params.get('strategy') as ConnectionStrategy | null) ?? 'coexistence';
  const record = numberId ? findOnboardingNumber(numberId) : undefined;
  const drawerIssue = params.get('drawer') === 'issue' ? params.get('issue') : null;
  const verificationRequired = strategy === 'new_number' || strategy === 'migrate_provider';

  const closeDrawer = () => patch({ drawer: null, issue: null });

  let body: ReactNode;

  if (step === 'external') {
    body = (
      <MetaExternalStep
        onBack={() => patch({ step: 'preflight' })}
        onReturn={(state: MetaReturnState) => patch({ step: 'return', state })}
      />
    );
  } else if (step === 'return') {
    const state = (params.get('state') as MetaReturnState | null) ?? 'completed';
    body = (
      <MetaReturnStep
        state={state}
        onBack={() => patch({ step: 'external', state: null })}
        onRetry={() => patch({ step: 'external', state: null })}
        onContactSupport={() => patch({ drawer: 'issue', issue: 'meta-return' })}
        onContinue={() => patch({ step: 'review', state: null })}
      />
    );
  } else if (step === 'review') {
    body = (
      <AssetReviewStep
        record={record}
        strategy={strategy}
        onBack={() => patch({ step: 'return', state: 'completed' })}
        onWrongSelection={() => patch({ stage: 'strategy', step: null, strategy: null })}
        onContinue={() =>
          verificationRequired ? patch({ step: 'verification', state: 'required' }) : patch({ step: 'progress' })
        }
      />
    );
  } else if (step === 'verification') {
    const state = (params.get('state') as 'required' | 'complete' | 'failed' | null) ?? 'required';
    body = (
      <VerificationStep
        state={state}
        onBack={() => patch({ step: 'review' })}
        onMarkComplete={() => patch({ state: 'complete' })}
        onContinue={() => patch({ step: 'progress', state: null })}
        onRetry={() => patch({ state: 'required' })}
        onContactSupport={() => patch({ drawer: 'issue', issue: 'account' })}
      />
    );
  } else if (step === 'progress') {
    const steps = record?.connectionProgress ?? connectionProgressFor('complete');
    body = (
      <ConnectionProgressStep
        steps={steps}
        onBack={() => patch({ step: verificationRequired ? 'verification' : 'review', state: verificationRequired ? 'complete' : null })}
        onContinue={() => patch({ stage: 'activate', step: 'plan' })}
        onGetHelp={(stepId) => patch({ drawer: 'issue', issue: stepId })}
      />
    );
  } else {
    body = <MetaPreflightStep onBack={() => patch({ stage: 'strategy' })} onContinue={() => patch({ step: 'external' })} />;
  }

  return (
    <>
      {body}
      <SetupIssueDrawer open={Boolean(drawerIssue)} issueId={drawerIssue} onClose={closeDrawer} />
    </>
  );
}
