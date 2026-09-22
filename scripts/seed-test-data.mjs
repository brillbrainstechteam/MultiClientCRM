// Seed realistic TEST data into one workspace so Contacts + Inbox can be tested
// end to end (queues, filters, assignment, labels, spam, unread, notes,
// 24h window states, contact linking, lead/lifecycle variety).
//
// Everything created here is tagged and removable:
//   - contacts:      id starts with "seed_", tag "test-data"
//   - conversations: id starts with "seed_", phones in +91 555 00xxxxx
//                    (not an allocated Indian mobile series, so nothing can
//                    ever be delivered to a real person)
//   - teammates:     email ends with "@test-seed.talktrack.invalid", random
//                    unguessable password (they cannot sign in)
//
// Usage (targets whatever DATABASE_URL the env file points at):
//   node --env-file=.env scripts/seed-test-data.mjs [--email owner@x.com]
//   node --env-file=.env scripts/seed-test-data.mjs --clean   # remove it all
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const CLEAN_ONLY = args.includes('--clean');
const emailArg = args.includes('--email') ? args[args.indexOf('--email') + 1] : 'tech@brillbrainsconsultants.com';

const SEED_TAG = 'test-data';
const SEED_EMAIL_DOMAIN = '@test-seed.talktrack.invalid';
const PHONE_PREFIX = '9155500'; // +91 555 00xxxxx

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const now = Date.now();
const ago = (ms) => new Date(now - ms);
const ahead = (ms) => new Date(now + ms);
const phone = (n) => `${PHONE_PREFIX}${String(n).padStart(5, '0')}`;

async function clean(tenantId) {
  const convs = await prisma.conversation.deleteMany({ where: { tenantId, id: { startsWith: 'seed_' } } });
  await prisma.crmStageTransition.deleteMany({ where: { tenantId, contactId: { startsWith: 'seed_' } } });
  const contacts = await prisma.crmContact.deleteMany({ where: { tenantId, id: { startsWith: 'seed_' } } });
  const users = await prisma.user.deleteMany({ where: { tenantId, email: { endsWith: SEED_EMAIL_DOMAIN } } });
  console.log(`Removed ${convs.count} conversations, ${contacts.count} contacts, ${users.count} test teammates.`);
}

async function main() {
  const owner = await prisma.user.findUnique({ where: { email: emailArg } });
  if (!owner) throw new Error(`No user ${emailArg}`);
  const tenantId = owner.tenantId;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  console.log(`Workspace: ${tenant.businessName} (${tenantId})`);

  await clean(tenantId);
  if (CLEAN_ONLY) return;

  const account = await prisma.whatsAppAccount.findFirst({
    where: { tenantId, status: 'connected' },
    orderBy: { connectedAt: 'desc' },
  });
  if (!account?.phoneNumberId) throw new Error('Workspace has no connected WhatsApp number.');

  // ---- Test teammates (cannot sign in) ------------------------------------
  const unusable = await bcrypt.hash(randomBytes(32).toString('hex'), 10);
  const mates = [
    { key: 'manager', name: 'Riya Kapoor (Test)', role: 'manager', teamFunction: 'sales' },
    { key: 'agent1', name: 'Arjun Mehta (Test)', role: 'agent', teamFunction: 'sales' },
    { key: 'agent2', name: 'Neha Iyer (Test)', role: 'agent', teamFunction: 'support' },
  ];
  const U = { owner: owner.id };
  for (const m of mates) {
    const u = await prisma.user.create({
      data: {
        tenantId, name: m.name, role: m.role, teamFunction: m.teamFunction,
        email: `${m.key}${SEED_EMAIL_DOMAIN}`, passwordHash: unusable,
      },
    });
    U[m.key] = u.id;
  }

  // ---- Contacts -------------------------------------------------------------
  // [n, type, name, company, city, state, leadStatus, lifecycle, stage, owner, tags, consent, tier, value, segment, grade, followUp, source]
  const C = [
    [1, 'b2b', 'Rakesh Jain', 'Jain Jewels Pvt Ltd', 'Mumbai', 'Maharashtra', 'engaged', 'customer', 'customer', 'owner', ['wholesale', 'repeat'], 'opted-in', 'platinum', 'high', 'chain_stores', 'A', -2 * DAY, 'Trade show'],
    [2, 'b2b', 'Priya Sharma', 'Sharma Gold House', 'Jaipur', 'Rajasthan', 'enquiry_generated', 'prospect', 'qualified', 'agent1', ['bridal'], 'opted-in', 'gold', 'high', 'boutique', 'A', 1 * DAY, 'WhatsApp inbox'],
    [3, 'b2c', 'Ananya Reddy', null, 'Hyderabad', 'Telangana', 'connected', 'prospect', 'engaged', 'agent1', ['bridal', 'diamond'], 'opted-in', 'standard', 'medium', null, null, 3 * DAY, 'Instagram'],
    [4, 'b2b', 'Vikram Singh', 'Singh Exports', 'Surat', 'Gujarat', 'attempted', 'prospect', 'new', 'manager', ['exports'], 'pending', 'silver', 'high', 'exports', 'B', -1 * DAY, 'Google Maps'],
    [5, 'b2c', 'Meera Nair', null, 'Kochi', 'Kerala', 'new', 'prospect', 'new', null, [], 'pending', 'standard', null, null, null, null, 'WhatsApp inbox'],
    [6, 'b2b', 'Suresh Agarwal', 'Agarwal & Sons Jewellers', 'Delhi', 'Delhi', 'engaged', 'customer', 'customer', 'manager', ['repeat', 'gst-verified'], 'opted-in', 'gold', 'high', 'standalone', 'A', 5 * DAY, 'Referral'],
    [7, 'b2c', 'Kavya Menon', null, 'Bengaluru', 'Karnataka', 'not_interested', 'prospect', 'dormant', 'agent2', [], 'opted-out', 'standard', 'low', null, null, null, 'Website'],
    [8, 'b2b', 'Imran Qureshi', 'Qureshi Corporate Gifting', 'Pune', 'Maharashtra', 'assigned', 'prospect', 'new', 'agent2', ['corporate'], 'opted-in', 'silver', 'medium', 'corporate', 'B', 2 * HOUR, 'CSV import'],
    [9, 'b2c', 'Sneha Iyer', null, 'Chennai', 'Tamil Nadu', 'engaged', 'customer', 'customer', 'owner', ['diamond', 'repeat'], 'opted-in', 'gold', 'medium', null, null, 7 * DAY, 'Walk-in'],
    [10, 'b2b', 'Harish Patel', 'Patel Small Store', 'Ahmedabad', 'Gujarat', 'dormant', 'customer', 'dormant', 'agent1', ['dormant'], 'opted-in', 'standard', 'low', 'small_store', 'D', -10 * DAY, 'Trade show'],
    [11, 'b2b', 'Deepa Bhatt', 'Bhatt Boutique', 'Udaipur', 'Rajasthan', 'connected', 'prospect', 'engaged', 'agent1', ['bridal', 'silver'], 'pending', 'silver', 'medium', 'boutique', 'C', 4 * HOUR, 'Instagram'],
    [12, 'b2c', 'Rohan Das', null, 'Kolkata', 'West Bengal', 'new', 'prospect', 'new', null, [], 'pending', 'standard', null, null, null, null, 'Website'],
    [13, 'b2b', 'Farah Khan', 'Noor Jewels', 'Lucknow', 'Uttar Pradesh', 'enquiry_generated', 'prospect', 'qualified', 'manager', ['bulk-order'], 'opted-in', 'gold', 'high', 'chain_stores', 'B', 2 * DAY, 'Google Maps'],
    [14, 'b2c', 'Aditya Rao', null, 'Mysuru', 'Karnataka', 'attempted', 'prospect', 'new', 'agent2', [], 'pending', 'standard', 'low', null, null, -3 * DAY, 'VCF import'],
    [15, 'b2b', 'Gurpreet Kaur', 'Kaur Heritage Jewellers', 'Amritsar', 'Punjab', 'engaged', 'customer', 'customer', 'owner', ['gst-verified', 'wholesale'], 'opted-in', 'platinum', 'high', 'standalone', 'A', 10 * DAY, 'Referral'],
    [16, 'b2c', 'Pooja Verma', null, 'Indore', 'Madhya Pradesh', 'connected', 'prospect', 'engaged', 'agent1', ['gold-coins'], 'opted-in', 'standard', 'medium', null, null, 1 * DAY, 'WhatsApp inbox'],
  ];

  let created = 0;
  for (const [n, type, name, company, city, state, leadStatus, lifecycle, stage, ownerKey, tags, consent, tier, value, segment, grade, followUp, source] of C) {
    const id = `seed_c${String(n).padStart(3, '0')}`;
    const isCustomer = lifecycle === 'customer';
    await prisma.crmContact.create({
      data: {
        id, tenantId,
        name, company, customerType: type, contactPerson: type === 'b2b' ? name : null,
        mobile: `+${phone(n)}`,
        email: `${name.split(' ')[0].toLowerCase()}.${n}@example.com`,
        city, state, zone: null, pincode: null,
        ownerId: ownerKey ? U[ownerKey] : '',
        stage, leadStatus, lifecycleStage: lifecycle,
        lifecycleState: isCustomer ? (leadStatus === 'dormant' ? 'dormant' : 'active') : null,
        activatedAt: isCustomer ? ago(120 * DAY) : null,
        tags: [...tags, SEED_TAG],
        productInterests: tags.filter((t) => ['bridal', 'diamond', 'silver', 'gold-coins'].includes(t)),
        source, createdSource: source,
        consent, consentOptInSource: consent === 'opted-in' ? 'WhatsApp opt-in' : null,
        consentOptInAt: consent === 'opted-in' ? ago(30 * DAY) : null,
        salesTier: tier, businessValue: value,
        businessSegment: segment, grade,
        gstin: type === 'b2b' && tags.includes('gst-verified') ? `27ABCDE${1000 + n}F1Z5` : null,
        legalName: type === 'b2b' ? company : null,
        nextFollowUpAt: followUp == null ? null : (followUp < 0 ? ago(-followUp) : ahead(followUp)),
        lastActivityAt: ago(n * 7 * HOUR),
        lastConnectAt: leadStatus === 'new' ? null : ago(n * 11 * HOUR),
        branchId: 'branch_main',
        primaryWhatsAppNumberId: account.id,
        createdAt: ago((40 - n) * DAY),
      },
    });
    await prisma.crmStageTransition.create({
      data: { tenantId, contactId: id, kind: 'lead', fromValue: null, toValue: leadStatus, byUserId: owner.id, note: 'Test data' },
    });
    created++;
  }
  console.log(`Created ${created} contacts.`);

  // ---- Conversations ----------------------------------------------------------
  // Each thread: [n (phone), name|null, status, assigneeKey|null, labels, isSpam, readUpTo('all'|'none'), messages[[dir, text, msAgo]], notes[[text, msAgo]]]
  // n 1..16 link to the contacts above; 90+ are unknown numbers (no contact yet).
  const T = [
    [2, 'Priya Sharma', 'open', 'agent1', ['lbl_hot_lead', 'lbl_bulk_enquiry'], false, 'none', [
      ['inbound', 'Hi, we are looking for a bridal collection for our store', 5 * HOUR],
      ['outbound', 'Hello Priya! Happy to help. What price range are you considering?', 4.8 * HOUR],
      ['inbound', 'Around 5-8 lakh per set, about 12 sets', 40 * MIN],
      ['inbound', 'Can you share the catalogue?', 38 * MIN],
    ], [['Big bridal order — loop in Riya before quoting', 30 * MIN]]],
    [3, 'Ananya Reddy', 'open', null, ['lbl_hot_lead'], false, 'none', [
      ['inbound', 'Do you have solitaire rings under 1.5 lakh?', 2 * HOUR],
    ], []],
    [5, 'Meera Nair', 'open', null, [], false, 'none', [
      ['inbound', 'Hello', 20 * MIN],
      ['inbound', 'What are your store timings?', 19 * MIN],
    ], []],
    [8, 'Imran Qureshi', 'pending', 'agent2', ['lbl_follow_up'], false, 'all', [
      ['inbound', 'Need 200 silver coins for Diwali corporate gifting', 9 * HOUR],
      ['outbound', 'Sure Imran, sharing a quote shortly. Do you need custom branding?', 8.5 * HOUR],
      ['inbound', 'Yes, our logo on one side', 8 * HOUR],
      ['outbound', 'Noted. Quote will be with you by tomorrow noon.', 7.5 * HOUR],
    ], [['Waiting on logo artwork from client', 7 * HOUR]]],
    [1, 'Rakesh Jain', 'open', 'owner', ['lbl_vip'], false, 'all', [
      ['inbound', 'Please confirm dispatch of last order', 26 * HOUR],
      ['outbound', 'Dispatched today via BlueDart, tracking sent on email.', 25 * HOUR],
    ], []],
    [6, 'Suresh Agarwal', 'resolved', 'manager', ['lbl_support'], false, 'all', [
      ['inbound', 'Invoice GST number is wrong', 3 * DAY],
      ['outbound', 'Apologies — corrected invoice attached.', 3 * DAY - 2 * HOUR],
      ['inbound', 'Received, thanks', 3 * DAY - HOUR],
    ], []],
    [13, 'Farah Khan', 'open', 'manager', ['lbl_bulk_enquiry', 'lbl_payment'], false, 'none', [
      ['inbound', 'Payment of 2.4L done via NEFT, please check', 3 * HOUR],
      ['inbound', 'UTR: TEST000123', 3 * HOUR - 2 * MIN],
    ], []],
    [9, 'Sneha Iyer', 'open', 'owner', [], false, 'all', [
      ['outbound', 'Hi Sneha, your custom pendant is ready for pickup!', 6 * HOUR],
    ], []],
    [11, 'Deepa Bhatt', 'pending', 'agent1', ['lbl_follow_up'], false, 'all', [
      ['inbound', 'Can I get silver anklets in bulk?', 2 * DAY],
      ['outbound', 'Yes! Minimum order is 50 pairs. Shall I share designs?', 2 * DAY - HOUR],
    ], []],
    [10, 'Harish Patel', 'resolved', 'agent1', [], false, 'all', [
      ['inbound', 'Not ordering this season', 20 * DAY],
      ['outbound', 'Understood, we will check back next quarter.', 20 * DAY - HOUR],
    ], []],
    [16, 'Pooja Verma', 'open', 'agent2', ['lbl_hot_lead'], false, 'none', [
      ['inbound', 'Price of 10g 24K gold coin today?', 50 * MIN],
    ], []],
    [90, 'Unknown enquiry', 'open', null, [], false, 'none', [
      ['inbound', 'Saw your ad on Instagram. Do you deliver to Nagpur?', 90 * MIN],
    ], []],
    [91, null, 'open', null, [], false, 'none', [
      ['inbound', 'Is this TalkTrack support?', 30 * HOUR],
    ], []],
    [92, 'Promo Blast', 'open', null, [], true, 'none', [
      ['inbound', 'CONGRATULATIONS you won a free iPhone, click here', 4 * HOUR],
    ], []],
  ];

  for (const [n, name, status, assigneeKey, labels, isSpam, readUpTo, msgs, notes] of T) {
    const id = `seed_v${String(n).padStart(3, '0')}`;
    const times = msgs.map((m) => ago(m[2]));
    const last = new Date(Math.max(...times.map((d) => d.getTime())));
    await prisma.conversation.create({
      data: {
        id, tenantId,
        phoneNumberId: account.phoneNumberId,
        contactPhone: phone(n),
        contactName: name,
        assigneeUserId: assigneeKey ? U[assigneeKey] : null,
        status, labels, isSpam,
        lastReadAt: readUpTo === 'all' ? new Date(last.getTime() + MIN) : null,
        lastMessageAt: last,
        createdAt: times[0],
        messages: {
          create: msgs.map(([direction, text], i) => ({
            direction, text, type: 'text',
            status: direction === 'outbound' ? (i === msgs.length - 1 ? 'delivered' : 'read') : null,
            at: times[i],
          })),
        },
        notes: {
          create: notes.map(([text, msAgo]) => ({ tenantId, text, authorUserId: owner.id, createdAt: ago(msAgo) })),
        },
      },
    });
  }
  console.log(`Created ${T.length} conversations.`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
