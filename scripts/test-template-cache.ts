/**
 * Template mirror tests, against a throwaway tenant.
 *
 * Run: npx tsx scripts/test-template-cache.ts
 *
 * The risk in any cache is that it drifts from the source and nobody notices,
 * so these cover reconciliation rather than the happy path: a template that
 * changes status, one Meta stops listing, one that comes back, and the webhook
 * write-backs that are supposed to keep it near-live between syncs.
 *
 * Graph is never called — syncTemplatesFromMeta's HTTP is stubbed, so the test
 * exercises the reconciliation and nothing else.
 */
import { prisma } from '../lib/db';
import { applyTemplateEvent, approvedTemplateCount } from '../lib/meta/template-cache';

let pass = 0;
const failures: string[] = [];

function check(label: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { pass++; return; }
  failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
}

const suffix = `tc${Date.now()}`;
const tenantId = `t_${suffix}`;
const wabaId = `w_${suffix}`;

/** Upsert exactly as syncTemplatesFromMeta does, minus the HTTP. */
async function mirror(list: Array<{
  name: string; language: string; status: string; category?: string;
  quality?: string | null; rejected?: string | null;
}>) {
  const now = new Date();
  const seen = new Set<string>();
  for (const t of list) {
    seen.add(`${t.name}::${t.language}`);
    const data = {
      wabaId,
      metaTemplateId: `meta_${t.name}_${t.language}`,
      status: t.status.toUpperCase(),
      category: (t.category ?? 'UTILITY').toUpperCase(),
      qualityScore: t.quality ? t.quality.toUpperCase() : null,
      rejectedReason: t.rejected && t.rejected !== 'NONE' ? t.rejected : null,
      components: [{ type: 'BODY', text: 'hello' }] as object,
      deletedAt: null,
      lastSyncedAt: now,
    };
    await prisma.crmTemplate.upsert({
      where: { tenantId_name_language: { tenantId, name: t.name, language: t.language } },
      update: data,
      create: { tenantId, name: t.name, language: t.language, ...data },
    });
  }
  const stored = await prisma.crmTemplate.findMany({
    where: { tenantId, wabaId, deletedAt: null },
    select: { id: true, name: true, language: true },
  });
  const gone = stored.filter((r) => !seen.has(`${r.name}::${r.language}`)).map((r) => r.id);
  if (gone.length) {
    await prisma.crmTemplate.updateMany({ where: { id: { in: gone } }, data: { deletedAt: now } });
  }
}

const live = () => prisma.crmTemplate.findMany({
  where: { tenantId, deletedAt: null },
  select: { name: true, language: true, status: true, category: true, qualityScore: true },
  orderBy: [{ name: 'asc' }, { language: 'asc' }],
});

async function main() {
  await prisma.tenant.create({ data: { id: tenantId, businessName: 'Template Cache Test' } });

  /* ---- First sync --------------------------------------------------------- */

  await mirror([
    { name: 'order_update', language: 'en', status: 'APPROVED', category: 'UTILITY' },
    { name: 'diwali_offer', language: 'en', status: 'PENDING', category: 'MARKETING' },
    { name: 'diwali_offer', language: 'hi', status: 'APPROVED', category: 'MARKETING' },
  ]);

  check('three templates mirrored', (await live()).length, 3);
  check('two approved', await approvedTemplateCount(tenantId), 2);
  check('the same name in two languages is two rows',
    (await live()).filter((t) => t.name === 'diwali_offer').length, 2);

  /* ---- A status change on a later sync ------------------------------------ */

  await mirror([
    { name: 'order_update', language: 'en', status: 'APPROVED', category: 'UTILITY' },
    { name: 'diwali_offer', language: 'en', status: 'APPROVED', category: 'MARKETING' },
    { name: 'diwali_offer', language: 'hi', status: 'APPROVED', category: 'MARKETING' },
  ]);
  check('the pending one flipped to approved', await approvedTemplateCount(tenantId), 3);
  check('no duplicate row was created', (await live()).length, 3);

  /* ---- A template Meta stops listing -------------------------------------- */

  await mirror([
    { name: 'order_update', language: 'en', status: 'APPROVED', category: 'UTILITY' },
    { name: 'diwali_offer', language: 'en', status: 'APPROVED', category: 'MARKETING' },
  ]);
  check('a vanished template drops out of the live list', (await live()).length, 2);
  check('but its row survives, soft-deleted',
    await prisma.crmTemplate.count({ where: { tenantId, name: 'diwali_offer', language: 'hi' } }), 1);
  check('and it stops counting as approved', await approvedTemplateCount(tenantId), 2);

  /* ---- ...and comes back -------------------------------------------------- */

  await mirror([
    { name: 'order_update', language: 'en', status: 'APPROVED', category: 'UTILITY' },
    { name: 'diwali_offer', language: 'en', status: 'APPROVED', category: 'MARKETING' },
    { name: 'diwali_offer', language: 'hi', status: 'APPROVED', category: 'MARKETING' },
  ]);
  check('a restored template is undeleted, not duplicated', (await live()).length, 3);
  check('still three rows in total',
    await prisma.crmTemplate.count({ where: { tenantId } }), 3);

  /* ---- Webhook write-backs ------------------------------------------------ */

  check('a PAUSED event lands on the right language',
    await applyTemplateEvent({ tenantId, name: 'diwali_offer', language: 'en', status: 'PAUSED' }), true);
  const afterPause = await live();
  check('the en variant is paused',
    afterPause.find((t) => t.name === 'diwali_offer' && t.language === 'en')?.status, 'PAUSED');
  check('the hi variant is untouched',
    afterPause.find((t) => t.name === 'diwali_offer' && t.language === 'hi')?.status, 'APPROVED');
  check('a paused template no longer counts as approved', await approvedTemplateCount(tenantId), 2);

  check('a re-categorisation lands',
    await applyTemplateEvent({ tenantId, name: 'order_update', language: 'en', category: 'MARKETING' }), true);
  check('category updated',
    (await live()).find((t) => t.name === 'order_update')?.category, 'MARKETING');

  check('a quality score lands',
    await applyTemplateEvent({ tenantId, name: 'order_update', language: 'en', qualityScore: 'red' }), true);
  check('quality stored upper-case',
    (await live()).find((t) => t.name === 'order_update')?.qualityScore, 'RED');

  // Without a language the event applies to every variant of that name.
  check('a language-less event hits every variant',
    await applyTemplateEvent({ tenantId, name: 'diwali_offer', status: 'DISABLED' }), true);
  const afterAll = await live();
  check('both variants disabled',
    afterAll.filter((t) => t.name === 'diwali_offer' && t.status === 'DISABLED').length, 2);

  check('an event for an unknown template changes nothing',
    await applyTemplateEvent({ tenantId, name: 'never_created', status: 'APPROVED' }), false);
  check('an event with no field to set is a no-op',
    await applyTemplateEvent({ tenantId, name: 'order_update' }), false);
  check('an event with no name is a no-op',
    await applyTemplateEvent({ tenantId, status: 'APPROVED' }), false);

  /* ---- Tenant isolation --------------------------------------------------- */

  const otherTenant = `t2_${suffix}`;
  await prisma.tenant.create({ data: { id: otherTenant, businessName: 'Other Co' } });
  check("another tenant's count is unaffected", await approvedTemplateCount(otherTenant), 0);
  check('and an event cannot cross tenants',
    await applyTemplateEvent({ tenantId: otherTenant, name: 'order_update', status: 'APPROVED' }), false);
  await prisma.tenant.delete({ where: { id: otherTenant } });

  /* ---- Clean up ----------------------------------------------------------- */

  await prisma.crmTemplate.deleteMany({ where: { tenantId } });
  await prisma.tenant.delete({ where: { id: tenantId } });

  if (failures.length) {
    console.error(`\n${failures.length} FAILED of ${pass + failures.length}:\n`);
    for (const f of failures) console.error(`  x ${f}\n`);
    process.exit(1);
  }
  console.log(`All ${pass} template-cache checks passed.`);
}

main()
  .catch(async (e) => {
    console.error(e);
    await prisma.crmTemplate.deleteMany({ where: { tenantId } }).catch(() => {});
    await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => {});
    await prisma.tenant.delete({ where: { id: `t2_${suffix}` } }).catch(() => {});
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
