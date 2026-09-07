import type { FlowAuditEvent } from '../domain/types';

export const auditEvents: FlowAuditEvent[] = [
  { id: 'aud_price_1', flowId: 'flow_price_live', actorId: 'user_vikram', action: 'created', detail: 'Created from the Lead Capture & Qualification starter.', at: '2026-07-20T10:00:00+05:30' },
  { id: 'aud_price_2', flowId: 'flow_price_live', actorId: 'user_vikram', action: 'tested', detail: 'Completed a test run with contact Rahul Shah.', at: '2026-07-20T10:45:00+05:30' },
  { id: 'aud_price_3', flowId: 'flow_price_live', actorId: 'user_vikram', action: 'published', detail: 'Published Version 1 — went Live immediately.', at: '2026-07-21T09:00:00+05:30' },
  { id: 'aud_price_4', flowId: 'flow_price_live', actorId: 'user_vikram', action: 'edited', detail: 'Added an approved-template fallback to the bulk-pricing wait.', at: '2026-07-30T11:00:00+05:30' },
  { id: 'aud_price_5', flowId: 'flow_price_live', actorId: 'user_vikram', action: 'tested', detail: 'Re-tested after the edit — session-window warning resolved.', at: '2026-07-30T11:20:00+05:30' },
  { id: 'aud_price_6', flowId: 'flow_price_live', actorId: 'user_vikram', action: 'published', detail: 'Published Version 2.', at: '2026-07-30T11:25:00+05:30' },

  { id: 'aud_price_draft_1', flowId: 'flow_price_draft_duplicate', actorId: 'user_vikram', action: 'created', detail: 'Created from the Minimal Flow starter.', at: '2026-08-05T09:15:00+05:30' },
  { id: 'aud_price_draft_2', flowId: 'flow_price_draft_duplicate', actorId: 'user_vikram', action: 'edited', detail: 'Set trigger keyword to "price".', at: '2026-08-06T14:40:00+05:30' },

  { id: 'aud_catalogue_1', flowId: 'flow_catalogue_draft', actorId: 'user_anita', action: 'created', detail: 'Created from the Catalogue / Quotation Request starter.', at: '2026-08-08T12:00:00+05:30' },

  { id: 'aud_appt_1', flowId: 'flow_appointment_tested', actorId: 'user_anita', action: 'created', detail: 'Created from the Appointment / Event Registration starter.', at: '2026-07-28T10:30:00+05:30' },
  { id: 'aud_appt_2', flowId: 'flow_appointment_tested', actorId: 'user_anita', action: 'tested', detail: 'Completed a test run with contact Priya Menon.', at: '2026-08-04T16:00:00+05:30' },

  { id: 'aud_dispatch_1', flowId: 'flow_dispatch_changed', actorId: 'user_vikram', action: 'created', detail: 'Created from the Dispatch / Delivery Update starter.', at: '2026-07-10T09:00:00+05:30' },
  { id: 'aud_dispatch_2', flowId: 'flow_dispatch_changed', actorId: 'user_vikram', action: 'tested', detail: 'Completed a test run with contact Arjun Verma.', at: '2026-07-15T09:00:00+05:30' },
  { id: 'aud_dispatch_3', flowId: 'flow_dispatch_changed', actorId: 'user_vikram', action: 'edited', detail: 'Edited the dispatch notification wording.', at: '2026-08-09T17:20:00+05:30' },

  { id: 'aud_order_1', flowId: 'flow_order_paused', actorId: 'user_anita', action: 'created', detail: 'Created from the Order Confirmation & Payment Reminder starter.', at: '2026-05-15T09:00:00+05:30' },
  { id: 'aud_order_2', flowId: 'flow_order_paused', actorId: 'user_anita', action: 'tested', detail: 'Completed a test run with contact Sneha Iyer.', at: '2026-05-15T09:40:00+05:30' },
  { id: 'aud_order_3', flowId: 'flow_order_paused', actorId: 'user_anita', action: 'published', detail: 'Published Version 1 — went Live immediately.', at: '2026-05-16T09:00:00+05:30' },
  { id: 'aud_order_4', flowId: 'flow_order_paused', actorId: 'user_anita', action: 'edited', detail: 'Reduced payment reminder wait from 3 to 2 days.', at: '2026-06-20T09:30:00+05:30' },
  { id: 'aud_order_5', flowId: 'flow_order_paused', actorId: 'user_anita', action: 'tested', detail: 'Re-tested after the edit.', at: '2026-06-20T10:00:00+05:30' },
  { id: 'aud_order_6', flowId: 'flow_order_paused', actorId: 'user_anita', action: 'published', detail: 'Published Version 2.', at: '2026-06-20T10:05:00+05:30' },
  { id: 'aud_order_7', flowId: 'flow_order_paused', actorId: 'user_anita', action: 'paused', detail: 'Paused while payment provider terms are renegotiated.', at: '2026-07-25T12:00:00+05:30' },

  { id: 'aud_feedback_1', flowId: 'flow_feedback_inactive', actorId: 'user_vikram', action: 'created', detail: 'Created from the Feedback & Support Escalation starter.', at: '2026-02-01T09:00:00+05:30' },
  { id: 'aud_feedback_2', flowId: 'flow_feedback_inactive', actorId: 'user_vikram', action: 'tested', detail: 'Completed a test run with contact Imran Qureshi.', at: '2026-02-01T09:40:00+05:30' },
  { id: 'aud_feedback_3', flowId: 'flow_feedback_inactive', actorId: 'user_vikram', action: 'published', detail: 'Published Version 1.', at: '2026-02-02T09:00:00+05:30' },
  { id: 'aud_feedback_4', flowId: 'flow_feedback_inactive', actorId: 'user_anita', action: 'edited', detail: 'Added priority flag on negative feedback before escalation.', at: '2026-04-10T09:30:00+05:30' },
  { id: 'aud_feedback_5', flowId: 'flow_feedback_inactive', actorId: 'user_anita', action: 'tested', detail: 'Re-tested after the edit.', at: '2026-04-10T10:00:00+05:30' },
  { id: 'aud_feedback_6', flowId: 'flow_feedback_inactive', actorId: 'user_anita', action: 'published', detail: 'Published Version 2.', at: '2026-04-10T10:05:00+05:30' },
  { id: 'aud_feedback_7', flowId: 'flow_feedback_inactive', actorId: 'user_vikram', action: 'archived', detail: 'Marked Inactive — superseded by the new CSAT survey process.', at: '2026-05-01T09:00:00+05:30' },

  { id: 'aud_lead_testing_1', flowId: 'flow_lead_testing', actorId: 'user_karan', action: 'created', detail: 'Created from the Lead Capture & Qualification starter.', at: '2026-08-10T11:00:00+05:30' },
  { id: 'aud_lead_testing_2', flowId: 'flow_lead_testing', actorId: 'user_karan', action: 'edited', detail: 'Scoped the flow to the Mumbai Sales WhatsApp number.', at: '2026-08-11T09:00:00+05:30' },

  { id: 'aud_session_risk_1', flowId: 'flow_session_risk_demo', actorId: 'user_anita', action: 'created', detail: 'Created to demonstrate session-window validation.', at: '2026-08-09T10:00:00+05:30' },

  { id: 'aud_disconnected_1', flowId: 'flow_disconnected_invalid', actorId: 'user_anita', action: 'created', detail: 'Created for VIP tier routing.', at: '2026-08-07T15:00:00+05:30' },
  { id: 'aud_disconnected_2', flowId: 'flow_disconnected_invalid', actorId: 'user_anita', action: 'edited', detail: 'Added a follow-up message node that was not connected.', at: '2026-08-07T15:40:00+05:30' },

  { id: 'aud_approval_1', flowId: 'flow_approval_required_demo', actorId: 'user_vikram', action: 'created', detail: 'Created from the Lead Capture & Qualification starter for the Festive campaign.', at: '2026-08-05T11:00:00+05:30' },
  { id: 'aud_approval_2', flowId: 'flow_approval_required_demo', actorId: 'user_vikram', action: 'tested', detail: 'Completed a test run with contact Kavita Desai.', at: '2026-08-06T10:00:00+05:30' },
  { id: 'aud_approval_3', flowId: 'flow_approval_required_demo', actorId: 'user_vikram', action: 'sent_for_approval', detail: 'Sent to a workspace owner for publish approval.', at: '2026-08-06T10:10:00+05:30' },
];

export function auditEventsOfFlow(flowId: string): FlowAuditEvent[] {
  return auditEvents.filter((event) => event.flowId === flowId).sort((a, b) => a.at.localeCompare(b.at));
}
