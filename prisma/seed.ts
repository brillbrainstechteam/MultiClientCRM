/**
 * Seed the CRM operational tables from the prototype fixtures, as real per-tenant
 * rows. This is how the ported screens get "real data": the fixture content is
 * inserted into Postgres once, then served via /api/crm and hydrated into the
 * app — after which it is live, editable, persistent data, not in-code mock.
 *
 * Also ensures an auth tenant + login user exist so the local app is usable.
 * Run: DATABASE_URL=<local> npx prisma db seed
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { branches, whatsappNumbers, teams, users } from '../crm/mock-data/workspace';
import { contacts } from '../crm/mock-data/contacts';

const prisma = new PrismaClient();

// Stable tenant so re-seeds are idempotent and the CRM rows have one owner.
const TENANT_ID = 'tenant_brillbrains_demo';
const LOGIN_EMAIL = 'tech@brillbrainsconsultants.com';
const LOGIN_PASSWORD = 'TalkTrack@2026';

async function main() {
  // --- auth tenant + user (so local login works) ---
  await prisma.tenant.upsert({
    where: { id: TENANT_ID },
    update: {},
    create: {
      id: TENANT_ID,
      businessName: 'BrillBrains Consultants Pvt. Ltd.',
      entityType: 'services',
    },
  });
  const passwordHash = await bcrypt.hash(LOGIN_PASSWORD, 10);
  await prisma.user.upsert({
    where: { email: LOGIN_EMAIL },
    update: { passwordHash, tenantId: TENANT_ID },
    create: { email: LOGIN_EMAIL, name: 'BrillBrains Tech', passwordHash, role: 'owner', tenantId: TENANT_ID },
  });

  // --- CRM operational rows, scoped to the tenant ---
  for (const b of branches) {
    await prisma.crmBranch.upsert({
      where: { id: b.id }, update: { name: b.name, city: b.city, tenantId: TENANT_ID },
      create: { id: b.id, tenantId: TENANT_ID, name: b.name, city: b.city },
    });
  }
  for (const n of whatsappNumbers) {
    const data = {
      tenantId: TENANT_ID, displayNumber: n.displayNumber, displayName: n.displayName, brand: n.brand,
      branchId: n.branchId, department: n.department, connectionStatus: n.connectionStatus,
      qualityRating: n.qualityRating, messagingLimit: n.messagingLimit, permittedRoles: n.permittedRoles,
    };
    await prisma.crmNumber.upsert({ where: { id: n.id }, update: data, create: { id: n.id, ...data } });
  }
  for (const t of teams) {
    await prisma.crmTeam.upsert({
      where: { id: t.id }, update: { name: t.name, branchId: t.branchId, tenantId: TENANT_ID },
      create: { id: t.id, tenantId: TENANT_ID, name: t.name, branchId: t.branchId },
    });
  }
  for (const u of users) {
    const data = {
      tenantId: TENANT_ID, name: u.name, initials: u.initials, email: u.email, role: u.role,
      roleLabel: u.roleLabel, teamId: u.teamId, branchId: u.branchId,
      permittedWhatsAppNumberIds: u.permittedWhatsAppNumberIds, availability: u.availability,
    };
    await prisma.crmUser.upsert({ where: { id: u.id }, update: data, create: { id: u.id, ...data } });
  }
  for (const c of contacts) {
    const data = {
      tenantId: TENANT_ID, name: c.name, company: c.company, mobile: c.mobile, email: c.email, city: c.city,
      ownerId: c.ownerId, stage: c.stage, tags: c.tags, source: c.source, consent: c.consent,
      salesTier: c.salesTier, branchId: c.branchId, primaryWhatsAppNumberId: c.primaryWhatsAppNumberId,
      createdAt: new Date(c.createdAt), lastActivityAt: new Date(c.lastActivityAt),
    };
    await prisma.crmContact.upsert({ where: { id: c.id }, update: data, create: { id: c.id, ...data } });
  }

  const counts = {
    branches: await prisma.crmBranch.count(),
    numbers: await prisma.crmNumber.count(),
    teams: await prisma.crmTeam.count(),
    users: await prisma.crmUser.count(),
    contacts: await prisma.crmContact.count(),
  };
  console.log('Seeded:', counts);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
