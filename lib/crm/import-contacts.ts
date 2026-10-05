import { prisma } from '@/lib/db';
import { normMobile } from './mobile';
import { mergeTags, parseTags } from './tags';
import { ensureZones, matchZone } from '@/lib/crm/zone-routing';

export type ImportRow = Record<string, unknown>;
export type OnDuplicate = 'skip' | 'update';
export interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
}



const str = (v: unknown) => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v));

/** Map their free-text "Contact Type" / segment labels to our segment codes. */
function normSegment(v: string): string | null {
  const s = v.toLowerCase();
  if (!s) return null;
  if (s.includes('chain')) return 'chain_stores';
  if (s.includes('corporate')) return 'corporate';
  if (s.includes('boutique')) return 'boutique';
  if (s.includes('export')) return 'exports';
  if (s.includes('small')) return 'small_store';
  if (s.includes('standalone') || s.includes('single')) return 'standalone';
  return null;
}
const parseDate = (v: unknown): Date | null => {
  const s = str(v);
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

/**
 * Bulk-import parsed contact rows into a tenant, de-duplicating by mobile.
 * `onDuplicate` = 'skip' leaves existing rows untouched; 'update' merges the
 * incoming fields into the existing contact. Shared by CSV/OCR/vCard/Maps
 * imports and the Google Contacts sync so dedupe behaviour is identical.
 */
export async function importContactRows(
  tenantId: string,
  rows: ImportRow[],
  onDuplicate: OnDuplicate = 'skip',
): Promise<ImportResult> {
  // Existing tags come along so an update can merge rather than overwrite them.
  const existing = await prisma.crmContact.findMany({
    where: { tenantId },
    select: { id: true, mobile: true, tags: true },
  });
  const byMobile = new Map(existing.map((c) => [c.mobile, { id: c.id, tags: c.tags }]));

  // Load zones once so each new row can be routed City→State→Zone→member
  // without a per-row query. Best-effort: if routing fails, import continues.
  const zones = await ensureZones(tenantId).catch(() => []);

  let created = 0, updated = 0, skipped = 0;
  const seen = new Set<string>();

  for (const r of rows) {
    const name = str(r.name || r.Name);
    const mobile = normMobile(str(r.mobile || r.Mobile || r.phone || r.Phone));
    if (!name || !mobile || seen.has(mobile)) { skipped++; continue; }
    seen.add(mobile);

    const src = str(r.source || r.Source) || 'Import';
    const ct = str(r.customerType);
    const fields = {
      name,
      company: str(r.company || r.Company) || null,
      email: str(r.email || r.Email) || null,
      city: str(r.city || r.City) || '—',
      source: src,
      stage: str(r.stage) || 'new',
      consent: str(r.consent) || 'pending',
      salesTier: str(r.salesTier || r.tier) || 'standard',
      ownerId: str(r.ownerId),
      branchId: str(r.branchId) || 'branch_main',
      primaryWhatsAppNumberId: str(r.primaryWhatsAppNumberId),
      createdSource: str(r.importSource) || src,
      // One cell can carry several tags, separated however the client writes them.
      tags: parseTags(r.tags),
      // The client's own columns, kept verbatim rather than dropped.
      ...(r.customFields && typeof r.customFields === 'object' && Object.keys(r.customFields as object).length
        ? { customFields: r.customFields as object }
        : {}),
      // Optional enrichment — only set when the row provides it, so schema
      // defaults (customerType 'b2b') are preserved for plain CSV imports.
      ...(ct === 'b2b' || ct === 'b2c' ? { customerType: ct } : {}),
      ...(str(r.contactPerson || r['Contact Person'] || r['Contact person']) ? { contactPerson: str(r.contactPerson || r['Contact Person'] || r['Contact person']) } : {}),
      // Geography (was previously dropped on import).
      ...(str(r.state || r.State) ? { state: str(r.state || r.State) } : {}),
      ...(str(r.zone || r.Zone) ? { zone: str(r.zone || r.Zone) } : {}),
      ...(str(r.pincode || r.Pincode || r.pin || r.Pin) ? { pincode: str(r.pincode || r.Pincode || r.pin || r.Pin) } : {}),
      ...(str(r.gstin || r.GSTIN || r.GST) ? { gstin: str(r.gstin || r.GSTIN || r.GST) } : {}),
      // Jewellery enrichment (their Excel column names as aliases).
      ...(normSegment(str(r.businessSegment || r.segment || r['Business Segment'] || r['Contact Type'] || r['Type of customer'] || r.Type)) ? { businessSegment: normSegment(str(r.businessSegment || r.segment || r['Business Segment'] || r['Contact Type'] || r['Type of customer'] || r.Type)) } : {}),
      ...(str(r.grade || r.Grade || r['A/B/C/D'] || r.ABCD) ? { grade: str(r.grade || r.Grade || r['A/B/C/D'] || r.ABCD).toUpperCase().slice(0, 1) } : {}),
      ...(str(r.preferredLanguage || r['Preferred Language'] || r.language || r.Language) ? { preferredLanguage: str(r.preferredLanguage || r['Preferred Language'] || r.language || r.Language) } : {}),
      ...(str(r.website || r.Website) ? { website: str(r.website || r.Website) } : {}),
      ...(str(r.clientCode || r['Client Code']) ? { clientCode: str(r.clientCode || r['Client Code']) } : {}),
      ...(str(r.pan || r.PAN) ? { pan: str(r.pan || r.PAN) } : {}),
      ...(str(r.interestedIn || r['Interested In'] || r['Enquired Category']) ? { interestedIn: str(r.interestedIn || r['Interested In'] || r['Enquired Category']) } : {}),
      ...(parseDate(r.dateOfBirth || r.DOB || r.dob || r.Birthday) ? { dateOfBirth: parseDate(r.dateOfBirth || r.DOB || r.dob || r.Birthday) } : {}),
      ...(parseDate(r.companyAnniversary || r['Company Anniversary'] || r.anniversary || r['Company anniversary']) ? { companyAnniversary: parseDate(r.companyAnniversary || r['Company Anniversary'] || r.anniversary || r['Company anniversary']) } : {}),
      ...(parseDate(r.nextFollowUpAt || r['Next Follow Up'] || r.nextFollowUp) ? { nextFollowUpAt: parseDate(r.nextFollowUpAt || r['Next Follow Up'] || r.nextFollowUp) } : {}),
    };

    const dup = byMobile.get(mobile);
    if (dup) {
      if (onDuplicate === 'update') {
        // Tags are additive: an import should never drop labels the team already
        // applied to a contact.
        await prisma.crmContact.update({
          where: { id: dup.id },
          data: { ...fields, tags: mergeTags(dup.tags, fields.tags), lastActivityAt: new Date() },
        });
        updated++;
      } else skipped++;
      continue;
    }
    // Zone-based auto-assignment for brand-new contacts without an explicit
    // owner: map location to a zone, set the zone name, and assign to the zone's
    // member when exactly one covers it.
    const createFields: Record<string, unknown> = { ...fields };
    if (!createFields.ownerId && zones.length) {
      const z = matchZone(zones, str(createFields.city), (createFields.state as string) ?? null);
      if (z) {
        if (!createFields.zone) createFields.zone = z.name;
        if (z.memberUserIds.length === 1) createFields.ownerId = z.memberUserIds[0];
      }
    }
    await prisma.crmContact.create({
      data: { id: `contact_${Math.random().toString(36).slice(2, 10)}`, tenantId, mobile, ...createFields } as never,
    });
    byMobile.set(mobile, { id: 'new', tags: fields.tags });
    created++;
  }

  return { created, updated, skipped };
}
