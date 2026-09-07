import type { BadgeTone } from '@crm/design-system';
import type {
  BusinessDisposition,
  CallListStatus,
  CallTaskStatus,
  ConnectionStatus,
  NextActionKey,
} from './domain';

export const connectionStatusLabel: Record<ConnectionStatus, string> = {
  connected: 'Connected',
  no_answer: 'No answer',
  busy: 'Busy',
  unreachable: 'Unreachable',
  invalid: 'Invalid number',
};

export const connectionStatusTone: Record<ConnectionStatus, BadgeTone> = {
  connected: 'success',
  no_answer: 'neutral',
  busy: 'warning',
  unreachable: 'warning',
  invalid: 'danger',
};

export const dispositionLabel: Record<BusinessDisposition, string> = {
  interested: 'Interested',
  not_interested: 'Not interested',
  follow_up: 'Follow-up needed',
  completed: 'Completed',
};

export const dispositionTone: Record<BusinessDisposition, BadgeTone> = {
  interested: 'success',
  not_interested: 'neutral',
  follow_up: 'info',
  completed: 'brand',
};

export const nextActionLabel: Record<NextActionKey, string> = {
  none: 'No further action',
  schedule_follow_up: 'Schedule follow-up',
  send_whatsapp: 'Send WhatsApp',
  update_customer: 'Update customer record',
  escalate: 'Escalate',
};

export const taskStatusLabel: Record<CallTaskStatus, string> = {
  scheduled: 'Scheduled',
  due: 'Due',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const taskStatusTone: Record<CallTaskStatus, BadgeTone> = {
  scheduled: 'neutral',
  due: 'warning',
  in_progress: 'info',
  completed: 'success',
  cancelled: 'neutral',
};

export const listStatusLabel: Record<CallListStatus, string> = {
  active: 'Active',
  paused: 'Paused',
  completed: 'Completed',
  closed: 'Closed',
};

export const listStatusTone: Record<CallListStatus, BadgeTone> = {
  active: 'success',
  paused: 'warning',
  completed: 'brand',
  closed: 'neutral',
};
