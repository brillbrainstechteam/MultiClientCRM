import type { WhatsAppBusinessAccount, TemplateFormat } from './types';

/**
 * Deterministic frontend capability resolver (CODE_FIRST_ADAPTER.md
 * "Capability resolver"). One place decides which advanced formats a WABA may
 * use — composer screens must never scatter ad-hoc format checks.
 */
export interface FormatAvailability {
  format: TemplateFormat;
  label: string;
  available: boolean;
  reason?: string;
  ctaLabel?: string;
  ctaTo?: string;
}

const formatLabel: Record<TemplateFormat, string> = {
  standard: 'Standard',
  carousel: 'Carousel',
  catalogue: 'Catalogue / Product',
  authentication: 'Authentication',
  offer: 'Limited-Time Offer / Coupon',
  flow: 'Flow',
  payment: 'Payment / Checkout',
};

export function resolveFormatCapabilities(_waba: WhatsAppBusinessAccount): FormatAvailability[] {
  // Only the formats the Meta submission layer (lib/meta/templates.ts) can
  // actually create are offered — a Standard template (text or image/document
  // header, body, footer, buttons) and an Authentication OTP. Carousel,
  // Catalogue, Limited-Time Offer, Flow and Payment are not surfaced because
  // they can't be submitted yet and aren't needed for B2B jewellery outreach.
  return [
    { format: 'standard', label: formatLabel.standard, available: true },
    { format: 'authentication', label: formatLabel.authentication, available: true },
  ];
}

export function formatAvailability(
  waba: WhatsAppBusinessAccount,
  format: TemplateFormat,
): FormatAvailability {
  const found = resolveFormatCapabilities(waba).find((entry) => entry.format === format);
  // Every TemplateFormat is covered above — this fallback only satisfies the type checker.
  return found ?? { format, label: formatLabel[format], available: false };
}
