import { allConversations } from '@crm/modules/inbox/inbox-mock-data';
import { findContact } from '@crm/mock-data';

/**
 * CALL-S12 — WhatsApp handoff. Calling never owns a message composer; it only
 * hands the contact/context to Inbox, which owns manual message, quick reply
 * and template sending (SKILL.md "Module boundaries").
 */
export function inboxHandoffPath(contactId: string, context?: { callTaskId?: string }): string {
  const conversation = allConversations.find((conv) => conv.contactId === contactId);
  if (conversation) {
    const params = new URLSearchParams({ conversation: conversation.id });
    if (context?.callTaskId) params.set('callTaskId', context.callTaskId);
    return `/inbox?${params.toString()}`;
  }
  const contact = findContact(contactId);
  const params = new URLSearchParams({ searchMode: 'contacts', q: contact?.mobile ?? contactId });
  return `/inbox?${params.toString()}`;
}
