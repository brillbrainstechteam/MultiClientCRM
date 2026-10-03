/**
 * vCard (.vcf) parsing and generation — pure text, no external service.
 * Used for importing phone/Google exports and for exporting the CRM's contacts.
 */

export interface VcfContact {
  name?: string;
  company?: string;
  contactPerson?: string;
  mobile?: string;
  email?: string;
  city?: string;
}

/** Unfold RFC-6350 folded lines (continuation lines start with space/tab). */
function unfold(text: string): string[] {
  const raw = text.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  for (const line of raw) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && out.length) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
}

/** Split "TEL;TYPE=CELL:+91…" into { name:'TEL', params:'TYPE=CELL', value } */
function parseLine(line: string): { field: string; params: string; value: string } | null {
  const colon = line.indexOf(':');
  if (colon === -1) return null;
  const left = line.slice(0, colon);
  const value = line.slice(colon + 1).trim();
  const semi = left.indexOf(';');
  const field = (semi === -1 ? left : left.slice(0, semi)).toUpperCase();
  const params = semi === -1 ? '' : left.slice(semi + 1).toUpperCase();
  return { field, params, value };
}

/**
 * Reverse of esc(). vCard escapes \, comma, semicolon and newline; without
 * this a name like "Shah, Rahul" comes back carrying a literal backslash.
 */
function unesc(v: string): string {
  return v.replace(/\\([\\,;nN])/g, (_m, ch: string) => (ch === 'n' || ch === 'N' ? '\n' : ch));
}

/**
 * Split a structured value (ORG, ADR, N) on its separator, ignoring escaped
 * ones — splitting raw would truncate "Mehta & Sons; Jaipur" at the semicolon.
 */
function splitEscaped(value: string, sep: string): string[] {
  const out: string[] = [];
  let cur = '';
  for (let i = 0; i < value.length; i++) {
    const c = value[i];
    if (c === '\\' && i + 1 < value.length) { cur += c + value[i + 1]; i++; continue; }
    if (c === sep) { out.push(cur); cur = ''; continue; }
    cur += c;
  }
  out.push(cur);
  return out;
}

export function parseVcf(text: string): VcfContact[] {
  const lines = unfold(text);
  const cards: VcfContact[] = [];
  let cur: VcfContact | null = null;
  let preferredTel: string | null = null;

  for (const line of lines) {
    const t = line.trim();
    if (t.toUpperCase() === 'BEGIN:VCARD') { cur = {}; preferredTel = null; continue; }
    if (t.toUpperCase() === 'END:VCARD') {
      if (cur) {
        if (preferredTel && !cur.mobile) cur.mobile = preferredTel;
        if (cur.name || cur.company || cur.mobile) cards.push(cur);
      }
      cur = null; continue;
    }
    if (!cur) continue;
    const p = parseLine(line);
    if (!p) continue;
    switch (p.field) {
      case 'FN': cur.name = unesc(p.value); break;
      case 'N': if (!cur.name) cur.name = splitEscaped(p.value, ';').map(unesc).filter(Boolean).reverse().join(' ').trim(); break;
      case 'ORG': cur.company = unesc(splitEscaped(p.value, ';')[0] ?? '').trim(); break;
      case 'EMAIL': if (!cur.email) cur.email = unesc(p.value); break;
      case 'TEL': {
        // Prefer a CELL/MOBILE number; otherwise keep the first seen.
        if (/CELL|MOBILE/.test(p.params)) cur.mobile = unesc(p.value);
        else if (!preferredTel) preferredTel = unesc(p.value);
        break;
      }
      case 'ADR': {
        // ADR structured: ;;street;locality;region;postal;country
        const parts = splitEscaped(p.value, ';');
        if (parts[3]) cur.city = unesc(parts[3]).trim();
        break;
      }
      default: break;
    }
  }
  return cards;
}

function esc(v: string): string {
  return v.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

export interface ExportableContact {
  name: string;
  company?: string | null;
  contactPerson?: string | null;
  mobile: string;
  email?: string | null;
  city?: string | null;
}

/** Build a multi-card .vcf string from CRM contacts. */
export function buildVcf(contacts: ExportableContact[]): string {
  return contacts
    .map((c) => {
      const lines = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${esc(c.name)}`];
      if (c.company) lines.push(`ORG:${esc(c.company)}`);
      if (c.contactPerson) lines.push(`TITLE:${esc(c.contactPerson)}`);
      if (c.mobile) lines.push(`TEL;TYPE=CELL:${esc(c.mobile)}`);
      if (c.email) lines.push(`EMAIL:${esc(c.email)}`);
      if (c.city) lines.push(`ADR;TYPE=WORK:;;;${esc(c.city)};;;`);
      lines.push('END:VCARD');
      return lines.join('\r\n');
    })
    .join('\r\n');
}
