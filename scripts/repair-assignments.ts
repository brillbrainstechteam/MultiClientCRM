/**
 * One-off repair for contact assignment.
 *
 * Run:  npx tsx scripts/repair-assignments.ts          (report only)
 *       npx tsx scripts/repair-assignments.ts --apply   (write)
 *
 * Three things to fix, all of which make contacts silently stop being worked:
 *
 *  1. The sales/marketing owner slots used to live in the `jewelleryProfile`
 *     JSON bucket, which nothing scoped on. Any value in there is lifted into
 *     the real `ownerId` / `marketingOwnerId` columns.
 *  2. Contacts owned by a **disabled or deleted** user, or with an empty owner,
 *     are invisible to every agent and manager — only owner/admin see them,
 *     because those roles bypass scoping. They are handed to the tenant owner,
 *     who can then distribute them properly.
 *  3. Marketing slots pointing at a user who is no longer active are cleared,
 *     so the second slot does not grant visibility to nobody.
 *
 * Safe to re-run: every step is conditional on the broken state still existing.
 */
import { prisma } from '../lib/db';

const APPLY = process.argv.includes('--apply');

interface Fix { tenantId: string; contactId: string; name: string; what: string }

async function main() {
  const fixes: Fix[] = [];
  const tenants = await prisma.tenant.findMany({ select: { id: true, businessName: true } });

  for (const t of tenants) {
    const users = await prisma.user.findMany({
      where: { tenantId: t.id },
      select: { id: true, email: true, role: true, status: true },
    });
    const activeIds = new Set(users.filter((u) => u.status === 'active').map((u) => u.id));
    const tenantOwner = users.find((u) => u.role === 'owner' && u.status === 'active')
      ?? users.find((u) => u.status === 'active');

    const contacts = await prisma.crmContact.findMany({
      where: { tenantId: t.id },
      select: { id: true, name: true, ownerId: true, marketingOwnerId: true, jewelleryProfile: true },
    });
    if (contacts.length === 0) continue;

    console.log(`\n=== ${t.businessName} — ${contacts.length} contact(s), ${activeIds.size} active user(s)`);
    if (!tenantOwner) {
      console.log('  ! no active user to hand contacts to — skipping this tenant');
      continue;
    }

    for (const c of contacts) {
      const jp = (c.jewelleryProfile ?? {}) as Record<string, unknown>;
      const jsonSales = typeof jp.salesOwnerId === 'string' ? jp.salesOwnerId : null;
      const jsonMarketing = typeof jp.marketingOwnerId === 'string' ? jp.marketingOwnerId : null;
      const data: Record<string, unknown> = {};
      const notes: string[] = [];

      // 1. Lift the JSON values into the columns, but only onto a slot that is
      //    empty or broken — a column set deliberately always wins.
      if (jsonSales && activeIds.has(jsonSales) && (!c.ownerId || !activeIds.has(c.ownerId))) {
        data.ownerId = jsonSales;
        notes.push(`sales owner from JSON (${jsonSales})`);
      }
      if (jsonMarketing && activeIds.has(jsonMarketing) && !c.marketingOwnerId) {
        data.marketingOwnerId = jsonMarketing;
        notes.push(`marketing owner from JSON (${jsonMarketing})`);
      }

      // 2. Stranded: no owner, or an owner who cannot sign in any more.
      const effectiveOwner = (data.ownerId as string | undefined) ?? c.ownerId;
      if (!effectiveOwner || !activeIds.has(effectiveOwner)) {
        data.ownerId = tenantOwner.id;
        notes.push(`stranded (owner ${effectiveOwner || 'empty'} is not an active user) -> ${tenantOwner.email}`);
      }

      // 3. A marketing slot pointing at an inactive user grants nothing.
      const effectiveMarketing = (data.marketingOwnerId as string | undefined) ?? c.marketingOwnerId;
      if (effectiveMarketing && !activeIds.has(effectiveMarketing)) {
        data.marketingOwnerId = null;
        notes.push(`marketing owner ${effectiveMarketing} is not active -> cleared`);
      }

      // Always strip the stale JSON copies once the columns are authoritative.
      if (jsonSales !== null || jsonMarketing !== null) {
        const next = { ...jp };
        delete next.salesOwnerId;
        delete next.marketingOwnerId;
        data.jewelleryProfile = next;
        if (notes.length === 0) notes.push('removed stale owner keys from jewelleryProfile');
      }

      if (Object.keys(data).length === 0) continue;
      fixes.push({ tenantId: t.id, contactId: c.id, name: c.name, what: notes.join('; ') });
      console.log(`  ${APPLY ? 'FIX ' : 'WOULD FIX '}${c.name}: ${notes.join('; ')}`);
      if (APPLY) {
        await prisma.crmContact.update({ where: { id: c.id }, data });
        await prisma.crmAuditLog.create({
          data: {
            tenantId: t.id,
            actorId: null,
            action: 'contact.assignmentRepaired',
            targetType: 'contact',
            targetId: c.id,
            detail: notes.join('; '),
          },
        }).catch(() => { /* the audit row must never fail the repair */ });
      }
    }
  }

  console.log(`\n${APPLY ? 'Applied' : 'Would apply'} ${fixes.length} fix(es).`);
  if (!APPLY && fixes.length) console.log('Re-run with --apply to write them.');
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
