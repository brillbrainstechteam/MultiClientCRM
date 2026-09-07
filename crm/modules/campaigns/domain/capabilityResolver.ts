import type { RoleKey, WhatsAppNumber } from '@crm/mock-data';
import { can } from '../permissions';
import type { Campaign } from './types';

/**
 * Deterministic capability flags (CODE_FIRST_ADAPTER.md §7). One place
 * decides what a given role may do with a given campaign/sender combination —
 * screens must never scatter ad-hoc status/role checks.
 */
export interface CampaignCapabilityFlags {
  senderConnected: boolean;
  senderDisconnectedReason?: string;
  templateUsable: boolean;
  templateUnusableReason?: string;
  canEdit: boolean;
  canSend: boolean;
  canSchedule: boolean;
  canPause: boolean;
  canResume: boolean;
  canCancel: boolean;
  canArchive: boolean;
  canExport: boolean;
  canViewSpend: boolean;
  canCompare: boolean;
  canCreateResultSegment: boolean;
  canRetry: boolean;
  costEstimateAvailable: boolean;
  clickTrackingAvailable: boolean;
  conversionAttributionConfigured: boolean;
}

export function resolveCampaignCapabilities(
  role: RoleKey,
  campaign: Campaign,
  sender: WhatsAppNumber | undefined,
): CampaignCapabilityFlags {
  const senderConnected = sender ? sender.connectionStatus === 'connected' : false;
  const templateUsable = campaign.templateId !== null;

  return {
    senderConnected,
    senderDisconnectedReason: senderConnected
      ? undefined
      : sender
        ? `${sender.displayName} is ${sender.connectionStatus}. Reconnect it before sending or scheduling.`
        : 'No WhatsApp number is selected for this campaign yet.',
    templateUsable,
    templateUnusableReason: templateUsable ? undefined : 'No approved template is attached to this campaign.',
    canEdit: campaign.status === 'draft' && can(role, 'campaign.edit'),
    canSend: campaign.status === 'draft' && can(role, 'campaign.send') && senderConnected && templateUsable,
    canSchedule: campaign.status === 'draft' && can(role, 'campaign.schedule') && senderConnected && templateUsable,
    canPause: campaign.status === 'live' && can(role, 'campaign.pause'),
    canResume: campaign.status === 'paused' && can(role, 'campaign.resume'),
    canCancel: campaign.status === 'scheduled' && can(role, 'campaign.cancel'),
    canArchive:
      (campaign.status === 'completed' || campaign.status === 'cancelled') &&
      !campaign.isArchived &&
      can(role, 'campaign.archive'),
    canExport: can(role, 'campaign.export'),
    canViewSpend: can(role, 'campaign.view_spend'),
    canCompare: can(role, 'campaign.compare'),
    canCreateResultSegment: can(role, 'campaign.create_result_segment'),
    canRetry:
      (campaign.status === 'completed' || campaign.status === 'live' || campaign.status === 'paused') &&
      can(role, 'campaign.retry'),
    costEstimateAvailable: campaign.spend.estimateAvailable,
    clickTrackingAvailable: campaign.analytics?.clicksAvailable ?? false,
    conversionAttributionConfigured: campaign.conversionTrackingConfigured,
  };
}
