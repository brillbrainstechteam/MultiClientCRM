import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

/**
 * Hydration endpoint for the embedded CRM.
 *
 * The workspace (team, WhatsApp numbers, branches) is DERIVED FROM REAL DATA —
 * not seeded fixtures:
 *   - users        ← the tenant's auth Users (your real team)
 *   - whatsappNumbers ← the tenant's connected WhatsAppAccounts (real numbers)
 *   - branches/teams  ← a single default until a Branches/Team module exists
 *   - contacts     ← CrmContact rows (real, editable)
 *
 * So connecting a number via Embedded Signup makes it appear here immediately,
 * and nothing fictional is ever stored.
 */
export const DEFAULT_BRANCH_ID = 'branch_main';
export const DEFAULT_TEAM_ID = 'team_main';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const ROLE_LABEL: Record<string, string> = { owner: 'Owner', manager: 'Manager', agent: 'Agent' };

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const tenantId = sessionUser.tenantId;
  const businessName = sessionUser.tenant.businessName || 'Your business';

  const [authUsers, waAccounts, contacts] = await Promise.all([
    prisma.user.findMany({ where: { tenantId }, orderBy: { createdAt: 'asc' } }),
    prisma.whatsAppAccount.findMany({ where: { tenantId }, orderBy: { connectedAt: 'desc' } }),
    prisma.crmContact.findMany({ where: { tenantId }, orderBy: { lastActivityAt: 'desc' } }),
  ]);

  const branches = [{ id: DEFAULT_BRANCH_ID, name: businessName, city: '—' }];
  const teams = [{ id: DEFAULT_TEAM_ID, name: 'Team', branchId: DEFAULT_BRANCH_ID }];

  const whatsappNumbers = waAccounts.map((a) => ({
    id: a.id,
    displayNumber: a.displayPhone ?? 'WhatsApp number',
    displayName: a.verifiedName ?? businessName,
    brand: businessName,
    branchId: DEFAULT_BRANCH_ID,
    department: 'Sales',
    connectionStatus: a.status === 'connected' ? 'connected' : 'disconnected',
    qualityRating: 'unrated',
    messagingLimit: '—',
    permittedRoles: ['owner', 'manager', 'agent'],
  }));
  const numberIds = whatsappNumbers.map((n) => n.id);

  const users = authUsers.map((u) => {
    const name = u.name?.trim() || u.email.split('@')[0];
    const role = ['owner', 'manager', 'agent'].includes(u.role) ? u.role : 'owner';
    return {
      id: u.id,
      name,
      initials: initials(name),
      email: u.email,
      role,
      roleLabel: ROLE_LABEL[role] ?? 'Owner',
      teamId: DEFAULT_TEAM_ID,
      branchId: DEFAULT_BRANCH_ID,
      permittedWhatsAppNumberIds: numberIds,
      availability: 'available',
    };
  });

  return NextResponse.json({
    name: businessName,
    branches,
    teams,
    whatsappNumbers,
    branchIds: branches.map((b) => b.id),
    whatsappNumberIds: numberIds,
    users,
    contacts: contacts.map((c) => ({
      id: c.id, name: c.name, company: c.company, mobile: c.mobile, email: c.email, city: c.city,
      ownerId: c.ownerId, stage: c.stage, tags: c.tags, source: c.source, consent: c.consent,
      salesTier: c.salesTier, branchId: c.branchId, primaryWhatsAppNumberId: c.primaryWhatsAppNumberId,
      createdAt: c.createdAt.toISOString(), lastActivityAt: c.lastActivityAt.toISOString(),
    })),
  });
}
