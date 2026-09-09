import { useEffect, useState, type ReactNode } from 'react';
import { Sparkles, RefreshCw, ExternalLink } from 'lucide-react';
import { Badge, Button, type BadgeTone } from '@crm/design-system';

interface Kundli {
  companyOverview: string; industry: string; sizeEstimate: string;
  productsServices: string[];
  onlinePresence: { website?: string; socials?: string[] };
  recentSignals: string[]; likelyNeeds: string[]; talkingPoints: string[];
  suggestedScript: { opening: string; discoveryQuestions: string[]; valuePitch: string; objectionHandling: string[] };
  bestTimeOrChannel: string; risksNotes: string[];
  confidence: 'low' | 'medium' | 'high'; sources: string[]; generatedWith: string;
}

const CONF_TONE: Record<string, BadgeTone> = { low: 'warning', medium: 'info', high: 'success' };

/**
 * Pre-call brief ("Kundli") — AI-researched company dossier + call script, so
 * the rep is prepared before dialing. Fetches the cached dossier and offers a
 * generate/refresh action that researches the company online.
 */
export function KundliPanel({ contactId }: { contactId: string }) {
  const [kundli, setKundli] = useState<Kundli | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/crm/contacts/${contactId}/kundli`, { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d) { setKundli(d.kundli ?? null); setGeneratedAt(d.generatedAt ?? null); } })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [contactId]);

  const generate = async () => {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/crm/contacts/${contactId}/kundli`, { method: 'POST', credentials: 'same-origin' });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(String(d.error ?? 'Could not generate the brief.')); return; }
      setKundli(d.kundli ?? null); setGeneratedAt(d.generatedAt ?? null);
    } catch {
      setError('Could not generate the brief.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p style={sx.muted}>Loading…</p>;

  if (!kundli) {
    return (
      <div style={sx.empty}>
        <Sparkles size={28} style={{ color: 'var(--crm-text-brand, #2f6bff)' }} />
        <p style={sx.emptyTitle}>No pre-call brief yet</p>
        <p style={sx.muted}>Research this company online and generate a call-ready dossier with talking points and a script.</p>
        <Button variant="primary" iconLeft={<Sparkles size={16} />} disabled={busy} onClick={generate}>
          {busy ? 'Researching…' : 'Generate pre-call brief'}
        </Button>
        {error ? <p style={sx.error}>{error}</p> : null}
      </div>
    );
  }

  const s = kundli.suggestedScript;
  return (
    <div style={sx.wrap}>
      <div style={sx.head}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Badge tone={CONF_TONE[kundli.confidence] ?? 'neutral'}>Confidence: {kundli.confidence}</Badge>
          <span style={sx.muted}>
            {generatedAt ? `Generated ${new Date(generatedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}
            {kundli.generatedWith ? ` · ${kundli.generatedWith}` : ''}
          </span>
        </div>
        <Button variant="secondary" size="sm" iconLeft={<RefreshCw size={14} />} disabled={busy} onClick={generate}>
          {busy ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>
      {error ? <p style={sx.error}>{error}</p> : null}

      <Section title="Company overview"><p style={sx.p}>{kundli.companyOverview}</p></Section>
      <div style={sx.metaRow}>
        <Meta label="Industry" value={kundli.industry} />
        <Meta label="Size" value={kundli.sizeEstimate} />
        <Meta label="Best time / channel" value={kundli.bestTimeOrChannel || '—'} />
        {kundli.onlinePresence.website ? <Meta label="Website" value={kundli.onlinePresence.website} link /> : null}
      </div>

      <ListSection title="Products / services" items={kundli.productsServices} />
      <ListSection title="Recent signals" items={kundli.recentSignals} />
      <ListSection title="Likely needs" items={kundli.likelyNeeds} />
      <ListSection title="Talking points" items={kundli.talkingPoints} />

      <Section title="Suggested call script">
        {s.opening ? <p style={sx.p}><strong>Opening: </strong>{s.opening}</p> : null}
        {s.discoveryQuestions.length ? (<><p style={sx.subLabel}>Discovery questions</p><ul style={sx.ul}>{s.discoveryQuestions.map((q, i) => <li key={i}>{q}</li>)}</ul></>) : null}
        {s.valuePitch ? <p style={sx.p}><strong>Value pitch: </strong>{s.valuePitch}</p> : null}
        {s.objectionHandling.length ? (<><p style={sx.subLabel}>Objection handling</p><ul style={sx.ul}>{s.objectionHandling.map((q, i) => <li key={i}>{q}</li>)}</ul></>) : null}
      </Section>

      <ListSection title="Risks / notes" items={kundli.risksNotes} />

      {kundli.sources.length ? (
        <Section title="Sources">
          <ul style={sx.ul}>
            {kundli.sources.map((u, i) => (
              <li key={i}>{/^https?:\/\//.test(u)
                ? <a href={u} target="_blank" rel="noopener noreferrer" style={sx.link}>{u} <ExternalLink size={11} /></a>
                : u}</li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section style={sx.section}><h3 style={sx.h3}>{title}</h3>{children}</section>;
}
function ListSection({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return <Section title={title}><ul style={sx.ul}>{items.map((it, i) => <li key={i}>{it}</li>)}</ul></Section>;
}
function Meta({ label, value, link }: { label: string; value: string; link?: boolean }) {
  return (
    <div style={sx.meta}>
      <span style={sx.metaLabel}>{label}</span>
      {link && /^https?:\/\//.test(value)
        ? <a href={value} target="_blank" rel="noopener noreferrer" style={sx.link}>{value}</a>
        : <span style={sx.metaValue}>{value}</span>}
    </div>
  );
}

const sx: Record<string, React.CSSProperties> = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 14 },
  head: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  section: { display: 'flex', flexDirection: 'column', gap: 6 },
  h3: { fontSize: 13, fontWeight: 600, color: 'var(--crm-text-title, #1b2733)', margin: 0, textTransform: 'uppercase', letterSpacing: 0.3 },
  subLabel: { fontSize: 12, fontWeight: 600, color: 'var(--crm-text-muted, #6b7a88)', margin: '6px 0 2px' },
  p: { margin: 0, fontSize: 14, lineHeight: 1.5, color: 'var(--crm-text-primary, #2b3948)' },
  ul: { margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14, lineHeight: 1.5, color: 'var(--crm-text-primary, #2b3948)' },
  metaRow: { display: 'flex', flexWrap: 'wrap', gap: 16 },
  meta: { display: 'flex', flexDirection: 'column' },
  metaLabel: { fontSize: 11, color: 'var(--crm-text-muted, #6b7a88)', textTransform: 'uppercase', letterSpacing: 0.3 },
  metaValue: { fontSize: 14, color: 'var(--crm-text-primary, #2b3948)' },
  muted: { fontSize: 12, color: 'var(--crm-text-muted, #6b7a88)', margin: 0 },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, padding: 20, borderRadius: 12, background: 'var(--crm-bg-subtle, #f6f8fa)', border: '1px dashed var(--crm-border, #d7dee6)', maxWidth: 520 },
  emptyTitle: { fontWeight: 600, margin: 0, color: 'var(--crm-text-title, #1b2733)' },
  error: { fontSize: 13, color: 'var(--crm-text-danger, #c0392b)', margin: 0 },
  link: { display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--crm-text-brand, #2f6bff)', textDecoration: 'none' },
};
