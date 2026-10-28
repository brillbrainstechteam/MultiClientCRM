import { prisma } from '@/lib/db';
import { routeLocation } from '@/lib/crm/zone-routing';

/**
 * Lead routing-precedence engine (Lead Capture docs — B2B §15–21, B2C §13–19).
 *
 * One engine, both journeys. Every lead resolves to a single owner decision with
 * an explicit *reason* (which rule won) and *method* (how one person was picked
 * from the candidate pool), so the Unassigned queue and the audit trail can
 * always say why a lead landed where it did.
 *
 * Precedence (first match wins):
 *   1. RELATIONSHIP_OWNER — a known contact keeps its sales owner. Never
 *      re-routed, never round-robined. (Both journeys.)
 *   2. MARKETING_QUEUE   — B2B new/unowned leads go to Marketing first
 *      (qualification-first journey): the existing marketing owner, else the
 *      least-loaded marketing-function user. Fills the *marketing* slot, not
 *      sales. B2C skips this entirely (direct-to-store journey).
 *   3. APPOINTMENT       — the salesperson on a booked appointment.
 *                          (Pending the CrmAppointment model; no-op until then.)
 *   4. BRANCH            — a branch's own salesperson.
 *                          (Pending a branch→member mapping; no-op until then.)
 *   5. ZONE              — City→State→Zone→member. One member → that person;
 *      several → least-loaded among them.
 *   6. UNASSIGNED        — nothing resolved; the lead surfaces in the queue.
 *
 * B2C guardrail (docs §35): no Marketing-qualification gate — consumer leads go
 * straight to the branch/salesperson (zone), respecting any existing owner.
 */

export type AssignmentReason =
  | 'RELATIONSHIP_OWNER'
  | 'MARKETING_QUEUE'
  | 'APPOINTMENT'
  | 'BRANCH'
  | 'ZONE'
  | 'UNASSIGNED';

export type AssignmentMethod =
  | 'EXISTING'      // the slot already had an owner
  | 'SINGLE_MEMBER' // exactly one candidate covered the pool
  | 'LEAST_LOADED'  // picked the lightest live queue among several
  | 'NONE';         // no candidate

export type OwnerSlot = 'sales' | 'marketing';

export interface RouteInput {
  tenantId: string;
  customerType: 'b2b' | 'b2c';
  /** An existing contact's current owners, when the lead matched one. */
  existingOwnerId?: string | null;
  existingMarketingOwnerId?: string | null;
  city?: string | null;
  state?: string | null;
  /** Hints for the branch/appointment rules (resolve once those exist). */
  branchId?: string | null;
  appointmentId?: string | null;
}

export interface RouteResult {
  ownerSlot: OwnerSlot;
  assigneeUserId: string | null;
  assignmentReason: AssignmentReason;
  assignmentMethod: AssignmentMethod;
  zoneId: string | null;
  zoneName: string | null;
  /** AUTO_RESOLVED when a zone was matched, UNKNOWN when the location mapped to none. */
  zoneResolution: string | null;
  /** The pool that was considered, for transparency in the audit/queue. */
  candidates: string[];
}

const OPEN_INTAKE_STATUSES = ['new', 'routed', 'needs_review'];

/**
 * Live unworked load per user: intake events still awaiting first contact.
 * This is the signal the SLA cares about, so balancing on it spreads the
 * first-response burden rather than lifetime account count.
 */
async function pickLeastLoaded(tenantId: string, candidates: string[]): Promise<string | null> {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  const counts = await prisma.crmIntakeEvent.groupBy({
    by: ['assignedUserId'],
    where: { tenantId, assignedUserId: { in: candidates }, status: { in: OPEN_INTAKE_STATUSES } },
    _count: { _all: true },
  });
  const load = new Map<string, number>(candidates.map((id) => [id, 0]));
  for (const row of counts) {
    if (row.assignedUserId) load.set(row.assignedUserId, row._count._all);
  }
  // Lowest live queue wins; ties break by candidate order (stable, deterministic).
  return [...candidates].sort((a, b) => (load.get(a)! - load.get(b)!))[0];
}

/** Active marketing-function users for the B2B qualification queue. */
async function marketingUsers(tenantId: string): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: { tenantId, status: 'active', teamFunction: 'marketing' },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });
  return users.map((u) => u.id);
}

/**
 * Eligible Sales members for a qualified lead's zone (Marketing→Sales handoff,
 * MKT-05/06). Prefers explicit sales-function users, else anyone who isn't
 * marketing; prefers those covering the lead's zone, else the whole pool.
 */
export async function qualifiedSalesCandidates(tenantId: string, city?: string | null, state?: string | null): Promise<string[]> {
  const active = await prisma.user.findMany({ where: { tenantId, status: 'active' }, select: { id: true, teamFunction: true }, orderBy: { createdAt: 'asc' } });
  const sales = active.filter((u) => u.teamFunction === 'sales').map((u) => u.id);
  const pool = sales.length ? sales : active.filter((u) => u.teamFunction !== 'marketing').map((u) => u.id);

  const zone = await routeLocation(tenantId, city, state);
  const inZone = zone.memberUserIds.filter((id) => pool.includes(id));
  return inZone.length ? inZone : pool;
}

export async function routeLead(input: RouteInput): Promise<RouteResult> {
  const { tenantId, customerType } = input;
  const base = { zoneId: null as string | null, zoneName: null as string | null, zoneResolution: null as string | null, candidates: [] as string[] };

  // 1) RELATIONSHIP_OWNER — a known account stays with its sales owner.
  if (input.existingOwnerId) {
    return { ...base, ownerSlot: 'sales', assigneeUserId: input.existingOwnerId, assignmentReason: 'RELATIONSHIP_OWNER', assignmentMethod: 'EXISTING', candidates: [input.existingOwnerId] };
  }

  // 2) MARKETING_QUEUE — B2B qualification-first. B2C never gates on marketing.
  if (customerType === 'b2b') {
    if (input.existingMarketingOwnerId) {
      return { ...base, ownerSlot: 'marketing', assigneeUserId: input.existingMarketingOwnerId, assignmentReason: 'MARKETING_QUEUE', assignmentMethod: 'EXISTING', candidates: [input.existingMarketingOwnerId] };
    }
    const mkt = await marketingUsers(tenantId);
    if (mkt.length > 0) {
      const chosen = await pickLeastLoaded(tenantId, mkt);
      return { ...base, ownerSlot: 'marketing', assigneeUserId: chosen, assignmentReason: 'MARKETING_QUEUE', assignmentMethod: mkt.length === 1 ? 'SINGLE_MEMBER' : 'LEAST_LOADED', candidates: mkt };
    }
    // No marketing team configured — fall through to zone so leads aren't stranded.
  }

  // 3) APPOINTMENT / 4) BRANCH — reserved precedence slots. These resolve once
  //    the CrmAppointment model and a branch→member mapping exist; until then
  //    they intentionally no-op and control passes to zone routing.

  // 5) ZONE — geographic routing (direct-to-store for B2C, sales fallback for B2B).
  const zone = await routeLocation(tenantId, input.city, input.state);
  if (zone.zoneId) {
    const chosen = zone.assigneeUserId ?? (await pickLeastLoaded(tenantId, zone.memberUserIds));
    return {
      ownerSlot: 'sales',
      assigneeUserId: chosen,
      assignmentReason: chosen ? 'ZONE' : 'UNASSIGNED',
      assignmentMethod: chosen ? (zone.memberUserIds.length <= 1 ? 'SINGLE_MEMBER' : 'LEAST_LOADED') : 'NONE',
      zoneId: zone.zoneId,
      zoneName: zone.zoneName,
      zoneResolution: 'AUTO_RESOLVED',
      candidates: zone.memberUserIds,
    };
  }

  // 6) UNASSIGNED — nothing matched; surfaces in the queue for manual pickup.
  return { ...base, ownerSlot: 'sales', assigneeUserId: null, assignmentReason: 'UNASSIGNED', assignmentMethod: 'NONE', zoneResolution: 'UNKNOWN' };
}
