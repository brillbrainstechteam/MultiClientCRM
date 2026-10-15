/**
 * Click-to-WhatsApp attribution tests.
 *
 * Run: npx tsx scripts/test-referral.ts
 *
 * The rule that matters most here is first-touch: a contact keeps the ad that
 * originally won them, and a later click is recorded on its own message
 * instead. Overwriting would silently re-credit a customer to whichever ad they
 * last tapped, which turns attribution into fiction — and it is the kind of bug
 * nobody notices until the ad spend review.
 */
import { prisma } from '../lib/db';
import { readReferral, describeReferral, applyReferralToContact } from '../lib/whatsapp/referral';

let pass = 0;
const failures: string[] = [];

function check(label: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { pass++; return; }
  failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
}

const suffix = `rf${Date.now()}`;
const tenantId = `t_${suffix}`;
const mobile = `+9198${String(Date.now()).slice(-8)}`;

const AD = {
  source_url: 'https://fb.me/2abc',
  source_id: '1234567890',
  source_type: 'ad',
  headline: 'Diwali Collection',
  body: 'Antique bridal sets now in store',
  media_type: 'image',
  ctwa_clid: 'ARBxyz123',
};

async function cleanup() {
  await prisma.crmContact.deleteMany({ where: { tenantId } }).catch(() => {});
  await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => {});
}

async function main() {
  /* ---- Reading the object off a message --------------------------------- */

  check('a referral is read off the message',
    readReferral({ from: '91', referral: AD })?.source_id, '1234567890');
  check('a message without one yields null', readReferral({ from: '91' }), null);
  check('an empty referral is not attribution', readReferral({ referral: {} }), null);
  check('a non-object referral is ignored', readReferral({ referral: 'nope' }), null);
  check('null does not throw', readReferral(null), null);

  check('the headline is what an agent reads',
    describeReferral(AD), 'Diwali Collection (ad)');
  check('a post reads as a post',
    describeReferral({ ...AD, source_type: 'post' }), 'Diwali Collection (post)');
  check('with no headline it falls back to the body',
    describeReferral({ source_type: 'ad', body: 'Antique sets' }), 'Antique sets (ad)');
  check('and with neither it still says something useful',
    describeReferral({ source_type: 'ad' }), 'Click-to-WhatsApp ad');
  check('no referral describes as nothing', describeReferral(null), null);

  /* ---- Stamping the contact ---------------------------------------------- */

  await prisma.tenant.create({ data: { id: tenantId, businessName: 'Referral Test' } });
  const contact = await prisma.crmContact.create({
    data: {
      id: `c_${suffix}`, tenantId, name: 'Walk-in', mobile, city: 'Jaipur',
      ownerId: 'u', stage: 'new', tags: [], source: 'Manual entry', consent: 'pending',
      salesTier: 'standard', branchId: 'b', primaryWhatsAppNumberId: 'n', productInterests: [],
    },
  });

  const digits = mobile.replace(/\D/g, '');
  const at = new Date();
  check('the stamp applies', await applyReferralToContact({ tenantId, contactPhone: digits, referral: AD, at }), true);

  const stamped = await prisma.crmContact.findUnique({
    where: { id: contact.id },
    select: { adSourceId: true, adHeadline: true, ctwaClid: true, adSourceType: true, source: true },
  });
  check('ad id recorded', stamped?.adSourceId, '1234567890');
  check('headline recorded', stamped?.adHeadline, 'Diwali Collection');
  check('click id kept for Conversions API', stamped?.ctwaClid, 'ARBxyz123');
  check('source type recorded', stamped?.adSourceType, 'ad');
  check('the default source is replaced by the real one', stamped?.source, 'Click-to-WhatsApp ad');

  /* ---- First touch wins --------------------------------------------------- */

  const SECOND_AD = { ...AD, source_id: '9999999999', headline: 'Wedding Collection', ctwa_clid: 'ARBsecond' };
  check('a later click does NOT re-stamp the contact',
    await applyReferralToContact({ tenantId, contactPhone: digits, referral: SECOND_AD, at: new Date() }), false);
  const after = await prisma.crmContact.findUnique({
    where: { id: contact.id }, select: { adSourceId: true, adHeadline: true },
  });
  check('the original ad is kept', after?.adSourceId, '1234567890');
  check('and so is its headline', after?.adHeadline, 'Diwali Collection');

  /* ---- A deliberately-set source is never overwritten -------------------- */

  const other = await prisma.crmContact.create({
    data: {
      id: `c2_${suffix}`, tenantId, name: 'Referred', mobile: `${mobile}1`, city: 'Surat',
      ownerId: 'u', stage: 'new', tags: [], source: 'Exhibition', consent: 'pending',
      salesTier: 'standard', branchId: 'b', primaryWhatsAppNumberId: 'n', productInterests: [],
    },
  });
  await applyReferralToContact({
    tenantId, contactPhone: `${mobile}1`.replace(/\D/g, ''), referral: AD, at,
  });
  const kept = await prisma.crmContact.findUnique({
    where: { id: other.id }, select: { source: true, adSourceId: true },
  });
  check('a real source survives an ad click', kept?.source, 'Exhibition');
  check('but the ad is still recorded alongside it', kept?.adSourceId, '1234567890');

  /* ---- Unknown numbers ---------------------------------------------------- */

  check('an unknown number stamps nothing',
    await applyReferralToContact({ tenantId, contactPhone: '910000000000', referral: AD, at }), false);
  check('an empty number stamps nothing',
    await applyReferralToContact({ tenantId, contactPhone: '', referral: AD, at }), false);

  /* ---- Missing ctwa_clid (WhatsApp Status ads) --------------------------- */

  const third = await prisma.crmContact.create({
    data: {
      id: `c3_${suffix}`, tenantId, name: 'Status', mobile: `${mobile}2`, city: 'Indore',
      ownerId: 'u', stage: 'new', tags: [], source: 'Manual entry', consent: 'pending',
      salesTier: 'standard', branchId: 'b', primaryWhatsAppNumberId: 'n', productInterests: [],
    },
  });
  const noClid = { source_id: '555', source_type: 'ad', headline: 'Status ad' };
  check('a referral without a click id still stamps',
    await applyReferralToContact({ tenantId, contactPhone: `${mobile}2`.replace(/\D/g, ''), referral: noClid, at }), true);
  const statusRow = await prisma.crmContact.findUnique({
    where: { id: third.id }, select: { ctwaClid: true, adSourceId: true },
  });
  check('with a null click id, not a crash', statusRow?.ctwaClid, null);
  check('and the ad still recorded', statusRow?.adSourceId, '555');

  await cleanup();

  if (failures.length) {
    console.error(`\n${failures.length} FAILED of ${pass + failures.length}:\n`);
    for (const f of failures) console.error(`  x ${f}\n`);
    process.exit(1);
  }
  console.log(`All ${pass} referral checks passed.`);
}

main()
  .catch(async (e) => {
    console.error(e);
    await cleanup();
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
