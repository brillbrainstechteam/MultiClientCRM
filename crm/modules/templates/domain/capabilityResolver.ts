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

export function resolveFormatCapabilities(waba: WhatsAppBusinessAccount): FormatAvailability[] {
  return [
    { format: 'standard', label: formatLabel.standard, available: true },
    { format: 'carousel', label: formatLabel.carousel, available: true },
    { format: 'authentication', label: formatLabel.authentication, available: true },
    { format: 'offer', label: formatLabel.offer, available: true },
    {
      format: 'catalogue',
      label: formatLabel.catalogue,
      available: waba.catalogueConnected,
      reason: waba.catalogueConnected
        ? undefined
        : 'Connect a product catalogue for this WhatsApp Business Account before using catalogue templates.',
      ctaLabel: waba.catalogueConnected ? undefined : 'Configure Catalogue',
      ctaTo: waba.catalogueConnected ? undefined : '/catalogue-orders',
    },
    {
      format: 'flow',
      label: formatLabel.flow,
      available: waba.flowAvailable,
      reason: waba.flowAvailable
        ? undefined
        : 'No Flows are available on this WhatsApp Business Account yet.',
      ctaLabel: waba.flowAvailable ? undefined : 'Manage Flows',
      ctaTo: waba.flowAvailable ? undefined : '/automation',
    },
    {
      format: 'payment',
      label: formatLabel.payment,
      available: waba.paymentAvailable,
      reason: waba.paymentAvailable
        ? undefined
        : 'Payment/checkout templates need a connected commerce provider for this account.',
      ctaLabel: waba.paymentAvailable ? undefined : 'View Commerce Settings',
      ctaTo: waba.paymentAvailable ? undefined : '/settings',
    },
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
