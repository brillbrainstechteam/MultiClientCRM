import { useEffect, useState } from 'react';
import { Lock, MapPin, Search, Sparkles } from 'lucide-react';
import { Badge, Button, Checkbox, Input, Select, Toast } from '@crm/design-system';
import { importContacts } from '@crm/app/crm-data';

interface Result { name: string; address: string; phone?: string; mobile: string; existsInCrm: boolean }
interface AiResult { name: string; area: string | null; city: string | null; category: string | null; note: string | null; existsInCrm: boolean }
interface Cost { usd: number; model: string; inputTokens: number; outputTokens: number; searchCalls: number; placesRequests: number }

function CostNote({ cost, label }: { cost: Cost; label: string }) {
  const detail = cost.placesRequests
    ? `${cost.placesRequests} Places request${cost.placesRequests > 1 ? 's' : ''}`
    : `${cost.model} · ${cost.searchCalls} web search · ${cost.inputTokens + cost.outputTokens} tokens`;
  return <p className="crm-prospect__sub" style={{ marginTop: 6 }}>Est. cost this run: <strong>~${cost.usd.toFixed(4)}</strong> · {label} ({detail})</p>;
}

/**
 * Locked, B2B-only Maps prospecting. Finds businesses via the Places API by
 * area/district/city/state (+ optional KM radius), caps the result set, flags
 * which are already in the CRM, and adds the chosen ones as B2B prospects.
 * The lock is enforced server-side; this UI just reflects it.
 */
export function ProspectingPanel() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [keyword, setKeyword] = useState('jewellery wholesalers');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [area, setArea] = useState('');
  const [radiusKm, setRadiusKm] = useState('');
  const [limit, setLimit] = useState('20');
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  // AI discovery (free-text brief → candidate businesses).
  const [cost, setCost] = useState<Cost | null>(null);
  const [brief, setBrief] = useState('');
  const [aiResults, setAiResults] = useState<AiResult[]>([]);
  const [aiPicked, setAiPicked] = useState<Set<number>>(new Set());
  const [aiBusy, setAiBusy] = useState(false);
  const [aiCost, setAiCost] = useState<Cost | null>(null);

  useEffect(() => {
    fetch('/api/crm/prospecting/status', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : { enabled: false }))
      .then((d) => setEnabled(Boolean(d.enabled)))
      .catch(() => setEnabled(false));
  }, []);

  if (enabled === null) return null;

  if (!enabled) {
    return (
      <section className="crm-hub__section">
        <div className="crm-prospect__locked">
          <Lock aria-hidden="true" />
          <div>
            <strong>Find new businesses (Prospecting)</strong>
            <p>A B2B-only, add-on feature — discover businesses on the map and add them as prospects. Not enabled for this account.</p>
          </div>
        </div>
      </section>
    );
  }

  const search = async () => {
    setBusy(true); setResults([]); setPicked(new Set());
    try {
      const res = await fetch('/api/crm/prospecting/search', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({ keyword, state, city, district, area, radiusKm: Number(radiusKm) || undefined, limit: Number(limit) || 20 }),
      });
      const data = await res.json();
      if (!res.ok) { setToast(data.error ?? 'Search failed.'); return; }
      setResults(data.results ?? []);
      setCost(data.cost ?? null);
      if ((data.results ?? []).length === 0) setToast('No businesses found for that search.');
    } catch {
      setToast('Search failed.');
    } finally {
      setBusy(false);
    }
  };

  const toggle = (i: number) => setPicked((prev) => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });

  const addSelected = async () => {
    const rows = [...picked]
      .map((i) => results[i])
      .filter((r) => r && r.mobile)
      .map((r) => ({ company: r.name, name: r.name, mobile: r.mobile, city, state, source: 'Google Maps', customerType: 'b2b' }));
    if (rows.length === 0) { setToast('Select businesses that have a phone number.'); return; }
    setBusy(true);
    try {
      const r = await importContacts(rows, 'skip');
      setToast(`Added ${r.created} prospect(s) · ${r.skipped} already in CRM.`);
      setPicked(new Set());
    } catch {
      setToast('Could not add the selected prospects.');
    } finally {
      setBusy(false);
    }
  };

  const aiToggle = (i: number) => setAiPicked((prev) => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });

  const aiSearch = async () => {
    if (!brief.trim()) { setToast('Describe who you want to find.'); return; }
    setAiBusy(true); setAiResults([]); setAiPicked(new Set());
    try {
      const res = await fetch('/api/crm/prospecting/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ brief }) });
      const data = await res.json();
      if (!res.ok) { setToast(data.error ?? 'Discovery failed.'); return; }
      setAiResults(data.results ?? []);
      setAiCost(data.cost ?? null);
      if ((data.results ?? []).length === 0) setToast('No suggestions for that brief.');
    } catch { setToast('Discovery failed.'); } finally { setAiBusy(false); }
  };

  // AI candidates have no phone yet — create them as prospects through intake
  // (handles no-phone, routes, and dedupes), to enrich later via the pre-call brief.
  const aiAdd = async () => {
    const chosen = [...aiPicked].map((i) => aiResults[i]).filter(Boolean);
    if (chosen.length === 0) { setToast('Select at least one business.'); return; }
    setAiBusy(true);
    let added = 0;
    try {
      for (const r of chosen) {
        const res = await fetch('/api/crm/intake', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
          body: JSON.stringify({ sourceType: 'prospecting', sourceName: 'AI discovery', accountName: r.name, city: r.city ?? '', customerType: 'b2b' }),
        });
        if (res.ok) added += 1;
      }
      setToast(`Added ${added} prospect(s). Open each to run the pre-call brief.`);
      setAiPicked(new Set());
    } finally { setAiBusy(false); }
  };

  return (
    <section className="crm-hub__section">
      {toast ? <Toast tone="success" message={toast} onDismiss={() => setToast(null)} /> : null}
      <h2 className="crm-prospect__title"><MapPin aria-hidden="true" /> Find new businesses (B2B prospecting)</h2>
      <p className="crm-prospect__sub">Search businesses by location.</p>

      <div className="crm-prospect__form">
        <Input label="Business type" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="e.g. jewellery wholesalers" />
        <Input label="State" value={state} onChange={(e) => setState(e.target.value)} placeholder="Rajasthan" />
        <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Jaipur" />
        <Input label="District" value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="Optional" />
        <Input label="Area / market" value={area} onChange={(e) => setArea(e.target.value)} placeholder="Johari Bazaar" />
        <Input label="Radius (km)" value={radiusKm} onChange={(e) => setRadiusKm(e.target.value)} placeholder="Optional" inputMode="numeric" />
        <Select label="Max results" options={[{ value: '10', label: '10' }, { value: '20', label: '20' }]} value={limit} onChange={(e) => setLimit(e.target.value)} />
        <div className="crm-prospect__search">
          <Button variant="primary" iconLeft={<Search />} disabled={busy} onClick={search}>{busy ? 'Searching…' : 'Search'}</Button>
        </div>
      </div>
      {cost ? <CostNote cost={cost} label="Google Places" /> : null}

      {results.length > 0 ? (
        <div className="crm-prospect__results">
          <div className="crm-prospect__results-head">
            <span>{results.length} found · {picked.size} selected</span>
            <Button variant="primary" size="sm" disabled={busy || picked.size === 0} onClick={addSelected}>Add selected as prospects</Button>
          </div>
          <table className="crm-prospect__table">
            <thead><tr><th></th><th>Business</th><th>Phone</th><th>Address</th><th></th></tr></thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i}>
                  <td><Checkbox label="select" hideLabel checked={picked.has(i)} onChange={() => toggle(i)} /></td>
                  <td>{r.name}</td>
                  <td>{r.phone ?? '—'}</td>
                  <td className="crm-prospect__addr">{r.address}</td>
                  <td>{r.existsInCrm ? <Badge tone="neutral">In CRM</Badge> : <Badge tone="success">New</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <h2 className="crm-prospect__title" style={{ marginTop: 28 }}><Sparkles aria-hidden="true" /> Find with AI</h2>
      <p className="crm-prospect__sub">Describe who you want to find — e.g. “22k gold jewellery retailers in Jaipur”.</p>
      <div className="crm-prospect__form">
        <Input label="Describe your target" value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="e.g. bridal jewellery showrooms in South Delhi" />
        <div className="crm-prospect__search">
          <Button variant="primary" iconLeft={<Sparkles />} disabled={aiBusy} onClick={aiSearch}>{aiBusy ? 'Finding…' : 'Find with AI'}</Button>
        </div>
      </div>
      {aiCost ? <CostNote cost={aiCost} label="AI discovery" /> : null}

      {aiResults.length > 0 ? (
        <div className="crm-prospect__results">
          <div className="crm-prospect__results-head">
            <span>{aiResults.length} suggested · {aiPicked.size} selected</span>
            <Button variant="primary" size="sm" disabled={aiBusy || aiPicked.size === 0} onClick={aiAdd}>Add selected as prospects</Button>
          </div>
          <table className="crm-prospect__table">
            <thead><tr><th></th><th>Business</th><th>Location</th><th>Why it fits</th><th></th></tr></thead>
            <tbody>
              {aiResults.map((r, i) => (
                <tr key={i}>
                  <td><Checkbox label="select" hideLabel checked={aiPicked.has(i)} onChange={() => aiToggle(i)} /></td>
                  <td>{r.name}{r.category ? <div style={{ fontSize: 12, color: 'var(--crm-text-muted)' }}>{r.category}</div> : null}</td>
                  <td>{[r.area, r.city].filter(Boolean).join(', ') || '—'}</td>
                  <td className="crm-prospect__addr">{r.note ?? '—'}</td>
                  <td>{r.existsInCrm ? <Badge tone="neutral">In CRM</Badge> : <Badge tone="success">New</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="crm-prospect__sub" style={{ marginTop: 8 }}>AI suggestions have no phone yet — added prospects land in Lead Intake; open each to run the pre-call brief.</p>
        </div>
      ) : null}
    </section>
  );
}
