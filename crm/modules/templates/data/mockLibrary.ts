import type { TemplateLibraryItem } from '../domain/types';

/** Ready-made starting points (TPL-S10/S11). Not automatically approved tenant templates. */
export const libraryItems: TemplateLibraryItem[] = [
  {
    id: 'lib_payment_reminder',
    title: 'Payment reminder',
    previewSnippet: 'Hi {{1}}, a friendly reminder that ₹{{2}} is due for order #{{3}}.',
    useCase: 'payment-reminder',
    category: 'utility',
    languages: ['English (US)', 'Hindi'],
    format: 'standard',
    source: 'crm-ready-made',
    libraryCategory: 'orders-payments',
    components: {
      headerFormat: 'none',
      body: 'Hi {{1}}, a friendly reminder that ₹{{2}} is due for order #{{3}}.',
      buttons: [{ id: 'lib_btn_1', type: 'quick-reply', label: 'Pay now' }],
      variables: [
        { id: 'lib_var_1', index: 1, description: 'Customer first name', sampleValue: 'Rahul' },
        { id: 'lib_var_2', index: 2, description: 'Amount due', sampleValue: '1,499' },
        { id: 'lib_var_3', index: 3, description: 'Order number', sampleValue: '48213' },
      ],
    },
  },
  {
    id: 'lib_order_confirmation',
    title: 'Order confirmation',
    previewSnippet: 'Hi {{1}}, your order #{{2}} is confirmed and on its way.',
    useCase: 'order-confirmation',
    category: 'utility',
    languages: ['English (US)'],
    format: 'standard',
    source: 'crm-ready-made',
    libraryCategory: 'orders-payments',
    components: {
      headerFormat: 'none',
      body: 'Hi {{1}}, your order #{{2}} is confirmed and on its way.',
      buttons: [],
      variables: [
        { id: 'lib_var_1', index: 1, description: 'Customer first name', sampleValue: 'Priya' },
        { id: 'lib_var_2', index: 2, description: 'Order number', sampleValue: '48213' },
      ],
    },
  },
  {
    id: 'lib_flash_sale',
    title: 'Flash sale announcement',
    previewSnippet: 'Hi {{1}}, flash sale is live — {{2}} off for the next 24 hours only.',
    useCase: 'promotion',
    category: 'marketing',
    languages: ['English (US)', 'Hindi', 'Marathi'],
    format: 'standard',
    source: 'meta-provided',
    libraryCategory: 'marketing',
    components: {
      headerFormat: 'image',
      headerMediaLabel: 'flash-sale-generic.jpg',
      body: 'Hi {{1}}, flash sale is live — {{2}} off for the next 24 hours only.',
      buttons: [{ id: 'lib_btn_1', type: 'website', label: 'Shop Now' }],
      variables: [
        { id: 'lib_var_1', index: 1, description: 'Customer first name', sampleValue: 'Kavya' },
        { id: 'lib_var_2', index: 2, description: 'Discount', sampleValue: '25%' },
      ],
    },
  },
  {
    id: 'lib_appointment_confirmation',
    title: 'Appointment confirmation',
    previewSnippet: 'Hi {{1}}, this confirms your appointment on {{2}} at {{3}}.',
    useCase: 'appointment-reminder',
    category: 'utility',
    languages: ['English (US)'],
    format: 'standard',
    source: 'crm-ready-made',
    libraryCategory: 'service',
    components: {
      headerFormat: 'none',
      body: 'Hi {{1}}, this confirms your appointment on {{2}} at {{3}}.',
      buttons: [{ id: 'lib_btn_1', type: 'quick-reply', label: 'Reschedule' }],
      variables: [
        { id: 'lib_var_1', index: 1, description: 'Customer first name', sampleValue: 'Sana' },
        { id: 'lib_var_2', index: 2, description: 'Date', sampleValue: '14 Aug' },
        { id: 'lib_var_3', index: 3, description: 'Time', sampleValue: '4:30 PM' },
      ],
    },
  },
  {
    id: 'lib_support_followup',
    title: 'Support ticket follow-up',
    previewSnippet: 'Hi {{1}}, we wanted to check in on ticket #{{2}}. Is everything resolved?',
    useCase: 'support-update',
    category: 'utility',
    languages: ['English (US)'],
    format: 'standard',
    source: 'crm-ready-made',
    libraryCategory: 'support',
    components: {
      headerFormat: 'none',
      body: 'Hi {{1}}, we wanted to check in on ticket #{{2}}. Is everything resolved?',
      buttons: [
        { id: 'lib_btn_1', type: 'quick-reply', label: 'Yes, resolved' },
        { id: 'lib_btn_2', type: 'quick-reply', label: 'Still need help' },
      ],
      variables: [
        { id: 'lib_var_1', index: 1, description: 'Customer first name', sampleValue: 'Arjun' },
        { id: 'lib_var_2', index: 2, description: 'Ticket number', sampleValue: '5521' },
      ],
    },
  },
  {
    id: 'lib_lead_followup',
    title: 'Sales lead follow-up',
    previewSnippet: 'Hi {{1}}, following up on your interest in {{2}}. Want a quick call?',
    useCase: 'follow-up',
    category: 'marketing',
    languages: ['English (US)', 'Hindi'],
    format: 'standard',
    source: 'crm-ready-made',
    libraryCategory: 'sales',
    components: {
      headerFormat: 'none',
      body: 'Hi {{1}}, following up on your interest in {{2}}. Want a quick call?',
      buttons: [{ id: 'lib_btn_1', type: 'quick-reply', label: 'Yes, call me' }],
      variables: [
        { id: 'lib_var_1', index: 1, description: 'Customer first name', sampleValue: 'Ishaan' },
        { id: 'lib_var_2', index: 2, description: 'Product / service', sampleValue: 'premium plan' },
      ],
    },
  },
];

export function findLibraryItem(libraryId: string): TemplateLibraryItem | undefined {
  return libraryItems.find((item) => item.id === libraryId);
}
