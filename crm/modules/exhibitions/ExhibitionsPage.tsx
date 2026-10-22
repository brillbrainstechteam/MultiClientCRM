import { useCallback, useEffect, useState } from 'react';
import { Store, Plus, ArrowLeft, UserPlus, Info } from 'lucide-react';
import { PageHeader } from '@crm/components';
import { Badge, Button, Input, Modal, Select, Textarea, type BadgeTone } from '@crm/design-system';
import './ExhibitionsPage.css';

/**
 * Exhibitions and lead capture (PRD §16, §21.6).
 *
 * Nothing existed for this. The part that matters beyond an import is EXH-05:
 * an exhibition contact is a NEW customer, so capture hands them to Marketing
 * for qualification rather than straight to a salesperson — and the screen
 * says so, because a stack of cards vanishing into "contacts" with no visible
 * destination is how exhibition leads go cold.
 */

interface Exhibition {
  id: string; name: string; venue: string | null; city: string | null;
  startsAt: string; endsAt: string | null; status: string; notes: string | null;
  contactCount: number;
}

interface CapturedContact {
  id: string; contactId: string; name: string; company: string | null;
  mobile: string | null; city: string | null;
  captureSource: string; journeyStatus: string;
  channelsUsed: string[]; volumeGrams: number | null; notes: string | null;
}

interface Report {
  captured: number; contacted: number; qualified: number; converted: number;
  notInterested: number; untouched: number; volumeGrams: number;
  conversionPercent: number;
  channelsUsed: Record<string, number>;
  bySource: Record<string, number>;
}

const JOURNEY = [
  { value: 'captured', label: 'Captured' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'active', label: 'Active' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'converted', label: 'Converted' },
  { value: 'not_interested', label: 'Not interested' },
];

const JOURNEY_TONE: Record<string, BadgeTone> = {
  captured: 'neutral', contacted: 'info', active: 'info',
  qualified: 'brand', converted: 'success', not_interested: 'neutral',
};

const SOURCE_LABEL: Record<string, string> = {
  business_card: 'Business card', register: 'Register', import: 'Import', manual: 'Typed in',
};

const grams = (n: number) => (n >= 1000
  ? `${(n / 1000).toLocaleString('en-IN', { maximumFractionDigits: 2 })} kg`
  : `${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })} g`);

export default function ExhibitionsPage() {
  const [list, setList] = useState<Exhibition[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [canEdit, setCanEdit] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/crm/exhibitions', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d: { exhibitions?: Exhibition[]; canEdit?: boolean; error?: string }) => {
        if (d.error) setError(d.error);
        else { setList(d.exhibitions ?? []); setCanEdit(!!d.canEdit); setError(null); }
      })
      .catch(() => setError('Could not load exhibitions.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (openId) {
    return <ExhibitionDetail id={openId} onBack={() => { setOpenId(null); load(); }} />;
  }

  return (
    <div className="ex">
      <PageHeader
        title="Exhibitions"
        description="Shows and fairs, the contacts captured at each, and what became of them."
        actions={canEdit ? <Button variant="primary" iconLeft={<Plus />} onClick={() => setAdding(true)}>Add an exhibition</Button> : undefined}
      />

      {error && <p className="ex__error">{error}</p>}
      {loading && <p className="ex__muted">Loading…</p>}

      {!loading && list.length === 0 && (
        <div className="ex__empty">
          <Store size={40} aria-hidden="true" />
          <h2>No exhibitions yet</h2>
          <p>Add a show, then capture the cards you collect at the stall. New contacts go to Marketing to be qualified.</p>
        </div>
      )}

      {list.length > 0 && (
        <ul className="ex__list">
          {list.map((e) => (
            <li key={e.id} className="ex__card">
              <button className="ex__open" onClick={() => setOpenId(e.id)}>
                <div className="ex__head">
                  <strong>{e.name}</strong>
                  <Badge tone={e.status === 'running' ? 'success' : e.status === 'closed' ? 'neutral' : 'info'}>
                    {e.status}
                  </Badge>
                </div>
                <div className="ex__meta">
                  <span>{new Date(e.startsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  {e.venue && <span>{e.venue}</span>}
                  {e.city && <span>{e.city}</span>}
                  <span className="ex__count">{e.contactCount} contact{e.contactCount === 1 ? '' : 's'}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {adding && <AddExhibition onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load(); }} />}
    </div>
  );
}

function ExhibitionDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const [exhibition, setExhibition] = useState<Exhibition | null>(null);
  const [contacts, setContacts] = useState<CapturedContact[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/crm/exhibitions?id=${id}`, { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d: { exhibition?: Exhibition; contacts?: CapturedContact[]; report?: Report }) => {
        setExhibition(d.exhibition ?? null);
        setContacts(d.contacts ?? []);
        setReport(d.report ?? null);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const move = async (row: CapturedContact, journeyStatus: string) => {
    const res = await fetch('/api/crm/exhibitions/capture', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ id: row.id, journeyStatus }),
    });
    if (res.ok) load();
  };

  return (
    <div className="ex">
      <button className="ex__back" onClick={onBack}><ArrowLeft size={14} /> All exhibitions</button>

      <PageHeader
        title={exhibition?.name ?? 'Exhibition'}
        description={[exhibition?.venue, exhibition?.city].filter(Boolean).join(' · ') || undefined}
        actions={<Button variant="primary" iconLeft={<UserPlus />} onClick={() => setCapturing(true)}>Capture contacts</Button>}
      />

      {report && (
        <section className="ex__summary">
          <Stat label="Captured" value={String(report.captured)} />
          <Stat label="Worked" value={String(report.contacted)} />
          <Stat label="Qualified" value={String(report.qualified)} />
          <Stat label="Converted" value={String(report.converted)} accent />
          <Stat label="Volume" value={grams(report.volumeGrams)} accent />
          <Stat label="Conversion" value={`${report.conversionPercent}%`} />
        </section>
      )}

      {report && report.untouched > 0 && (
        <p className="ex__warn">
          <Info size={14} aria-hidden="true" />
          {report.untouched} contact{report.untouched === 1 ? ' has' : 's have'} not been worked yet.
        </p>
      )}

      {loading && <p className="ex__muted">Loading…</p>}

      {!loading && contacts.length === 0 && (
        <div className="ex__empty">
          <UserPlus size={40} aria-hidden="true" />
          <h2>No contacts captured</h2>
          <p>Add the cards and register entries from the stall. New people go to Marketing to be called and qualified.</p>
        </div>
      )}

      {contacts.length > 0 && (
        <ul className="ex__contacts">
          {contacts.map((c) => (
            <li key={c.id}>
              <div className="ex__who">
                <strong>{c.name}</strong>
                {c.company && <span>{c.company}</span>}
                <Badge tone="neutral">{SOURCE_LABEL[c.captureSource] ?? c.captureSource}</Badge>
              </div>
              <div className="ex__cmeta">
                {c.mobile && <span>{c.mobile}</span>}
                {c.city && <span>{c.city}</span>}
                {c.volumeGrams != null && c.volumeGrams > 0 && <span className="ex__g">{grams(c.volumeGrams)}</span>}
              </div>
              <div className="ex__journey">
                <Badge tone={JOURNEY_TONE[c.journeyStatus] ?? 'neutral'}>
                  {JOURNEY.find((j) => j.value === c.journeyStatus)?.label ?? c.journeyStatus}
                </Badge>
                {/* A conversion is final here: undoing it would erase a sale
                    from every report that counts one. */}
                {c.journeyStatus !== 'converted' && (
                  <Select
                    label="Move to" hideLabel size="sm"
                    value={c.journeyStatus}
                    onChange={(e) => void move(c, e.target.value)}
                    options={JOURNEY}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {capturing && (
        <CaptureContacts exhibitionId={id} onClose={() => setCapturing(false)}
          onSaved={() => { setCapturing(false); load(); }} />
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="ex__stat">
      <span className="ex__statlabel">{label}</span>
      <strong className={accent ? 'ex__accent' : undefined}>{value}</strong>
    </div>
  );
}

function AddExhibition({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [venue, setVenue] = useState('');
  const [city, setCity] = useState('');
  const [startsAt, setStarts] = useState('');
  const [endsAt, setEnds] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const save = async () => {
    if (!name.trim()) { setErr('Give the exhibition a name.'); return; }
    if (!startsAt) { setErr('Pick a start date.'); return; }
    setBusy(true); setErr('');
    try {
      const res = await fetch('/api/crm/exhibitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ name, venue, city, startsAt, endsAt: endsAt || null }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setErr((d as { error?: string }).error ?? 'Could not save.'); return; }
      onSaved();
    } finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title="Add an exhibition"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="primary" onClick={() => void save()} disabled={busy}>{busy ? 'Saving…' : 'Add'}</Button>
        </>
      }>
      <div className="ex__form">
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="IIJS Premiere 2026" />
        <Input label="Venue" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Bombay Exhibition Centre" />
        <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Mumbai" />
        <Input label="Starts" type="date" value={startsAt} onChange={(e) => setStarts(e.target.value)} />
        <Input label="Ends (optional)" type="date" value={endsAt} min={startsAt} onChange={(e) => setEnds(e.target.value)} />
        {err && <p className="ex__error">{err}</p>}
      </div>
    </Modal>
  );
}

/**
 * Capture contacts.
 *
 * One per line, because that is how a stack of cards gets typed up after a
 * show. §16 says to integrate a capture/OCR tool rather than rebuild one, so
 * this takes already-extracted fields; a tool like Card2Leads can post the
 * same shape to the API directly.
 */
function CaptureContacts({ exhibitionId, onClose, onSaved }: {
  exhibitionId: string; onClose: () => void; onSaved: () => void;
}) {
  const [captureSource, setSource] = useState('business_card');
  const [bulk, setBulk] = useState('');
  const [routeToVisit, setRouteToVisit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState<{ added: number; matched: number; skipped: number; goesTo: string } | null>(null);

  const parse = () => bulk.split('\n').map((line) => {
    const [name, mobile, company, city] = line.split(',').map((s) => s.trim());
    return { name, mobile, company, city };
  }).filter((r) => r.name || r.mobile);

  const save = async () => {
    const contacts = parse();
    if (contacts.length === 0) { setErr('Add at least one contact.'); return; }
    setBusy(true); setErr('');
    try {
      const res = await fetch('/api/crm/exhibitions/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ exhibitionId, captureSource, contacts, routeToVisit }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setErr((d as { error?: string }).error ?? 'Could not save.'); return; }
      setResult(d as { added: number; matched: number; skipped: number; goesTo: string });
    } finally { setBusy(false); }
  };

  return (
    <Modal open onClose={result ? onSaved : onClose} title="Capture contacts"
      footer={result
        ? <Button variant="primary" onClick={onSaved}>Done</Button>
        : (
          <>
            <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button variant="primary" onClick={() => void save()} disabled={busy}>
              {busy ? 'Adding…' : 'Add contacts'}
            </Button>
          </>
        )}>
      {result ? (
        <div className="ex__result">
          <p><strong>{result.added}</strong> new contact{result.added === 1 ? '' : 's'} added.</p>
          {result.matched > 0 && <p>{result.matched} already existed and were linked to this exhibition.</p>}
          {result.skipped > 0 && <p className="ex__muted">{result.skipped} skipped — a mobile number is needed.</p>}
          <p className="ex__goesto">{result.goesTo}</p>
        </div>
      ) : (
        <div className="ex__form">
          <Select label="How were these captured" value={captureSource} onChange={(e) => setSource(e.target.value)}
            options={[
              { value: 'business_card', label: 'Business cards' },
              { value: 'register', label: 'Visitor register' },
              { value: 'import', label: 'Imported file' },
              { value: 'manual', label: 'Typed in' },
            ]} />
          <Textarea
            label="Contacts"
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
            rows={8}
            placeholder={'Rahul Shah, 9820000001, Shah Jewellers, Mumbai\nPriya Nair, 9840000002, Nair Gold, Kochi'}
            hint="One per line: name, mobile, company, city. A mobile number is required."
          />
          <label className="ex__check">
            <input type="checkbox" checked={routeToVisit} onChange={(e) => setRouteToVisit(e.target.checked)} />
            <span>Also plan a field visit for each — scheduled a week out, so it appears in the visit plan.</span>
          </label>
          <p className="ex__muted">
            New contacts go to Marketing for qualification before they reach Sales.
          </p>
          {err && <p className="ex__error">{err}</p>}
        </div>
      )}
    </Modal>
  );
}
