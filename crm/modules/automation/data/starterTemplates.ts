/**
 * Starter Flow Gallery seed content (AUTOMATION_GENERATION_SPEC.md §4,
 * BATCHES.md Batch 1). "Use This Flow" deep-clones a template's node graph
 * into a brand-new tenant Draft — templates themselves are never runtime
 * flows and are never mutated.
 */

import type { FlowNode, FlowTrigger, StarterCategory } from '../domain/types';

export interface StarterFlowTemplate {
  id: string;
  category: StarterCategory;
  title: string;
  businessGoal: string;
  description: string;
  capabilitiesNeeded: string[];
  trigger: FlowTrigger;
  nodes: FlowNode[];
  startNodeId: string;
}

export const starterTemplates: StarterFlowTemplate[] = [
  {
    id: 'starter_lead_capture',
    category: 'lead-capture',
    title: 'Lead Capture & Qualification',
    businessGoal: 'Greet a new customer message and qualify what they need before routing to sales.',
    description: 'Welcomes the customer, asks what they are looking for, then routes bulk-order interest to Delhi Sales and everything else to a follow-up message.',
    capabilitiesNeeded: ['WhatsApp number'],
    trigger: { type: 'customer_message', summary: 'Customer sends the first message' },
    startNodeId: 'lc_msg_welcome',
    nodes: [
      {
        id: 'lc_msg_welcome',
        type: 'send_message',
        label: 'Welcome message',
        next: 'lc_question_intent',
        config: { mode: 'text', text: 'Hi! Thanks for reaching out to Northline Retail. What are you looking for today?' },
      },
      {
        id: 'lc_question_intent',
        type: 'question',
        label: 'Ask intent',
        next: 'lc_branch_intent',
        config: {
          prompt: 'What are you looking for?',
          answerType: 'single_select',
          options: ['Product enquiry', 'Bulk order', 'Something else'],
          required: true,
          retryMessage: "Sorry, I didn't catch that — please choose one of the options.",
          saveTo: { target: 'tag', label: 'Add tag from answer' },
        },
      },
      {
        id: 'lc_branch_intent',
        type: 'simple_branch',
        label: 'Route by intent',
        config: {
          mode: 'answer_option',
          sourceQuestionNodeId: 'lc_question_intent',
          branches: [{ id: 'lc_branch_bulk', label: 'Bulk order', matchValue: 'Bulk order', next: 'lc_update_bulk' }],
          fallback: { label: 'Anything else', next: 'lc_update_engaged' },
        },
      },
      {
        id: 'lc_update_bulk',
        type: 'update_contact',
        label: 'Tag as bulk-buyer lead',
        next: 'lc_handover_sales',
        config: { updates: [{ id: 'u1', kind: 'tagAdd', value: 'bulk-buyer' }, { id: 'u2', kind: 'stage', value: 'qualified' }] },
      },
      {
        id: 'lc_handover_sales',
        type: 'human_handover',
        label: 'Hand off to Delhi Sales',
        next: null,
        config: { targetType: 'team', targetId: 'team_delhi_sales', targetLabel: 'Delhi Sales', reason: 'Bulk order lead ready for a sales conversation', preserveContext: true },
      },
      {
        id: 'lc_update_engaged',
        type: 'update_contact',
        label: 'Mark engaged',
        next: 'lc_msg_thanks',
        config: { updates: [{ id: 'u3', kind: 'stage', value: 'engaged' }] },
      },
      {
        id: 'lc_msg_thanks',
        type: 'send_message',
        label: 'Thanks message',
        next: 'lc_end',
        config: { mode: 'text', text: "Thanks! We've noted your interest — a team member will follow up shortly." },
      },
      { id: 'lc_end', type: 'end', label: 'End', config: { outcomeLabel: 'Lead captured' } },
    ],
  },
  {
    id: 'starter_catalogue_quotation',
    category: 'catalogue-quotation',
    title: 'Catalogue / Quotation Request',
    businessGoal: 'Share the catalogue and capture a structured quotation request.',
    description: 'Sends the product catalogue, asks what the customer needs a quote for, saves the requirement, and hands the request to sales.',
    capabilitiesNeeded: ['Product catalogue connected'],
    trigger: { type: 'keyword', summary: 'Keyword: catalogue', keyword: 'catalogue', keywordMatch: 'contains' },
    startNodeId: 'cq_msg_catalogue',
    nodes: [
      {
        id: 'cq_msg_catalogue',
        type: 'send_message',
        label: 'Share catalogue',
        next: 'cq_question_requirement',
        config: { mode: 'template', templateId: 'tpl_catalogue_share', templateName: 'Catalogue Share', productRef: { connected: true, productId: 'cat_full', productName: 'Full catalogue' } },
      },
      {
        id: 'cq_question_requirement',
        type: 'question',
        label: 'Ask requirement',
        next: 'cq_update_requirement',
        config: { prompt: 'What would you like a quotation for? Please share the product and quantity.', answerType: 'business_requirement', required: true, saveTo: { target: 'field', key: 'quotationRequirement', label: 'Quotation requirement' } },
      },
      {
        id: 'cq_update_requirement',
        type: 'update_contact',
        label: 'Tag quotation requested',
        next: 'cq_handover',
        config: { updates: [{ id: 'u1', kind: 'tagAdd', value: 'quotation-requested' }, { id: 'u2', kind: 'priority', value: 'high' }] },
      },
      {
        id: 'cq_handover',
        type: 'human_handover',
        label: 'Hand off for quotation',
        next: null,
        config: { targetType: 'team', targetId: 'team_delhi_sales', targetLabel: 'Delhi Sales', reason: 'Quotation requested', preserveContext: true },
      },
    ],
  },
  {
    id: 'starter_appointment_registration',
    category: 'appointment-registration',
    title: 'Appointment / Event Registration',
    businessGoal: 'Collect an appointment preference and confirm the booking.',
    description: 'Asks for a preferred date, confirms the appointment and sends a reminder wait before the visit.',
    capabilitiesNeeded: ['WhatsApp number'],
    trigger: { type: 'keyword', summary: 'Keyword: appointment', keyword: 'appointment', keywordMatch: 'contains' },
    startNodeId: 'ar_question_date',
    nodes: [
      {
        id: 'ar_question_date',
        type: 'question',
        label: 'Ask preferred date',
        next: 'ar_update_booked',
        config: { prompt: 'Great — what date works best for your visit?', answerType: 'date', required: true, saveTo: { target: 'field', key: 'appointmentDate', label: 'Appointment date' } },
      },
      {
        id: 'ar_update_booked',
        type: 'update_contact',
        label: 'Tag appointment booked',
        next: 'ar_msg_confirm',
        config: { updates: [{ id: 'u1', kind: 'tagAdd', value: 'appointment-booked' }] },
      },
      {
        id: 'ar_msg_confirm',
        type: 'send_message',
        label: 'Confirm appointment',
        next: 'ar_wait_reminder',
        config: { mode: 'text', text: "You're booked! We'll send a reminder before your visit." },
      },
      {
        id: 'ar_wait_reminder',
        type: 'delay_wait',
        label: 'Wait until day before visit',
        next: 'ar_msg_reminder',
        config: { mode: 'until_datetime', businessHoursOnly: true },
      },
      {
        id: 'ar_msg_reminder',
        type: 'send_message',
        label: 'Send reminder',
        next: 'ar_end',
        config: { mode: 'template', templateId: 'tpl_appointment_reminder', templateName: 'Appointment Reminder' },
      },
      { id: 'ar_end', type: 'end', label: 'End', config: { outcomeLabel: 'Appointment registered' } },
    ],
  },
  {
    id: 'starter_order_payment',
    category: 'order-payment',
    title: 'Order Confirmation & Payment Reminder',
    businessGoal: 'Confirm a new order and follow up if payment is still pending.',
    description: 'Sends order confirmation, waits, then checks in on pending payment with an approved-template fallback for the reminder.',
    capabilitiesNeeded: ['Orders module', 'Payment provider'],
    trigger: { type: 'field_change', summary: 'Order stage changes to "Confirmed"', fieldKey: 'orderStage', fieldLabel: 'Order stage', fieldValue: 'confirmed' },
    startNodeId: 'op_msg_confirm',
    nodes: [
      {
        id: 'op_msg_confirm',
        type: 'send_message',
        label: 'Order confirmation',
        next: 'op_wait_payment',
        config: { mode: 'template', templateId: 'tpl_order_confirmation', templateName: 'Order Confirmation' },
      },
      {
        id: 'op_wait_payment',
        type: 'delay_wait',
        label: 'Wait 2 days for payment',
        next: 'op_msg_reminder',
        config: { mode: 'duration', durationValue: 2, durationUnit: 'days', templateFallbackId: 'tpl_payment_reminder', templateFallbackName: 'Payment Reminder' },
      },
      {
        id: 'op_msg_reminder',
        type: 'send_message',
        label: 'Payment reminder',
        next: 'op_update_pending',
        config: { mode: 'template', templateId: 'tpl_payment_reminder', templateName: 'Payment Reminder', paymentRef: { available: true } },
      },
      {
        id: 'op_update_pending',
        type: 'update_contact',
        label: 'Tag payment pending',
        next: 'op_end',
        config: { updates: [{ id: 'u1', kind: 'tagAdd', value: 'payment-pending' }] },
      },
      { id: 'op_end', type: 'end', label: 'End', config: { outcomeLabel: 'Reminder sent' } },
    ],
  },
  {
    id: 'starter_dispatch_delivery',
    category: 'dispatch-delivery',
    title: 'Dispatch / Delivery Update',
    businessGoal: 'Keep the customer updated once their order is dispatched.',
    description: 'Sends a dispatch notification with tracking, then a delivered confirmation after the expected transit wait.',
    capabilitiesNeeded: ['Orders module'],
    trigger: { type: 'field_change', summary: 'Order stage changes to "Dispatched"', fieldKey: 'orderStage', fieldLabel: 'Order stage', fieldValue: 'dispatched' },
    startNodeId: 'dd_msg_dispatch',
    nodes: [
      {
        id: 'dd_msg_dispatch',
        type: 'send_message',
        label: 'Dispatch notification',
        next: 'dd_wait_transit',
        config: { mode: 'template', templateId: 'tpl_dispatch_update', templateName: 'Dispatch Update' },
      },
      {
        id: 'dd_wait_transit',
        type: 'delay_wait',
        label: 'Wait 3 days for delivery',
        next: 'dd_msg_delivered',
        config: { mode: 'duration', durationValue: 3, durationUnit: 'days', templateFallbackId: 'tpl_delivery_confirmation', templateFallbackName: 'Delivery Confirmation' },
      },
      {
        id: 'dd_msg_delivered',
        type: 'send_message',
        label: 'Delivery confirmation',
        next: 'dd_end',
        config: { mode: 'template', templateId: 'tpl_delivery_confirmation', templateName: 'Delivery Confirmation' },
      },
      { id: 'dd_end', type: 'end', label: 'End', config: { outcomeLabel: 'Delivery confirmed' } },
    ],
  },
  {
    id: 'starter_feedback_escalation',
    category: 'feedback-escalation',
    title: 'Feedback & Support Escalation',
    businessGoal: 'Collect a satisfaction rating and escalate low ratings to support.',
    description: 'Asks for a 1-5 rating; low ratings hand off to Support, high ratings get a thank-you message.',
    capabilitiesNeeded: ['WhatsApp number'],
    trigger: { type: 'field_change', summary: 'Order stage changes to "Delivered"', fieldKey: 'orderStage', fieldLabel: 'Order stage', fieldValue: 'delivered' },
    startNodeId: 'fe_question_rating',
    nodes: [
      {
        id: 'fe_question_rating',
        type: 'question',
        label: 'Ask satisfaction rating',
        next: 'fe_branch_rating',
        config: { prompt: 'How was your experience with us? Reply with a rating from 1 (poor) to 5 (excellent).', answerType: 'single_select', options: ['1', '2', '3', '4', '5'], required: true, saveTo: { target: 'field', key: 'satisfactionRating', label: 'Satisfaction rating' } },
      },
      {
        id: 'fe_branch_rating',
        type: 'simple_branch',
        label: 'Route by rating',
        config: {
          mode: 'answer_option',
          sourceQuestionNodeId: 'fe_question_rating',
          branches: [
            { id: 'fe_branch_low1', label: '1', matchValue: '1', next: 'fe_update_negative' },
            { id: 'fe_branch_low2', label: '2', matchValue: '2', next: 'fe_update_negative' },
          ],
          fallback: { label: '3, 4 or 5', next: 'fe_msg_thanks' },
        },
      },
      {
        id: 'fe_update_negative',
        type: 'update_contact',
        label: 'Tag negative feedback',
        next: 'fe_handover_support',
        config: { updates: [{ id: 'u1', kind: 'tagAdd', value: 'feedback-negative' }, { id: 'u2', kind: 'priority', value: 'high' }] },
      },
      {
        id: 'fe_handover_support',
        type: 'human_handover',
        label: 'Escalate to Support',
        next: null,
        config: { targetType: 'team', targetId: 'team_delhi_support', targetLabel: 'Delhi Support', reason: 'Low satisfaction rating needs follow-up', preserveContext: true },
      },
      {
        id: 'fe_msg_thanks',
        type: 'send_message',
        label: 'Thank the customer',
        next: 'fe_end',
        config: { mode: 'text', text: 'Thank you for the feedback — glad to hear it! 🙌' },
      },
      { id: 'fe_end', type: 'end', label: 'End', config: { outcomeLabel: 'Feedback recorded' } },
    ],
  },
  {
    id: 'starter_minimal',
    category: 'minimal',
    title: 'Minimal Flow',
    businessGoal: 'A blank skeleton for building freely.',
    description: 'Start → Message → End. The starting point for anyone who wants an empty-ish canvas without facing a truly blank one.',
    capabilitiesNeeded: [],
    trigger: { type: 'customer_message', summary: 'Customer sends the first message' },
    startNodeId: 'min_msg',
    nodes: [
      { id: 'min_msg', type: 'send_message', label: 'Send a message', next: 'min_end', config: { mode: 'text', text: '' } },
      { id: 'min_end', type: 'end', label: 'End', config: { outcomeLabel: 'Flow complete' } },
    ],
  },
];

export function findStarterTemplate(id: string): StarterFlowTemplate | undefined {
  return starterTemplates.find((template) => template.id === id);
}
