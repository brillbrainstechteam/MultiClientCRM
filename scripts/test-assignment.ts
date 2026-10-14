/**
 * Assignment + scope tests, against the real database in a throwaway tenant.
 *
 * Run: npx tsx scripts/test-assignment.ts
 *
 * Covers the three things that were wrong and are easy to break again:
 *   - a contact can carry a sales owner AND a marketing owner, and either one
 *     grants visibility;
 *   - reassigning the sales owner takes the open conversations along, but never
 *     steals a thread somebody was deliberately handed;
 *   - many enquiries per contact, with numbers that do not repeat after a delete.
 *
 * Everything is created under a tenant made for the run and deleted at the end,
 * so it never touches real data.
 */
import { prisma } from '../lib/db';
import { contactScopeClause, canSeeContact, visibleUserIds } from '../lib/crm/scope';
import { propagateContactOwner, adoptContactOwnerFromConversation, findStrandedContacts } from '../lib/crm/assignment';

let pass = 0;
const failures: string[] = [];

function check(label: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { pass++; return; }
  failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
}

const suffix = `asgn${Date.now()}`;
const tenantId = `t_${suffix}`;

async function main() {
  await prisma.tenant.create({ data: { id: tenantId, businessName: 'Assignment Test Co' } });

  const mk = (role: string, fn: string | null, key: string) => prisma.user.create({
    data: {
      tenantId, name: key, email: `${key}.${suffix}@assignment.invalid`,
      passwordHash: 'x', role, teamFunction: fn, status: 'active',
    },
  });
  const owner = await mk('owner', null, 'owner');
  const sales = await mk('agent', 'sales', 'sales');
  const marketing = await mk('agent', 'marketing', 'marketing');
  const other = await mk('agent', 'sales', 'other');
  const salesMgr = await mk('manager', 'sales', 'salesmgr');

  const phone = `9100${String(Date.now()).slice(-6)}`;
  const contact = await prisma.crmContact.create({
    data: {
      id: `c_${suffix}`, tenantId, name: 'Joint Account', mobile: `+${phone}`, city: 'Jaipur',
      ownerId: sales.id, marketingOwnerId: marketing.id, stage: 'new', tags: [],
      source: 'test', consent: 'pending', salesTier: 'standard', branchId: 'b', primaryWhatsAppNumberId: 'n',
      productInterests: [],
    },
  });

  /* ---- Both slots grant visibility ------------------------------------- */

  const visible = async (u: { id: string; tenantId: string; role: string; teamFunction: string | null }) => {
    const clause = await contactScopeClause(u as never);
    const rows = await prisma.crmContact.findMany({
      where: { tenantId, ...(clause ? { AND: [clause] } : {}) },
      select: { id: true },
    });
    return rows.some((r) => r.id === contact.id);
  };

  check('sales owner sees the contact', await visible(sales), true);
  check('marketing owner sees the same contact', await visible(marketing), true);
  check('an unrelated agent does not', await visible(other), false);
  check('the account owner sees everything', await visible(owner), true);
  check('a sales manager sees their department', await visible(salesMgr), true);

  check('canSeeContact accepts the sales slot',
    canSeeContact([sales.id], { ownerId: sales.id, marketingOwnerId: marketing.id }), true);
  check('canSeeContact accepts the marketing slot',
    canSeeContact([marketing.id], { ownerId: sales.id, marketingOwnerId: marketing.id }), true);
  check('canSeeContact rejects a stranger',
    canSeeContact([other.id], { ownerId: sales.id, marketingOwnerId: marketing.id }), false);
  check("canSeeContact lets 'all' through",
    canSeeContact('all', { ownerId: null, marketingOwnerId: null }), true);
  check('an empty marketing slot grants nothing',
    canSeeContact([other.id], { ownerId: sales.id, marketingOwnerId: null }), false);

  /* ---- The scope clause survives a caller's own OR ---------------------- */

  const clause = await contactScopeClause(sales as never);
  const searched = await prisma.crmContact.findMany({
    where: {
      tenantId,
      AND: [
        clause!,
        { OR: [{ name: { contains: 'Joint' } }, { company: { contains: 'Joint' } }] },
      ],
    },
    select: { id: true },
  });
  check('scope + a text search both apply', searched.length, 1);

  const strangerSearch = await prisma.crmContact.findMany({
    where: {
      tenantId,
      AND: [
        (await contactScopeClause(other as never))!,
        { OR: [{ name: { contains: 'Joint' } }, { company: { contains: 'Joint' } }] },
      ],
    },
    select: { id: true },
  });
  check('a search cannot reach outside the scope', strangerSearch.length, 0);

  /* ---- Conversations follow the sales owner ---------------------------- */

  const unassigned = await prisma.conversation.create({
    data: { tenantId, phoneNumberId: 'p1', contactPhone: phone, assigneeUserId: null },
  });
  const heldByPrevious = await prisma.conversation.create({
    data: { tenantId, phoneNumberId: 'p2', contactPhone: phone, assigneeUserId: sales.id },
  });
  const handedToSomeoneElse = await prisma.conversation.create({
    data: { tenantId, phoneNumberId: 'p3', contactPhone: phone, assigneeUserId: other.id },
  });

  const moved = await propagateContactOwner({
    tenantId,
    contacts: [{ id: contact.id, mobile: contact.mobile, ownerId: sales.id }],
    newOwnerId: salesMgr.id,
  });
  check('two conversations followed the new owner', moved, 2);

  const after = async (id: string) =>
    (await prisma.conversation.findUnique({ where: { id }, select: { assigneeUserId: true } }))?.assigneeUserId;
  check('an unassigned chat moved', await after(unassigned.id), salesMgr.id);
  check("the previous owner's chat moved", await after(heldByPrevious.id), salesMgr.id);
  check('a chat handed to someone else stayed put', await after(handedToSomeoneElse.id), other.id);

  /* ---- A chat adopts an unowned contact, never an owned one ---------- */

  const unowned = await prisma.crmContact.create({
    data: {
      id: `c2_${suffix}`, tenantId, name: 'Nobody Owns Me', mobile: `+${phone}1`, city: 'Surat',
      ownerId: '', stage: 'new', tags: [], source: 'test', consent: 'pending',
      salesTier: 'standard', branchId: 'b', primaryWhatsAppNumberId: 'n', productInterests: [],
    },
  });
  check('an unowned contact adopts the chat assignee',
    await adoptContactOwnerFromConversation({ tenantId, contactPhone: `${phone}1`, assigneeUserId: other.id }),
    unowned.id);
  check('and the owner stuck',
    (await prisma.crmContact.findUnique({ where: { id: unowned.id }, select: { ownerId: true } }))?.ownerId,
    other.id);
  check('an owned contact is never taken over by a chat assignment',
    await adoptContactOwnerFromConversation({ tenantId, contactPhone: phone, assigneeUserId: other.id }),
    null);
  check('unassigning a chat adopts nobody',
    await adoptContactOwnerFromConversation({ tenantId, contactPhone: `${phone}1`, assigneeUserId: null }),
    null);

  /* ---- Stranded contacts are findable ---------------------------------- */

  await prisma.user.update({ where: { id: other.id }, data: { status: 'disabled' } });
  const stranded = await findStrandedContacts(tenantId);
  check('a contact owned by a disabled user reads as stranded',
    stranded.some((c) => c.id === unowned.id), true);
  check('a contact owned by an active user does not',
    stranded.some((c) => c.id === contact.id), false);
  await prisma.user.update({ where: { id: other.id }, data: { status: 'active' } });

  /* ---- Many enquiries per contact, numbers that do not repeat ----------- */

  const nextNo = async () => {
    const rows = await prisma.crmEnquiry.findMany({
      where: { tenantId, enquiryNo: { startsWith: 'ENQ-' } },
      select: { enquiryNo: true }, orderBy: { enquiryNo: 'desc' }, take: 1,
    });
    const n = Number.parseInt((rows[0]?.enquiryNo ?? '').replace(/^ENQ-/, ''), 10);
    return `ENQ-${String((Number.isFinite(n) ? n : 0) + 1).padStart(4, '0')}`;
  };

  const e1 = await prisma.crmEnquiry.create({ data: { tenantId, contactId: contact.id, enquiryNo: await nextNo(), product: 'necklace' } });
  const e2 = await prisma.crmEnquiry.create({ data: { tenantId, contactId: contact.id, enquiryNo: await nextNo(), product: 'bangles' } });
  const e3 = await prisma.crmEnquiry.create({ data: { tenantId, contactId: contact.id, enquiryNo: await nextNo(), product: 'ring' } });
  check('three enquiries on one contact',
    await prisma.crmEnquiry.count({ where: { contactId: contact.id } }), 3);
  check('numbers are sequential', [e1.enquiryNo, e2.enquiryNo, e3.enquiryNo], ['ENQ-0001', 'ENQ-0002', 'ENQ-0003']);

  // The old count-based scheme reissued a number after any delete.
  await prisma.crmEnquiry.delete({ where: { id: e2.id } });
  check('a deleted number is not reissued', await nextNo(), 'ENQ-0004');

  let duplicateRejected = false;
  try {
    await prisma.crmEnquiry.create({ data: { tenantId, contactId: contact.id, enquiryNo: 'ENQ-0001', product: 'dupe' } });
  } catch (e) {
    duplicateRejected = (e as { code?: string }).code === 'P2002';
  }
  check('a duplicate number is rejected', duplicateRejected, true);

  // The FK means an enquiry cannot be filed against a contact that is not there.
  let badContactRejected = false;
  try {
    await prisma.crmEnquiry.create({ data: { tenantId, contactId: 'does_not_exist', enquiryNo: 'ENQ-9999' } });
  } catch {
    badContactRejected = true;
  }
  check('an enquiry cannot point at a missing contact', badContactRejected, true);

  check('visibleUserIds gives an agent only themselves',
    await visibleUserIds(sales as never), [sales.id]);

  /* ---- Clean up --------------------------------------------------------- */

  await prisma.crmEnquiry.deleteMany({ where: { tenantId } });
  await prisma.conversation.deleteMany({ where: { tenantId } });
  await prisma.crmContact.deleteMany({ where: { tenantId } });
  await prisma.crmAuditLog.deleteMany({ where: { tenantId } }).catch(() => {});
  await prisma.user.deleteMany({ where: { tenantId } });
  await prisma.tenant.delete({ where: { id: tenantId } });

  if (failures.length) {
    console.error(`\n${failures.length} FAILED of ${pass + failures.length}:\n`);
    for (const f of failures) console.error(`  x ${f}\n`);
    process.exit(1);
  }
  console.log(`All ${pass} assignment checks passed.`);
}

main()
  .catch(async (e) => {
    console.error(e);
    // Best-effort cleanup so a failed run leaves nothing behind.
    await prisma.crmEnquiry.deleteMany({ where: { tenantId } }).catch(() => {});
    await prisma.conversation.deleteMany({ where: { tenantId } }).catch(() => {});
    await prisma.crmContact.deleteMany({ where: { tenantId } }).catch(() => {});
    await prisma.crmAuditLog.deleteMany({ where: { tenantId } }).catch(() => {});
    await prisma.user.deleteMany({ where: { tenantId } }).catch(() => {});
    await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => {});
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
