import type { CallingNumber } from '../domain';

/**
 * Calling-owned telephony fixtures (distinct from `whatsappNumbers` — a
 * calling number is a dialer line, not a WhatsApp sender). Deliberately
 * mixed: one fully connected provider line, one connected-but-no-cost line,
 * and two branches with no provider so the manual-first path is exercised by
 * default (SKILL.md "Manual calling first").
 */
export const callingNumbers: CallingNumber[] = [
  {
    id: 'cn_delhi_sales',
    label: 'Delhi Sales Dialer',
    branchId: 'branch_delhi',
    channel: 'phone',
    providerName: 'Exotel',
    providerConnected: true,
    capabilities: {
      clickToCall: true,
      callStatusEvents: true,
      durationEvents: true,
      costData: false,
      inboundCalls: false,
      recording: false,
      transcript: false,
      voiceAI: false,
    },
    costLabel: null,
  },
  {
    id: 'cn_mumbai_sales',
    label: 'Mumbai Sales Dialer',
    branchId: 'branch_mumbai',
    channel: 'phone',
    providerName: 'Ozonetel',
    providerConnected: true,
    capabilities: {
      clickToCall: true,
      callStatusEvents: true,
      durationEvents: true,
      costData: true,
      inboundCalls: false,
      recording: false,
      transcript: false,
      voiceAI: false,
    },
    costLabel: '₹1,284.50 this month',
  },
  {
    id: 'cn_delhi_support',
    label: 'Delhi Support Line',
    branchId: 'branch_delhi',
    channel: 'whatsapp',
    providerName: null,
    providerConnected: false,
    capabilities: {
      clickToCall: false,
      callStatusEvents: false,
      durationEvents: false,
      costData: false,
      inboundCalls: false,
      recording: false,
      transcript: false,
      voiceAI: false,
    },
    costLabel: null,
  },
  {
    id: 'cn_bengaluru_service',
    label: 'Bengaluru Service Line',
    branchId: 'branch_bengaluru',
    channel: 'whatsapp',
    providerName: null,
    providerConnected: false,
    capabilities: {
      clickToCall: false,
      callStatusEvents: false,
      durationEvents: false,
      costData: false,
      inboundCalls: false,
      recording: false,
      transcript: false,
      voiceAI: false,
    },
    costLabel: null,
  },
];

export function findCallingNumber(numberId: string): CallingNumber | undefined {
  return callingNumbers.find((number) => number.id === numberId);
}
