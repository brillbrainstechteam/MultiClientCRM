import type { FlowVersion } from '../domain/types';
import { flows } from './mockFlows';

function nodesOf(flowId: string) {
  const flow = flows.find((f) => f.id === flowId);
  if (!flow) throw new Error(`Unknown flow: ${flowId}`);
  return structuredClone(flow.nodes);
}

function triggerOf(flowId: string) {
  const flow = flows.find((f) => f.id === flowId);
  if (!flow) throw new Error(`Unknown flow: ${flowId}`);
  return structuredClone(flow.trigger);
}

// Earlier published snapshot of the flagship flow — before the payment-reminder
// template fallback was added to the bulk-pricing wait (a real, meaningful
// rollback target rather than an identical clone).
const priceLiveV1Nodes = structuredClone(nodesOf('flow_price_live'));
const waitNode = priceLiveV1Nodes.find((n) => n.id === 'wait_01');
if (waitNode && waitNode.type === 'delay_wait') {
  waitNode.config.templateFallbackId = undefined;
  waitNode.config.templateFallbackName = undefined;
}

export const versions: FlowVersion[] = [
  {
    id: 'ver_price_live_1',
    flowId: 'flow_price_live',
    number: 1,
    label: 'Version 1',
    summary: 'Initial published version — bulk-pricing wait had no template fallback configured.',
    status: 'superseded',
    createdBy: 'user_vikram',
    createdAt: '2026-07-20T10:30:00+05:30',
    publishedAt: '2026-07-21T09:00:00+05:30',
    nodes: priceLiveV1Nodes,
    trigger: triggerOf('flow_price_live'),
    startNodeId: 'msg_01',
  },
  {
    id: 'ver_price_live_2',
    flowId: 'flow_price_live',
    number: 2,
    label: 'Version 2',
    summary: 'Added an approved-template fallback to the bulk-pricing wait to resolve the session-window warning.',
    status: 'published',
    createdBy: 'user_vikram',
    createdAt: '2026-07-30T11:00:00+05:30',
    publishedAt: '2026-07-30T11:25:00+05:30',
    nodes: nodesOf('flow_price_live'),
    trigger: triggerOf('flow_price_live'),
    startNodeId: 'msg_01',
  },
  {
    id: 'ver_price_draft_1',
    flowId: 'flow_price_draft_duplicate',
    number: 1,
    label: 'Version 1',
    summary: 'Initial draft.',
    status: 'draft',
    createdBy: 'user_vikram',
    createdAt: '2026-08-05T09:15:00+05:30',
    nodes: nodesOf('flow_price_draft_duplicate'),
    trigger: triggerOf('flow_price_draft_duplicate'),
    startNodeId: 'min_msg',
  },
  {
    id: 'ver_catalogue_draft_1',
    flowId: 'flow_catalogue_draft',
    number: 1,
    label: 'Version 1',
    summary: 'Initial draft cloned from the Catalogue / Quotation Request starter.',
    status: 'draft',
    createdBy: 'user_anita',
    createdAt: '2026-08-08T12:00:00+05:30',
    nodes: nodesOf('flow_catalogue_draft'),
    trigger: triggerOf('flow_catalogue_draft'),
    startNodeId: 'cq_msg_catalogue',
  },
  {
    id: 'ver_appointment_1',
    flowId: 'flow_appointment_tested',
    number: 1,
    label: 'Version 1',
    summary: 'Initial draft, successfully tested.',
    status: 'draft',
    createdBy: 'user_anita',
    createdAt: '2026-07-28T10:30:00+05:30',
    nodes: nodesOf('flow_appointment_tested'),
    trigger: triggerOf('flow_appointment_tested'),
    startNodeId: 'ar_question_date',
  },
  {
    id: 'ver_dispatch_1',
    flowId: 'flow_dispatch_changed',
    number: 1,
    label: 'Version 1',
    summary: 'Initial draft, tested successfully.',
    status: 'superseded',
    createdBy: 'user_vikram',
    createdAt: '2026-07-10T09:00:00+05:30',
    nodes: nodesOf('flow_dispatch_changed'),
    trigger: triggerOf('flow_dispatch_changed'),
    startNodeId: 'dd_msg_dispatch',
  },
  {
    id: 'ver_dispatch_2',
    flowId: 'flow_dispatch_changed',
    number: 2,
    label: 'Version 2',
    summary: 'Wording edit on the dispatch notification — not yet re-tested.',
    status: 'draft',
    createdBy: 'user_vikram',
    createdAt: '2026-08-09T17:20:00+05:30',
    nodes: nodesOf('flow_dispatch_changed'),
    trigger: triggerOf('flow_dispatch_changed'),
    startNodeId: 'dd_msg_dispatch',
  },
  {
    id: 'ver_order_1',
    flowId: 'flow_order_paused',
    number: 1,
    label: 'Version 1',
    summary: 'Initial published version.',
    status: 'superseded',
    createdBy: 'user_anita',
    createdAt: '2026-05-15T09:00:00+05:30',
    publishedAt: '2026-05-16T09:00:00+05:30',
    nodes: nodesOf('flow_order_paused'),
    trigger: triggerOf('flow_order_paused'),
    startNodeId: 'op_msg_confirm',
  },
  {
    id: 'ver_order_2',
    flowId: 'flow_order_paused',
    number: 2,
    label: 'Version 2',
    summary: 'Adjusted payment reminder wait from 3 to 2 days.',
    status: 'published',
    createdBy: 'user_anita',
    createdAt: '2026-06-20T09:30:00+05:30',
    publishedAt: '2026-06-20T10:00:00+05:30',
    nodes: nodesOf('flow_order_paused'),
    trigger: triggerOf('flow_order_paused'),
    startNodeId: 'op_msg_confirm',
  },
  {
    id: 'ver_feedback_1',
    flowId: 'flow_feedback_inactive',
    number: 1,
    label: 'Version 1',
    summary: 'Initial published version.',
    status: 'superseded',
    createdBy: 'user_vikram',
    createdAt: '2026-02-01T09:00:00+05:30',
    publishedAt: '2026-02-02T09:00:00+05:30',
    nodes: nodesOf('flow_feedback_inactive'),
    trigger: triggerOf('flow_feedback_inactive'),
    startNodeId: 'fe_question_rating',
  },
  {
    id: 'ver_feedback_2',
    flowId: 'flow_feedback_inactive',
    number: 2,
    label: 'Version 2',
    summary: 'Added priority flag on negative feedback before escalation.',
    status: 'published',
    createdBy: 'user_anita',
    createdAt: '2026-04-10T09:30:00+05:30',
    publishedAt: '2026-04-10T10:00:00+05:30',
    nodes: nodesOf('flow_feedback_inactive'),
    trigger: triggerOf('flow_feedback_inactive'),
    startNodeId: 'fe_question_rating',
  },
  {
    id: 'ver_lead_testing_1',
    flowId: 'flow_lead_testing',
    number: 1,
    label: 'Version 1',
    summary: 'Initial draft cloned from the Lead Capture & Qualification starter.',
    status: 'draft',
    createdBy: 'user_karan',
    createdAt: '2026-08-10T11:00:00+05:30',
    nodes: nodesOf('flow_lead_testing'),
    trigger: triggerOf('flow_lead_testing'),
    startNodeId: 'lc_msg_welcome',
  },
  {
    id: 'ver_session_risk_1',
    flowId: 'flow_session_risk_demo',
    number: 1,
    label: 'Version 1',
    summary: 'Initial draft — demonstrates session-window validation.',
    status: 'draft',
    createdBy: 'user_anita',
    createdAt: '2026-08-09T10:00:00+05:30',
    nodes: nodesOf('flow_session_risk_demo'),
    trigger: triggerOf('flow_session_risk_demo'),
    startNodeId: 'sr_msg_ack',
  },
  {
    id: 'ver_disconnected_1',
    flowId: 'flow_disconnected_invalid',
    number: 1,
    label: 'Version 1',
    summary: 'Initial draft — has an unresolved disconnected node and missing fallback.',
    status: 'draft',
    createdBy: 'user_anita',
    createdAt: '2026-08-07T15:00:00+05:30',
    nodes: nodesOf('flow_disconnected_invalid'),
    trigger: triggerOf('flow_disconnected_invalid'),
    startNodeId: 'di_msg1',
  },
  {
    id: 'ver_approval_1',
    flowId: 'flow_approval_required_demo',
    number: 1,
    label: 'Version 1',
    summary: 'Initial draft, tested successfully — awaiting manager approval before publish.',
    status: 'draft',
    createdBy: 'user_vikram',
    createdAt: '2026-08-05T11:00:00+05:30',
    nodes: nodesOf('flow_approval_required_demo'),
    trigger: triggerOf('flow_approval_required_demo'),
    startNodeId: 'lc_msg_welcome',
  },
];

export function versionsOfFlow(flowId: string): FlowVersion[] {
  return versions.filter((v) => v.flowId === flowId).sort((a, b) => a.number - b.number);
}

export function findVersion(id: string): FlowVersion | undefined {
  return versions.find((v) => v.id === id);
}
