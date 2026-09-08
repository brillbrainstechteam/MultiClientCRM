import { Radio, Tag as TagIcon } from 'lucide-react';
import { Badge } from '@crm/design-system';
import type { ConsentState, ContactStage, SalesTier } from '@crm/mock-data';
import {
  consentLabel,
  consentTone,
  salesTierLabel,
  salesTierTone,
  stageLabel,
  stageTone,
  leadStatusLabel,
  leadStatusTone,
  lifecycleLabel,
  lifecycleTone,
  lifecycleStateLabel,
  customerTypeLabel,
} from '../contact-labels';

/** Lifecycle/sales stage chip (CON-S03 header, table column). */
export function StageBadge({ stage }: { stage: ContactStage }) {
  return <Badge tone={stageTone[stage]}>{stageLabel[stage]}</Badge>;
}

/** Prospect pipeline status chip (req 34) — kept separate from lifecycle. */
export function LeadStatusBadge({ status }: { status?: string }) {
  const key = status ?? 'new';
  return <Badge tone={leadStatusTone[key] ?? 'neutral'}>{leadStatusLabel[key] ?? key}</Badge>;
}

/** Customer lifecycle chip (req 37) — prospect vs existing customer, with state. */
export function LifecycleBadge({ stage, state }: { stage?: string; state?: string | null }) {
  const key = stage ?? 'prospect';
  const label = lifecycleLabel[key] ?? key;
  const suffix = state && lifecycleStateLabel[state] ? ` · ${lifecycleStateLabel[state]}` : '';
  return <Badge tone={lifecycleTone[key] ?? 'neutral'}>{label}{suffix}</Badge>;
}

/** B2B / B2C type chip. */
export function CustomerTypeBadge({ type }: { type?: string }) {
  const key = type ?? 'b2b';
  return <Badge tone="neutral" appearance="outline">{customerTypeLabel[key] ?? key.toUpperCase()}</Badge>;
}

/** Consent state chip — never leak opt-out as an innocuous neutral. */
export function ConsentBadge({ consent }: { consent: ConsentState }) {
  return (
    <Badge tone={consentTone[consent]} icon={<Radio />}>
      {consentLabel[consent]}
    </Badge>
  );
}

/** Configurable sales tier chip (prototype default 2.2). Gold = premium tiers. */
export function SalesTierBadge({ tier }: { tier: SalesTier }) {
  const isPremium = tier === 'platinum' || tier === 'gold';
  return (
    <Badge tone={salesTierTone[tier]} appearance={isPremium ? 'soft' : 'outline'}>
      {salesTierLabel[tier]}
    </Badge>
  );
}

/** Acquisition source chip. Source is immutable in the model (2.2). */
export function SourceBadge({ source }: { source: string }) {
  return (
    <Badge tone="neutral" appearance="outline" icon={<TagIcon />}>
      {source}
    </Badge>
  );
}
