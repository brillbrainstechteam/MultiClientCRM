import { useState } from 'react';
import { Check, ShieldCheck, Phone, FileText, Video, MonitorPlay, MapPin, Building2, Megaphone, ClipboardList, Star } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { updateContact } from '@crm/app/crm-data';
import type { Contact } from '@crm/mock-data';
import './ProspectJourney.css';

/** The prospect touchpoint sequence from the Prospects Tracker. Editable steps
 *  stamp a date when marked done; the last two are derived from the pipeline. */
const STEPS: { key: string; label: string; hint: string; icon: LucideIcon }[] = [
  { key: 'dataVerified', label: 'Data verified', hint: 'Number & details confirmed', icon: ShieldCheck },
  { key: 'introCall', label: 'Intro call done', hint: 'First outreach call', icon: Phone },
  { key: 'digitalCollateral', label: 'Digital collateral shared', hint: 'Profile / brochure sent on WhatsApp', icon: FileText },
  { key: 'videoCall', label: 'Video call done', hint: 'Product showcase over video', icon: Video },
  { key: 'virtualMeeting', label: 'Virtual meeting done', hint: 'Scheduled online meeting', icon: MonitorPlay },
  { key: 'fieldVisit', label: 'Field visit done', hint: 'Visited at their location', icon: MapPin },
  { key: 'officeVisit', label: 'Office visit done', hint: 'They visited your office', icon: Building2 },
  { key: 'marketingCollateral', label: 'Marketing collateral sent', hint: 'Catalogue / campaign material', icon: Megaphone },
];
const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null);

export function ProspectJourney({ contact }: { contact: Contact }) {
  const [journey, setJourney] = useState<Record<string, string | null>>(contact.journey ?? {});
  const [busy, setBusy] = useState<string | null>(null);
  const jp = (contact.jewelleryProfile ?? {}) as Record<string, unknown>;
  const [welcomeKit, setWelcomeKit] = useState<boolean>(!!jp.welcomeKitSent);
  const [broadcast, setBroadcast] = useState<boolean>(!!contact.inBroadcastList);

  const toggle = async (key: string) => {
    const done = !journey[key];
    const nextVal = done ? new Date().toISOString() : null;
    const optimistic = { ...journey, [key]: nextVal };
    setJourney(optimistic); setBusy(key);
    try {
      await updateContact(contact.id, { jewelleryProfile: { journey: { [key]: nextVal } } } as Partial<Contact>);
    } catch {
      setJourney(journey); // revert
    } finally { setBusy(null); }
  };

  const setWelcome = async (v: boolean) => {
    setWelcomeKit(v);
    try { await updateContact(contact.id, { jewelleryProfile: { welcomeKitSent: v ? new Date().toISOString() : null } } as Partial<Contact>); } catch { setWelcomeKit(!v); }
  };
  const setBroadcastFlag = async (v: boolean) => {
    setBroadcast(v);
    try { await updateContact(contact.id, { inBroadcastList: v } as Partial<Contact>); } catch { setBroadcast(!v); }
  };
  const daysToActivate = contact.activatedAt && contact.createdAt
    ? Math.max(0, Math.round((new Date(contact.activatedAt).getTime() - new Date(contact.createdAt).getTime()) / 864e5))
    : null;

  const doneCount = STEPS.filter((s) => journey[s.key]).length;
  const enquiryDone = contact.leadStatus === 'enquiry_generated';
  const activated = !!contact.activatedAt || contact.lifecycleStage === 'customer';
  const derived = [
    { label: 'Enquiry received', hint: 'Handed to sales', icon: ClipboardList, done: enquiryDone, date: null as string | null },
    { label: 'Active customer', hint: 'Order received / activated', icon: Star, done: activated, date: contact.activatedAt ?? null },
  ];
  const pct = Math.round(((doneCount + derived.filter((d) => d.done).length) / (STEPS.length + derived.length)) * 100);

  return (
    <div className="pj">
      <div className="pj-head">
        <div>
          <h3 className="pj-title">Prospect journey</h3>
          <p className="pj-sub">{doneCount}/{STEPS.length} touchpoints done · overall {pct}%</p>
        </div>
        <div className="pj-progress" aria-label={`${pct}% complete`}><span style={{ width: `${pct}%` }} /></div>
      </div>

      <ol className="pj-steps">
        {STEPS.map((s) => {
          const date = fmt(journey[s.key]);
          const on = !!journey[s.key];
          const Icon = s.icon;
          return (
            <li key={s.key} className={`pj-step${on ? ' pj-step--on' : ''}`}>
              <button className="pj-check" onClick={() => toggle(s.key)} disabled={busy === s.key} aria-pressed={on} title={on ? 'Mark not done' : 'Mark done'}>
                {on ? <Check size={15} /> : null}
              </button>
              <span className="pj-ic"><Icon size={16} /></span>
              <div className="pj-step__body">
                <strong>{s.label}</strong>
                <span>{date ? `Done · ${date}` : s.hint}</span>
              </div>
            </li>
          );
        })}
        {derived.map((d) => {
          const Icon = d.icon;
          return (
            <li key={d.label} className={`pj-step pj-step--derived${d.done ? ' pj-step--on' : ''}`}>
              <span className="pj-check pj-check--auto">{d.done ? <Check size={15} /> : null}</span>
              <span className="pj-ic"><Icon size={16} /></span>
              <div className="pj-step__body">
                <strong>{d.label}</strong>
                <span>{d.done ? (fmt(d.date) ? `Done · ${fmt(d.date)}` : 'Done') : d.hint}</span>
              </div>
            </li>
          );
        })}
      </ol>

      <div className={`pj-activation${activated ? ' pj-activation--on' : ''}`}>
        <div className="pj-activation__head">
          <Star size={16} />
          <div>
            <strong>{activated ? 'Active customer' : 'Not yet activated'}</strong>
            <span>{activated ? `Activated ${fmt(contact.activatedAt) ?? ''}${daysToActivate !== null ? ` · ${daysToActivate} day${daysToActivate === 1 ? '' : 's'} to activate` : ''}` : 'Activates automatically when an enquiry is won.'}</span>
          </div>
        </div>
        <div className="pj-activation__toggles">
          <label className="pj-toggle"><input type="checkbox" checked={welcomeKit} onChange={(e) => setWelcome(e.target.checked)} /> Welcome kit sent</label>
          <label className="pj-toggle"><input type="checkbox" checked={broadcast} onChange={(e) => setBroadcastFlag(e.target.checked)} /> Added to broadcast list</label>
        </div>
      </div>

      <p className="pj-note">Tap a step to record it. Enquiry &amp; activation update automatically as the deal progresses.</p>
    </div>
  );
}
