import type { CallContext } from '../domain';

/**
 * Per-contact calling preparation context (CALLING_GENERATION_SPEC.md §6 "Why
 * you are calling"). Owned entirely by Calling — never written onto Contact.
 * `aiSuggestion` is optional enhancement only; the workspace must render
 * fully without it (SKILL.md "AI behavior").
 */
export const callContexts: CallContext[] = [
  {
    contactId: 'contact_rahul_shah',
    lastWhatsAppSummary: 'Asked for festive bulk pricing on 7 Aug; sent catalogue, no reply since.',
    lastCallSummary: 'No answer on 9 Aug, 4:00 PM — retried per queue priority.',
    currentRequirement: 'Bulk order, 500+ units, festive collection',
    openObjection: 'Wants confirmation on delivery timeline before advance payment.',
    talkingPoints: [
      'Confirm delivery window for festive-season stock (customer flagged this as blocking).',
      'Reference the gold-tier bulk discount already quoted on WhatsApp.',
      'Ask if the advance payment method (UPI vs. bank transfer) is decided.',
    ],
    aiSuggestion: 'Lead with the delivery-window confirmation — it is the stated blocker to closing.',
  },
  {
    contactId: 'contact_neha_gupta',
    lastWhatsAppSummary: 'Shared festive lookbook on 8 Aug; customer reacted with interest emoji.',
    lastCallSummary: 'Connected 8 Aug — asked for updated festive catalogue pricing before deciding.',
    currentRequirement: 'Updated festive catalogue pricing',
    openObjection: null,
    talkingPoints: [
      'This is the promised follow-up — open with the updated pricing sheet.',
      'Customer is engaged-stage; a clear yes/no on pricing likely closes or advances the deal.',
    ],
    aiSuggestion: 'Customer already has strong intent — keep the call short and pricing-first.',
  },
  {
    contactId: 'contact_farhan_ali',
    lastWhatsAppSummary: 'Inbound WhatsApp enquiry 9 Aug, unnamed contact, asked about product availability.',
    lastCallSummary: null,
    currentRequirement: 'General product availability enquiry',
    openObjection: null,
    talkingPoints: [
      'First-touch call — confirm identity and capture name/company for the record.',
      'Qualify what they are looking for before quoting anything.',
    ],
    aiSuggestion: null,
  },
  {
    contactId: 'contact_arjun_verma',
    lastWhatsAppSummary: 'Referral enquiry — interiors project, shared reference photos on 8 Aug.',
    lastCallSummary: 'No answer on 9 Aug, 10:30 AM.',
    currentRequirement: 'Project-based interiors order — scope not yet confirmed',
    openObjection: 'Consent is still pending — confirm opt-in before sharing further WhatsApp material.',
    talkingPoints: [
      'Confirm WhatsApp consent status before promising further catalogue sends.',
      'Ask for project scope and timeline to size the order.',
    ],
    aiSuggestion: null,
  },
  {
    contactId: 'contact_ananya_reddy',
    lastWhatsAppSummary: 'Long-standing platinum customer; last order delivered 2 Aug, no issues reported.',
    lastCallSummary: 'Line busy on 10 Aug, 12:00 PM.',
    currentRequirement: 'VIP renewal — annual jewellery care service',
    openObjection: null,
    talkingPoints: [
      'This is a retention call, not a sales pitch — thank her for the repeat business first.',
      'Offer the VIP renewal slot before the festive rush books out.',
    ],
    aiSuggestion: 'High-value repeat customer — prioritise a specific renewal date over a generic pitch.',
  },
  {
    contactId: 'contact_deepa_krishnan',
    lastWhatsAppSummary: 'Requested a revised export-grade bulk quote on 4 Aug after the last call.',
    lastCallSummary: 'Connected 4 Aug — interested, asked for a revised quote on cotton-blend bulk order.',
    currentRequirement: 'Export bulk quote — cotton blend',
    openObjection: null,
    talkingPoints: [
      'This follow-up is the promised revised quote call — have the numbers ready before dialling.',
      'She flagged a target decision date; confirm it is still on track.',
    ],
    aiSuggestion: 'Quote-ready follow-up — likely a short, high-conversion call.',
  },
  {
    contactId: 'contact_rohit_malhotra',
    lastWhatsAppSummary: 'Walk-in register entry 8 Aug; no WhatsApp thread started yet.',
    lastCallSummary: null,
    currentRequirement: 'Not yet qualified',
    openObjection: null,
    talkingPoints: [
      'No owner assigned yet — confirm basic details and route to the right team after the call.',
    ],
    aiSuggestion: null,
  },
  {
    contactId: 'contact_kavita_desai',
    lastWhatsAppSummary: 'Met at trade show 9 Aug; exchanged catalogue links, high engagement.',
    lastCallSummary: null,
    currentRequirement: 'Export order — quantity and destination not yet confirmed',
    openObjection: null,
    talkingPoints: [
      'Reference the trade-show conversation directly — she will remember the booth.',
      'She is a gold-tier export account — qualify quantity and shipping destination early.',
    ],
    aiSuggestion: null,
  },
  {
    contactId: 'contact_sameer_joshi',
    lastWhatsAppSummary: 'No WhatsApp activity since March — opted out of messaging.',
    lastCallSummary: 'Connected 3 Aug — no current requirement, will re-engage next season.',
    currentRequirement: 'None currently — reactivation attempt',
    openObjection: null,
    talkingPoints: ['Customer already declined this cycle — do not re-pitch unless they raise it.'],
    aiSuggestion: null,
  },
  {
    contactId: 'contact_imran_qureshi',
    lastWhatsAppSummary: 'No WhatsApp activity since March — opted out of messaging.',
    lastCallSummary: 'Number appeared disconnected on last attempt (5 Jul).',
    currentRequirement: 'Unknown — verify contact details',
    openObjection: null,
    talkingPoints: ['Verify the mobile number is current before attempting another call.'],
    aiSuggestion: null,
  },
  {
    contactId: 'contact_sneha_iyer',
    lastWhatsAppSummary: 'Clicked a campaign link 5 Aug; no reply to the automated greeting yet.',
    lastCallSummary: null,
    currentRequirement: 'Not yet qualified — inbound campaign lead',
    openObjection: null,
    talkingPoints: ['First-touch call from a campaign click — qualify interest before pitching.'],
    aiSuggestion: null,
  },
];

export function findCallContext(contactId: string): CallContext | undefined {
  return callContexts.find((context) => context.contactId === contactId);
}
