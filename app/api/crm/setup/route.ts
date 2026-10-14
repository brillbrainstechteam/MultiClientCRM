import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { CONSENT_OPTED_IN } from '@/lib/crm/consent';

/**
 * The real onboarding state of a workspace.
 *
 * This replaces a hardcoded checklist whose statuses were written into the
 * source, so the dashboard claimed a number was connected and a team invited
 * before either had happened. Every step here is a database question.
 *
 * The order is the order the business actually does it: identify the business,
 * pay, connect WhatsApp — and then build the team, which is the step that
 * unlocks everyone else's access. The team steps are deliberately `blocked`
 * (with the reason shown) until the subscription and the number are in place,
 * because inviting people to a workspace that cannot send a message is wasted
 * effort and burns a seat.
 */

export type StepStatus = 'complete' | 'incomplete' | 'blocked';

export interface SetupStepDTO {
  id: string;
  label: string;
  status: StepStatus;
  /** Why it cannot be started yet. */
  blockedReason?: string;
  /** What this step is for, in the operator's terms. */
  detail?: string;
  to?: string;
  /** Marks the step the operator should do next. */
  isNext?: boolean;
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const tenantId = user.tenantId;

  const [
    tenant, subscription, connectedNumbers, members, contactCount,
    delegatedContacts, templateDrafts, templateCampaigns, outboundMessages, optedIn,
  ] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { businessName: true, businessPhone: true, plan: true },
    }),
    prisma.subscription.findUnique({ where: { tenantId }, select: { status: true, planCode: true } }),
    prisma.whatsAppAccount.count({ where: { tenantId, status: 'connected' } }),
    prisma.user.findMany({
      where: { tenantId, status: 'active' },
      select: { id: true, role: true },
    }),
    prisma.crmContact.count({ where: { tenantId } }),
    // "Assigned to the team" means assigned to somebody who is not the account
    // owner — contacts sitting with the owner have not been delegated yet.
    prisma.crmContact.findMany({
      where: { tenantId },
      select: { ownerId: true, marketingOwnerId: true },
    }),
    prisma.crmTemplateDraft.count({ where: { tenantId } }),
    prisma.crmCampaign.count({ where: { tenantId, templateName: { not: null } } }),
    prisma.message.count({ where: { conversation: { tenantId }, direction: 'outbound' } }),
    prisma.crmContact.count({ where: { tenantId, consent: CONSENT_OPTED_IN } }),
  ]);

  const ownerIds = new Set(members.filter((m) => m.role === 'owner').map((m) => m.id));
  const staff = members.filter((m) => !ownerIds.has(m.id));
  const hasTeam = staff.length > 0;
  const staffIds = new Set(staff.map((m) => m.id));
  const delegated = delegatedContacts.filter(
    (c) => staffIds.has(c.ownerId) || (c.marketingOwnerId && staffIds.has(c.marketingOwnerId)),
  ).length;

  const profileDone = !!tenant?.businessName?.trim() && !!tenant?.businessPhone?.trim();
  // 'trial' counts: a trial is a live subscription, just not a paid one.
  const subscriptionDone = ['trial', 'active'].includes(subscription?.status ?? '');
  const numberDone = connectedNumbers > 0;
  const canBuildTeam = subscriptionDone && numberDone;

  const steps: SetupStepDTO[] = [
    {
      id: 'business-profile',
      label: 'Complete your business profile',
      status: profileDone ? 'complete' : 'incomplete',
      detail: 'Your business name and phone number appear on every WhatsApp message you send.',
      to: '/settings',
    },
    {
      id: 'subscription',
      label: 'Choose your plan',
      status: subscriptionDone ? 'complete' : 'incomplete',
      detail: 'The plan sets how many team seats are included and how messages are billed.',
      to: '/billing',
    },
    {
      id: 'connect-number',
      label: 'Connect your WhatsApp number',
      status: numberDone ? 'complete' : 'incomplete',
      detail: 'Until a number is connected, the Inbox, Campaigns and Templates stay locked.',
      to: '/settings/whatsapp',
    },
    {
      id: 'add-team',
      label: 'Add your sales and marketing team',
      status: hasTeam ? 'complete' : canBuildTeam ? 'incomplete' : 'blocked',
      blockedReason: canBuildTeam
        ? undefined
        : !subscriptionDone
          ? 'Choose a plan first — it sets how many seats you have.'
          : 'Connect your WhatsApp number first, so the people you add have an inbox to work in.',
      detail: 'Create an account for each person with an email and password. They sign in and see only the contacts you give them.',
      to: '/team-access/people?drawer=invite&step=identity',
    },
    {
      id: 'add-contacts',
      label: 'Bring in your contacts',
      status: contactCount > 0 ? 'complete' : 'incomplete',
      detail: 'Import your existing customer list, or add contacts one at a time.',
      to: '/contacts/imports',
    },
    {
      id: 'assign-contacts',
      label: 'Assign contacts to your team',
      status: delegated > 0 ? 'complete' : (hasTeam && contactCount > 0) ? 'incomplete' : 'blocked',
      blockedReason: delegated > 0
        ? undefined
        : !hasTeam
          ? 'Add your team first.'
          : contactCount === 0 ? 'Bring in your contacts first.' : undefined,
      detail: 'A team member only sees the contacts they own. Each contact can have a sales owner and a marketing owner.',
      to: '/contacts/all',
    },
    {
      id: 'create-template',
      label: 'Get a message template approved',
      status: (templateDrafts + templateCampaigns) > 0 ? 'complete' : numberDone ? 'incomplete' : 'blocked',
      blockedReason: numberDone ? undefined : 'Connect your WhatsApp number first.',
      detail: 'Meta must approve a template before you can message anyone who is not already in a conversation with you.',
      to: '/templates',
    },
    {
      id: 'collect-consent',
      label: 'Collect consent from your contacts',
      status: optedIn > 0 ? 'complete' : (numberDone && contactCount > 0) ? 'incomplete' : 'blocked',
      blockedReason: optedIn > 0
        ? undefined
        : !numberDone ? 'Connect your WhatsApp number first.' : contactCount === 0 ? 'Bring in your contacts first.' : undefined,
      detail: 'Marketing campaigns only reach contacts who have opted in. Collecting consent early is what keeps your number healthy.',
      to: '/contacts/consent',
    },
    {
      id: 'send-test-message',
      label: 'Send your first message',
      status: outboundMessages > 0 ? 'complete' : numberDone ? 'incomplete' : 'blocked',
      blockedReason: numberDone ? undefined : 'Connect your WhatsApp number first.',
      to: '/inbox',
    },
  ];

  // Mark the first actionable step, so the dashboard can point at one thing.
  const next = steps.find((s) => s.status === 'incomplete');
  if (next) next.isNext = true;

  const done = steps.filter((s) => s.status === 'complete').length;
  return NextResponse.json({
    steps,
    percent: Math.round((done / steps.length) * 100),
    complete: done === steps.length,
    // The team panel is the thing the owner is sent to once the basics are done.
    team: {
      unlocked: canBuildTeam,
      memberCount: staff.length,
      seatsUsed: members.length,
      plan: subscription?.planCode ?? tenant?.plan ?? 'trial',
      contactsTotal: contactCount,
      contactsDelegated: delegated,
    },
  });
}
