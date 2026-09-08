import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

/**
 * Hydration endpoint for the embedded CRM. Returns the tenant's operational
 * records in the exact shape the prototype's data layer expects, so the ported
 * screens run on real DB rows instead of in-code fixtures. Tenant-scoped.
 *
 * Wave 1 covers the Contacts data set (contacts + workspace: branches, numbers,
 * teams, users). Later waves extend this payload per module.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const tenantId = user.tenantId;

  const [branches, numbers, teams, users, contacts] = await Promise.all([
    prisma.crmBranch.findMany({ where: { tenantId }, orderBy: { name: 'asc' } }),
    prisma.crmNumber.findMany({ where: { tenantId } }),
    prisma.crmTeam.findMany({ where: { tenantId } }),
    prisma.crmUser.findMany({ where: { tenantId }, orderBy: { name: 'asc' } }),
    prisma.crmContact.findMany({ where: { tenantId }, orderBy: { lastActivityAt: 'desc' } }),
  ]);

  return NextResponse.json({
    branches: branches.map((b) => ({ id: b.id, name: b.name, city: b.city })),
    whatsappNumbers: numbers.map((n) => ({
      id: n.id, displayNumber: n.displayNumber, displayName: n.displayName, brand: n.brand,
      branchId: n.branchId, department: n.department, connectionStatus: n.connectionStatus,
      qualityRating: n.qualityRating, messagingLimit: n.messagingLimit, permittedRoles: n.permittedRoles,
    })),
    teams: teams.map((t) => ({ id: t.id, name: t.name, branchId: t.branchId })),
    users: users.map((u) => ({
      id: u.id, name: u.name, initials: u.initials, email: u.email, role: u.role, roleLabel: u.roleLabel,
      teamId: u.teamId, branchId: u.branchId, permittedWhatsAppNumberIds: u.permittedWhatsAppNumberIds,
      availability: u.availability,
    })),
    contacts: contacts.map((c) => ({
      id: c.id, name: c.name, company: c.company, mobile: c.mobile, email: c.email, city: c.city,
      ownerId: c.ownerId, stage: c.stage, tags: c.tags, source: c.source, consent: c.consent,
      salesTier: c.salesTier, branchId: c.branchId, primaryWhatsAppNumberId: c.primaryWhatsAppNumberId,
      createdAt: c.createdAt.toISOString(), lastActivityAt: c.lastActivityAt.toISOString(),
    })),
  });
}
