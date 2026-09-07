import type { FlowTestRun } from '../domain/types';

export const testRuns: FlowTestRun[] = [
  {
    id: 'run_price_live_1',
    flowId: 'flow_price_live',
    versionId: 'ver_price_live_2',
    testContactId: 'contact_rahul_shah',
    startedAt: '2026-07-30T11:15:00+05:30',
    completedAt: '2026-07-30T11:20:00+05:30',
    status: 'complete',
    path: [
      { nodeId: 'msg_01', nodeLabel: 'Welcome message', kind: 'message', detail: 'Sent: "Hi! Thanks for asking about pricing…"' },
      { nodeId: 'question_01', nodeLabel: 'Ask order size', kind: 'question', detail: 'Asked which order size the customer needs.', simulatedAnswer: 'Bulk order' },
      { nodeId: 'branch_01', nodeLabel: 'Route by order size', kind: 'branch', detail: 'Matched branch "Bulk order".' },
      { nodeId: 'wait_01', nodeLabel: 'Prepare bulk pricing (2 days)', kind: 'wait', detail: 'Simulated 2-day wait (business hours only). Template fallback available.' },
      { nodeId: 'msg_02', nodeLabel: 'Send bulk pricing', kind: 'message', detail: 'Sent interactive message with pricing options.' },
      { nodeId: 'handover_01', nodeLabel: 'Hand off to Delhi Sales', kind: 'handover', detail: 'Conversation handed to team Delhi Sales with full context.' },
    ],
    resultingUpdates: [
      { label: 'Tag added', value: 'from-answer:bulk-order' },
      { label: 'Owner', value: 'Delhi Sales (team)' },
    ],
  },
  {
    id: 'run_appointment_1',
    flowId: 'flow_appointment_tested',
    versionId: 'ver_appointment_1',
    testContactId: 'contact_priya_menon',
    startedAt: '2026-08-04T15:55:00+05:30',
    completedAt: '2026-08-04T16:00:00+05:30',
    status: 'complete',
    path: [
      { nodeId: 'ar_question_date', nodeLabel: 'Ask preferred date', kind: 'question', detail: 'Asked for preferred visit date.', simulatedAnswer: '2026-08-20' },
      { nodeId: 'ar_update_booked', nodeLabel: 'Tag appointment booked', kind: 'update', detail: 'Tag "appointment-booked" added.' },
      { nodeId: 'ar_msg_confirm', nodeLabel: 'Confirm appointment', kind: 'message', detail: 'Sent confirmation message.' },
      { nodeId: 'ar_wait_reminder', nodeLabel: 'Wait until day before visit', kind: 'wait', detail: 'Simulated wait until the day before the visit.' },
      { nodeId: 'ar_msg_reminder', nodeLabel: 'Send reminder', kind: 'message', detail: 'Sent "Appointment Reminder" approved template.' },
      { nodeId: 'ar_end', nodeLabel: 'End', kind: 'end', detail: 'Flow completed.' },
    ],
    resultingUpdates: [
      { label: 'Field updated', value: 'appointmentDate = 2026-08-20' },
      { label: 'Tag added', value: 'appointment-booked' },
    ],
  },
  {
    id: 'run_dispatch_1',
    flowId: 'flow_dispatch_changed',
    versionId: 'ver_dispatch_1',
    testContactId: 'contact_arjun_verma',
    startedAt: '2026-07-15T08:55:00+05:30',
    completedAt: '2026-07-15T09:00:00+05:30',
    status: 'complete',
    path: [
      { nodeId: 'dd_msg_dispatch', nodeLabel: 'Dispatch notification', kind: 'message', detail: 'Sent "Dispatch Update" approved template.' },
      { nodeId: 'dd_wait_transit', nodeLabel: 'Wait 3 days for delivery', kind: 'wait', detail: 'Simulated 3-day wait. Template fallback available.' },
      { nodeId: 'dd_msg_delivered', nodeLabel: 'Delivery confirmation', kind: 'message', detail: 'Sent "Delivery Confirmation" approved template.' },
      { nodeId: 'dd_end', nodeLabel: 'End', kind: 'end', detail: 'Flow completed.' },
    ],
    resultingUpdates: [],
  },
  {
    id: 'run_order_1',
    flowId: 'flow_order_paused',
    versionId: 'ver_order_2',
    testContactId: 'contact_sneha_iyer',
    startedAt: '2026-06-20T09:55:00+05:30',
    completedAt: '2026-06-20T10:00:00+05:30',
    status: 'complete',
    path: [
      { nodeId: 'op_msg_confirm', nodeLabel: 'Order confirmation', kind: 'message', detail: 'Sent "Order Confirmation" approved template.' },
      { nodeId: 'op_wait_payment', nodeLabel: 'Wait 2 days for payment', kind: 'wait', detail: 'Simulated 2-day wait. Template fallback available.' },
      { nodeId: 'op_msg_reminder', nodeLabel: 'Payment reminder', kind: 'message', detail: 'Sent "Payment Reminder" approved template.' },
      { nodeId: 'op_update_pending', nodeLabel: 'Tag payment pending', kind: 'update', detail: 'Tag "payment-pending" added.' },
      { nodeId: 'op_end', nodeLabel: 'End', kind: 'end', detail: 'Flow completed.' },
    ],
    resultingUpdates: [{ label: 'Tag added', value: 'payment-pending' }],
  },
  {
    id: 'run_feedback_1',
    flowId: 'flow_feedback_inactive',
    versionId: 'ver_feedback_2',
    testContactId: 'contact_imran_qureshi',
    startedAt: '2026-04-10T09:55:00+05:30',
    completedAt: '2026-04-10T10:00:00+05:30',
    status: 'complete',
    path: [
      { nodeId: 'fe_question_rating', nodeLabel: 'Ask satisfaction rating', kind: 'question', detail: 'Asked for a 1-5 rating.', simulatedAnswer: '2' },
      { nodeId: 'fe_branch_rating', nodeLabel: 'Route by rating', kind: 'branch', detail: 'Matched branch "2" (low rating).' },
      { nodeId: 'fe_update_negative', nodeLabel: 'Tag negative feedback', kind: 'update', detail: 'Tag "feedback-negative" added, priority set to High.' },
      { nodeId: 'fe_handover_support', nodeLabel: 'Escalate to Support', kind: 'handover', detail: 'Conversation handed to team Delhi Support with full context.' },
    ],
    resultingUpdates: [
      { label: 'Tag added', value: 'feedback-negative' },
      { label: 'Priority', value: 'High' },
      { label: 'Owner', value: 'Delhi Support (team)' },
    ],
  },
  {
    id: 'run_approval_1',
    flowId: 'flow_approval_required_demo',
    versionId: 'ver_approval_1',
    testContactId: 'contact_kavita_desai',
    startedAt: '2026-08-06T09:55:00+05:30',
    completedAt: '2026-08-06T10:00:00+05:30',
    status: 'complete',
    path: [
      { nodeId: 'lc_msg_welcome', nodeLabel: 'Welcome message', kind: 'message', detail: 'Sent welcome message.' },
      { nodeId: 'lc_question_intent', nodeLabel: 'Ask intent', kind: 'question', detail: 'Asked what the customer is looking for.', simulatedAnswer: 'Bulk order' },
      { nodeId: 'lc_branch_intent', nodeLabel: 'Route by intent', kind: 'branch', detail: 'Matched branch "Bulk order".' },
      { nodeId: 'lc_update_bulk', nodeLabel: 'Tag as bulk-buyer lead', kind: 'update', detail: 'Tag "bulk-buyer" added, stage set to Qualified.' },
      { nodeId: 'lc_handover_sales', nodeLabel: 'Hand off to Delhi Sales', kind: 'handover', detail: 'Conversation handed to team Delhi Sales with full context.' },
    ],
    resultingUpdates: [
      { label: 'Tag added', value: 'bulk-buyer' },
      { label: 'Stage', value: 'Qualified' },
    ],
  },
  {
    id: 'run_lead_testing_1',
    flowId: 'flow_lead_testing',
    versionId: 'ver_lead_testing_1',
    testContactId: 'contact_deepa_krishnan',
    startedAt: '2026-08-11T09:28:00+05:30',
    completedAt: null,
    status: 'running',
    path: [
      { nodeId: 'lc_msg_welcome', nodeLabel: 'Welcome message', kind: 'message', detail: 'Sent welcome message.' },
      { nodeId: 'lc_question_intent', nodeLabel: 'Ask intent', kind: 'question', detail: 'Waiting for a simulated answer…' },
    ],
    resultingUpdates: [],
  },
];

export function testRunsOfFlow(flowId: string): FlowTestRun[] {
  return testRuns.filter((run) => run.flowId === flowId).sort((a, b) => a.startedAt.localeCompare(b.startedAt));
}

export function findTestRun(id: string): FlowTestRun | undefined {
  return testRuns.find((run) => run.id === id);
}
