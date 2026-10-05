/**
 * Tag parsing shared by the importer and the import wizard, so a cell and a
 * preview agree on how many tags a contact ends up with. Pure — no database.
 */

/**
 * Split one cell into tags. Accepts comma, semicolon, pipe or newline, because
 * people type whichever they are used to; inside a CSV a comma is only ever
 * seen here when the cell was quoted, so splitting on it is safe.
 *
 * Trims, drops blanks, and de-duplicates case-insensitively while keeping the
 * first spelling the user wrote ("VIP" and "vip" are one tag, not two).
 */
export function parseTags(value: unknown): string[] {
  const raw = String(value ?? '').trim();
  if (!raw) return [];

  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[,;|\r\n]+/)) {
    const tag = part.trim();
    if (!tag) continue;
    const k = tag.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(tag);
  }
  return out;
}

/** Combine existing tags with incoming ones, keeping both sides, no duplicates. */
export function mergeTags(existing: string[] | null | undefined, incoming: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tag of [...(existing ?? []), ...incoming]) {
    const k = tag.trim().toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(tag.trim());
  }
  return out;
}
