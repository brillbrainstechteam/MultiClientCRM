/**
 * Absence and coverage (PRD §23, ZON-06, GRP-04).
 *
 * The rule the PRD states twice and this module exists to enforce: an absence
 * NEVER changes who owns a customer. It only widens, for a bounded period, who
 * is allowed to act — and it records who acted, so "who looked after my
 * customers while I was away" has an answer.
 *
 * Getting this inverted is the expensive mistake. Reassigning ownership on
 * absence looks like it works, and then the owner comes back to a book of
 * customers that belong to somebody else, with no record of why.
 *
 * Pure functions over rows the caller has already read — no database here, so
 * the rules can be tested without one.
 */

export type AbsenceKind = 'absent' | 'leave' | 'temporarily_unavailable';

/** What the team screen shows against a person's name. */
export type Availability = 'available' | 'absent' | 'leave' | 'temporarily_unavailable';

export interface AbsenceRow {
  id: string;
  userId: string;
  kind: string;
  startsAt: Date;
  endsAt: Date | null;
  endedAt: Date | null;
  coveredByUserIds: string[];
}

/**
 * Is this absence in force at `now`?
 *
 * An absence that was ended early is over regardless of its planned end, and
 * one with no end date runs until somebody ends it — a person who has not come
 * back is still away.
 */
export function isActive(a: AbsenceRow, now: Date = new Date()): boolean {
  if (a.endedAt && a.endedAt.getTime() <= now.getTime()) return false;
  if (a.startsAt.getTime() > now.getTime()) return false;
  if (a.endsAt && a.endsAt.getTime() <= now.getTime()) return false;
  return true;
}

/**
 * The absence in force for a user, if any.
 *
 * Where several overlap — a half-day on top of a week's leave — the one that
 * started most recently wins, because that is the more specific statement.
 */
export function activeAbsenceFor(
  absences: AbsenceRow[],
  userId: string,
  now: Date = new Date(),
): AbsenceRow | null {
  const live = absences.filter((a) => a.userId === userId && isActive(a, now));
  if (live.length === 0) return null;
  return live.reduce((latest, a) => (a.startsAt > latest.startsAt ? a : latest));
}

/** What to show against a person's name right now. */
export function availabilityOf(
  absences: AbsenceRow[],
  userId: string,
  now: Date = new Date(),
): Availability {
  const a = activeAbsenceFor(absences, userId, now);
  if (!a) return 'available';
  const kind = a.kind as AbsenceKind;
  return kind === 'absent' || kind === 'leave' || kind === 'temporarily_unavailable'
    ? kind
    : 'absent';
}

export interface CoverageContext {
  absences: AbsenceRow[];
  /** userId -> the zone ids that user works, for the fallback below. */
  zonesByUser: Map<string, string[]>;
  /** Users with a role senior enough to cover anybody in their zone. */
  supervisorIds?: Set<string>;
}

/**
 * May `candidate` pick up work owned by `owner` right now?
 *
 * True only while the owner is actually away. Naming someone as cover does not
 * grant standing access — that would be a permanent reassignment wearing a
 * different name.
 *
 * Who covers, in order:
 *   1. The people named on the absence, if any were named.
 *   2. Otherwise anyone sharing a zone with the absent owner. "Empty means the
 *      zone" is the sane default: an absence recorded in a hurry should still
 *      let the owner's own team step in.
 * A supervisor covers either way — someone has to be able to act when an
 * absence was logged with nobody named and the zone is one person deep.
 */
export function canCoverFor(
  ctx: CoverageContext,
  ownerUserId: string,
  candidateUserId: string,
  now: Date = new Date(),
): boolean {
  if (ownerUserId === candidateUserId) return false;

  const absence = activeAbsenceFor(ctx.absences, ownerUserId, now);
  if (!absence) return false;

  if (ctx.supervisorIds?.has(candidateUserId)) return true;

  if (absence.coveredByUserIds.length > 0) {
    return absence.coveredByUserIds.includes(candidateUserId);
  }

  const ownerZones = ctx.zonesByUser.get(ownerUserId) ?? [];
  const candidateZones = ctx.zonesByUser.get(candidateUserId) ?? [];
  return ownerZones.some((z) => candidateZones.includes(z));
}

/**
 * Everyone whose work `candidate` may currently pick up.
 *
 * This is what widens an agent's queues while a colleague is away, and what
 * narrows them again the moment the colleague is back — no cleanup job, because
 * the answer is computed rather than stored.
 */
export function coveringFor(
  ctx: CoverageContext,
  candidateUserId: string,
  now: Date = new Date(),
): string[] {
  const absentOwners = new Set(
    ctx.absences.filter((a) => isActive(a, now)).map((a) => a.userId),
  );
  return [...absentOwners].filter((ownerId) =>
    canCoverFor(ctx, ownerId, candidateUserId, now));
}

// ---- Relationship Team (PRD §8) -------------------------------------------

export type RelationshipRole = 'primary' | 'backup' | 'manager';

export interface RelationshipMemberRow {
  contactId: string;
  userId: string;
  role: string;
  position: number;
}

/**
 * May this user act on this customer, ignoring absence?
 *
 * Relationship Team membership is standing access, unlike coverage: a named
 * backup can answer a customer at any time, which is the continuity the PRD
 * asks for in GRP-04 — and it works without that person being a participant in
 * any WhatsApp group.
 */
export function isOnRelationshipTeam(
  members: RelationshipMemberRow[],
  contactId: string,
  userId: string,
): boolean {
  return members.some((m) => m.contactId === contactId && m.userId === userId);
}

/**
 * Sort a customer's team into the order a person would read it.
 *
 * Primary, then backups in their configured order, then the manager. Ordering
 * by role name would put "backup" before "manager" before "primary", which is
 * exactly backwards.
 */
const ROLE_RANK: Record<string, number> = { primary: 0, backup: 1, manager: 2 };

export function sortTeam<T extends { role: string; position: number }>(members: T[]): T[] {
  return [...members].sort((a, b) => {
    const ra = ROLE_RANK[a.role] ?? 9;
    const rb = ROLE_RANK[b.role] ?? 9;
    if (ra !== rb) return ra - rb;
    return a.position - b.position;
  });
}

/** How a team member is described in the UI: "Backup 1", not "backup". */
export function describeRole(role: string, position: number): string {
  if (role === 'primary') return 'Primary';
  if (role === 'manager') return 'Manager';
  return position > 0 ? `Backup ${position}` : 'Backup';
}
