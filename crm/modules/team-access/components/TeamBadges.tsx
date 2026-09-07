import { Badge, StatusBadge } from '@crm/design-system';
import type { BadgeTone } from '@crm/design-system';
import type { EmploymentStatus, InviteStatus } from '../team-access-types';
import type { UserAvailability } from '@crm/mock-data';

const employmentTone: Record<EmploymentStatus, BadgeTone> = {
  active: 'success',
  pending: 'info',
  inactive: 'neutral',
};

const employmentLabel: Record<EmploymentStatus, string> = {
  active: 'Active',
  pending: 'Pending',
  inactive: 'Inactive',
};

export function EmploymentStatusBadge({ status, invite }: { status: EmploymentStatus; invite?: InviteStatus }) {
  if (status === 'pending' && invite === 'expired') {
    return <Badge tone="danger">Invite expired</Badge>;
  }
  return <Badge tone={employmentTone[status]}>{employmentLabel[status]}</Badge>;
}

const availabilityTone: Record<UserAvailability, BadgeTone> = {
  available: 'success',
  busy: 'warning',
  away: 'info',
  offline: 'neutral',
};

const availabilityLabel: Record<UserAvailability, string> = {
  available: 'Available',
  busy: 'Busy',
  away: 'Away',
  offline: 'Offline',
};

export function AvailabilityBadge({ availability }: { availability: UserAvailability }) {
  return <StatusBadge tone={availabilityTone[availability]}>{availabilityLabel[availability]}</StatusBadge>;
}

const riskTone: Record<'standard' | 'elevated' | 'high', BadgeTone> = {
  standard: 'neutral',
  elevated: 'warning',
  high: 'danger',
};

const riskLabel: Record<'standard' | 'elevated' | 'high', string> = {
  standard: 'Standard',
  elevated: 'Elevated',
  high: 'High',
};

export function RiskBadge({ risk }: { risk: 'standard' | 'elevated' | 'high' }) {
  return <Badge tone={riskTone[risk]}>{riskLabel[risk]}</Badge>;
}
