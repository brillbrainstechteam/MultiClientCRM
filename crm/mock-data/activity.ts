import type { ActivityItem } from './types';

/** Customer 360 timeline fixtures (CON-S03). Keyed by contact. */
export const activityItems: ActivityItem[] = [
  {
    id: 'act_rahul_1',
    contactId: 'contact_rahul_shah',
    kind: 'whatsapp',
    summary: 'Replied on WhatsApp',
    detail: 'Confirmed interest in the festive wholesale catalogue.',
    actorId: 'contact_rahul_shah',
    at: '2026-08-07T16:42:00+05:30',
  },
  {
    id: 'act_rahul_2',
    contactId: 'contact_rahul_shah',
    kind: 'stage-change',
    summary: 'Stage moved to Qualified',
    actorId: 'user_meera',
    at: '2026-08-06T10:15:00+05:30',
  },
  {
    id: 'act_rahul_3',
    contactId: 'contact_rahul_shah',
    kind: 'call',
    summary: 'Outbound call · 4m 12s',
    detail: 'Discussed bulk pricing for 200+ units.',
    actorId: 'user_meera',
    at: '2026-08-05T14:00:00+05:30',
  },
  {
    id: 'act_rahul_4',
    contactId: 'contact_rahul_shah',
    kind: 'note',
    summary: 'Note added',
    detail: 'Prefers delivery before Diwali. Payment via UPI.',
    actorId: 'user_meera',
    at: '2026-08-05T13:50:00+05:30',
  },
  {
    id: 'act_rahul_5',
    contactId: 'contact_rahul_shah',
    kind: 'import',
    summary: 'Created from Walk-in register import',
    actorId: 'user_meera',
    at: '2026-01-14T09:20:00+05:30',
  },
];

export function activityForContact(contactId: string): ActivityItem[] {
  return activityItems
    .filter((item) => item.contactId === contactId)
    .sort((a, b) => (a.at < b.at ? 1 : -1));
}
