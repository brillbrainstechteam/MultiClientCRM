import { useEffect, useState } from 'react';
import { Lock, MapPin, Search } from 'lucide-react';
import { Badge, Button, Checkbox, Input, Select, Toast } from '@crm/design-system';
import { importContacts } from '@crm/app/crm-data';

interface Result { name: string; address: string; phone?: string; mobile: string; existsInCrm: boolean }

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

  return (
    <section className="crm-hub__section">
      {toast ? <Toast tone="success" message={toast} onDismiss={() => setToast(null)} /> : null}
      <h2 className="crm-prospect__title"><MapPin aria-hidden="true" /> Find new businesses (B2B prospecting)</h2>
      <p className="crm-prospect__sub">Search businesses by location and add them as prospects. Results are capped and phones checked against your CRM.</p>

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
    </section>
  );
}
