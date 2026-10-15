import { useCallback, useEffect, useState } from 'react';
import { Phone, PhoneOff, RefreshCw, Trash2, Plus, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@crm/components';
import { Badge, Button, Input, Select, Toggle } from '@crm/design-system';
import './CallingSettings.css';

/**
 * Settings → WhatsApp → Calling (Part 2 doc §5.1).
 *
 * The shop sees "Customers can call us" and its own opening hours. Meta's
 * `call_icon_visibility`, `callback_permission_status` and
 * `weekly_operating_hours` never appear on screen — the API route does that
 * translation, and this screen is deliberately ignorant of it.
 *
 * Nothing here is optimistic. Calling settings are pushed to Meta first and the
 * screen only moves once Meta has agreed, because a toggle that says calling is
 * on while WhatsApp has it off produces a Call button that fails.
 */

interface DayHours { day: number; open: string; close: string }
interface Holiday { date: string; name?: string }

interface CallingSettings {
  enabled: boolean;
  callIconVisible: boolean;
  inboundEnabled: boolean;
  outboundEnabled: boolean;
  timezone: string;
  businessHours: DayHours[];
  holidays: Holiday[];
  afterHoursBehaviour: string;
  afterHoursMessage: string | null;
  recordingEnabled: boolean;
  recordingConsentText: string | null;
  recordingRetentionDays: number;
  transcriptionEnabled: boolean;
  metaCallingStatus: string | null;
  restrictionReason: string | null;
  callQuality: string | null;
  syncedAt: string | null;
  openNow: boolean;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const TIMEZONES = [
  'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 'America/New_York',
];

const AFTER_HOURS = [
  { value: 'voicemail', label: 'Take a voicemail' },
  { value: 'decline_with_message', label: 'Decline politely' },
  { value: 'ring_anyway', label: 'Ring us anyway' },
];

/** What a shop would say its week looks like, if it has not told us yet. */
function defaultHours(): DayHours[] {
  return [1, 2, 3, 4, 5, 6].map((day) => ({ day, open: '10:00', close: '19:00' }));
}

/** "Mon–Sat 10:00 AM–7:00 PM", collapsing a run of identical days. */
function summariseHours(days: DayHours[]): string {
  if (days.length === 0) return 'Any time';
  const sorted = [...days].sort((a, b) => a.day - b.day);
  const sameTimes = sorted.every((d) => d.open === sorted[0].open && d.close === sorted[0].close);
  const contiguous = sorted.every((d, i) => i === 0 || d.day === sorted[i - 1].day + 1);

  const time = `${pretty(sorted[0].open)}–${pretty(sorted[0].close)}`;
  if (sameTimes && contiguous && sorted.length > 1) {
    return `${DAY_SHORT[sorted[0].day]}–${DAY_SHORT[sorted[sorted.length - 1].day]} ${time}`;
  }
  if (sameTimes) return `${sorted.map((d) => DAY_SHORT[d.day]).join(', ')} ${time}`;
  return sorted.map((d) => `${DAY_SHORT[d.day]} ${pretty(d.open)}–${pretty(d.close)}`).join(', ');
}

function pretty(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

export default function CallingSettingsScreen() {
  const [settings, setSettings] = useState<CallingSettings | null>(null);
  const [number, setNumber] = useState<{ displayPhone: string | null; verifiedName: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/crm/whatsapp/calling/settings', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d: { settings?: CallingSettings; number?: typeof number; error?: string }) => {
        if (d.error) setError(d.error);
        else { setSettings(d.settings ?? null); setNumber(d.number ?? null); setError(null); }
      })
      .catch(() => setError('Could not load calling settings.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  /**
   * Save, then take Meta's word for what the settings now are.
   *
   * The local state is not updated until the server replies, so a rejected
   * change leaves the screen showing what is actually true rather than what
   * the operator hoped for.
   */
  const save = useCallback(async (patch: Partial<CallingSettings>) => {
    if (!settings) return;
    setSaving(true); setError(null); setNotice(null);
    try {
      const res = await fetch('/api/crm/whatsapp/calling/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ ...settings, ...patch }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError((d as { error?: string }).error ?? 'The change could not be saved.'); return; }
      setSettings((d as { settings: CallingSettings }).settings);
      setNotice('Saved.');
    } finally {
      setSaving(false);
    }
  }, [settings]);

  const sync = useCallback(async () => {
    setSaving(true); setError(null);
    try {
      const res = await fetch('/api/crm/whatsapp/calling/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({}),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError((d as { error?: string }).error ?? 'Could not read WhatsApp.'); return; }
      setSettings((d as { settings: CallingSettings }).settings);
      setNotice('Updated from WhatsApp.');
    } finally {
      setSaving(false);
    }
  }, []);

  if (loading) return <div className="wa-call"><p className="wa-call__muted">Loading…</p></div>;

  if (!settings) {
    return (
      <div className="wa-call">
        <PageHeader title="WhatsApp Calling" description="Let customers reach you by voice inside WhatsApp." />
        <p className="wa-call__error">{error ?? 'No connected WhatsApp number.'}</p>
      </div>
    );
  }

  const hours = settings.businessHours.length ? settings.businessHours : [];
  const setHours = (next: DayHours[]) => void save({ businessHours: next });

  const toggleDay = (day: number) => {
    const has = hours.some((h) => h.day === day);
    setHours(has
      ? hours.filter((h) => h.day !== day)
      : [...hours, { day, open: '10:00', close: '19:00' }].sort((a, b) => a.day - b.day));
  };

  const setDayTime = (day: number, field: 'open' | 'close', value: string) => {
    setHours(hours.map((h) => (h.day === day ? { ...h, [field]: value } : h)));
  };

  return (
    <div className="wa-call">
      <PageHeader
        title="WhatsApp Calling"
        description={number?.displayPhone
          ? `Voice calls on ${number.displayPhone}${number.verifiedName ? ` · ${number.verifiedName}` : ''}.`
          : 'Let customers reach you by voice inside WhatsApp.'}
        actions={
          <Button variant="secondary" size="sm" iconLeft={<RefreshCw />} onClick={() => void sync()} disabled={saving}>
            Check with WhatsApp
          </Button>
        }
      />

      {/* A restriction has to be visible here, not discovered by an agent whose
          calls keep failing. */}
      {settings.restrictionReason && (
        <div className="wa-call__alert">
          <AlertTriangle size={16} aria-hidden="true" />
          <div>
            <strong>WhatsApp has restricted calling on this number</strong>
            <p>{settings.restrictionReason}</p>
          </div>
        </div>
      )}

      {error && <p className="wa-call__error">{error}</p>}
      {notice && !error && <p className="wa-call__notice">{notice}</p>}

      <section className="wa-call__card">
        <div className="wa-call__row">
          <div className="wa-call__rowtext">
            <strong>WhatsApp Calling</strong>
            <span>Turning this off stops calls in both directions.</span>
          </div>
          <Toggle
            checked={settings.enabled}
            onChange={(v) => void save({ enabled: v })}
            disabled={saving}
            label="WhatsApp Calling"
            hideLabel
          />
        </div>

        <div className={`wa-call__group${settings.enabled ? '' : ' wa-call__group--off'}`}>
          <div className="wa-call__row">
            <div className="wa-call__rowtext">
              <strong>Customers can call us</strong>
              <span>Shows the call button on your WhatsApp profile, and lets call links and QR codes work.</span>
            </div>
            <Toggle
              checked={settings.inboundEnabled}
              onChange={(v) => void save({ inboundEnabled: v })}
              disabled={saving || !settings.enabled}
              label="Customers can call us"
              hideLabel
            />
          </div>

          <div className="wa-call__row">
            <div className="wa-call__rowtext">
              <strong>We can call customers</strong>
              <span>Only after each customer gives permission. Your team asks from the inbox.</span>
            </div>
            <Toggle
              checked={settings.outboundEnabled}
              onChange={(v) => void save({ outboundEnabled: v })}
              disabled={saving || !settings.enabled}
              label="We can call customers"
              hideLabel
            />
          </div>
        </div>
      </section>

      <section className={`wa-call__card${settings.enabled ? '' : ' wa-call__group--off'}`}>
        <header className="wa-call__head">
          <div>
            <h2>Calling hours</h2>
            <p>{hours.length ? summariseHours(hours) : 'Customers can call any time.'}</p>
          </div>
          <Badge tone={settings.openNow ? 'success' : 'neutral'}>
            {settings.openNow ? <><Phone size={11} /> Open now</> : <><PhoneOff size={11} /> Closed now</>}
          </Badge>
        </header>

        <div className="wa-call__days">
          {DAY_NAMES.map((name, day) => {
            const row = hours.find((h) => h.day === day);
            return (
              <div key={day} className={`wa-call__day${row ? '' : ' wa-call__day--closed'}`}>
                <label className="wa-call__daytoggle">
                  <input
                    type="checkbox"
                    checked={Boolean(row)}
                    onChange={() => toggleDay(day)}
                    disabled={saving || !settings.enabled}
                  />
                  <span>{name}</span>
                </label>
                {row ? (
                  <div className="wa-call__times">
                    <input
                      type="time" value={row.open} disabled={saving}
                      onChange={(e) => setDayTime(day, 'open', e.target.value)}
                      aria-label={`${name} opening time`}
                    />
                    <span>to</span>
                    <input
                      type="time" value={row.close} disabled={saving}
                      onChange={(e) => setDayTime(day, 'close', e.target.value)}
                      aria-label={`${name} closing time`}
                    />
                  </div>
                ) : (
                  <span className="wa-call__closed">Closed</span>
                )}
              </div>
            );
          })}
        </div>

        <div className="wa-call__fields">
          <Select
            label="These times are in"
            value={settings.timezone}
            onChange={(e) => void save({ timezone: e.target.value })}
            disabled={saving || !settings.enabled}
            options={TIMEZONES.map((tz) => ({ value: tz, label: tz.replace('_', ' ') }))}
            hint="Your shop's own clock, not the server's."
          />
          <Select
            label="When someone calls outside these hours"
            value={settings.afterHoursBehaviour}
            onChange={(e) => void save({ afterHoursBehaviour: e.target.value })}
            disabled={saving || !settings.enabled}
            options={AFTER_HOURS}
          />
        </div>

        <HolidayList
          holidays={settings.holidays}
          disabled={saving || !settings.enabled}
          onChange={(next) => void save({ holidays: next })}
        />
      </section>

      <section className={`wa-call__card${settings.enabled ? '' : ' wa-call__group--off'}`}>
        <header className="wa-call__head">
          <div>
            <h2>Recording and notes</h2>
            <p>Off until you have decided what you tell customers and how long you keep it.</p>
          </div>
        </header>

        <div className="wa-call__row">
          <div className="wa-call__rowtext">
            <strong>Record calls</strong>
            <span>Customers must be told. Add the announcement below before switching this on.</span>
          </div>
          <Toggle
            checked={settings.recordingEnabled}
            onChange={(v) => void save({ recordingEnabled: v })}
            disabled={saving || !settings.enabled || !settings.recordingConsentText?.trim()}
            label="Record calls"
            hideLabel
          />
        </div>

        <div className="wa-call__fields">
          <Input
            label="What customers hear when recording starts"
            defaultValue={settings.recordingConsentText ?? ''}
            onBlur={(e) => {
              if (e.target.value !== (settings.recordingConsentText ?? '')) {
                void save({ recordingConsentText: e.target.value });
              }
            }}
            disabled={saving || !settings.enabled}
            placeholder="This call is recorded to help us serve you better."
            hint="Required before recording can be switched on."
          />
          <Input
            label="Keep recordings for"
            type="number"
            defaultValue={String(settings.recordingRetentionDays)}
            onBlur={(e) => {
              const n = Number(e.target.value);
              if (n > 0 && n !== settings.recordingRetentionDays) void save({ recordingRetentionDays: n });
            }}
            disabled={saving || !settings.enabled}
            hint="Days. Recordings are deleted after this."
          />
        </div>

        <div className="wa-call__row">
          <div className="wa-call__rowtext">
            <strong>Write up what was said</strong>
            <span>Turns a recorded call into a transcript and a short summary on the customer's timeline.</span>
          </div>
          <Toggle
            checked={settings.transcriptionEnabled}
            onChange={(v) => void save({ transcriptionEnabled: v })}
            disabled={saving || !settings.enabled || !settings.recordingEnabled}
            label="Write up what was said"
            hideLabel
          />
        </div>
      </section>

      {settings.syncedAt && (
        <p className="wa-call__muted">
          Last checked with WhatsApp {new Date(settings.syncedAt).toLocaleString('en-IN')}
          {settings.metaCallingStatus ? ` · WhatsApp says ${settings.metaCallingStatus.toLowerCase()}` : ''}
        </p>
      )}
    </div>
  );
}

/** Dates the shop is shut regardless of its weekly hours. */
function HolidayList({
  holidays, disabled, onChange,
}: {
  holidays: Holiday[];
  disabled: boolean;
  onChange: (next: Holiday[]) => void;
}) {
  const [date, setDate] = useState('');
  const [name, setName] = useState('');

  const add = () => {
    if (!date) return;
    if (holidays.some((h) => h.date === date)) return;
    onChange([...holidays, { date, name: name.trim() || undefined }].sort((a, b) => a.date.localeCompare(b.date)));
    setDate(''); setName('');
  };

  return (
    <div className="wa-call__holidays">
      <h3>Days you are closed</h3>
      {holidays.length === 0 && <p className="wa-call__muted">No holidays added.</p>}
      <ul>
        {holidays.map((h) => (
          <li key={h.date}>
            <span>{new Date(`${h.date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            {h.name && <em>{h.name}</em>}
            <button
              type="button"
              aria-label={`Remove ${h.name ?? h.date}`}
              disabled={disabled}
              onClick={() => onChange(holidays.filter((x) => x.date !== h.date))}
            >
              <Trash2 size={13} />
            </button>
          </li>
        ))}
      </ul>
      {/* WhatsApp accepts twenty dates, so the control stops offering more. */}
      {holidays.length < 20 && (
        <div className="wa-call__addholiday">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={disabled} aria-label="Holiday date" />
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Diwali" disabled={disabled} aria-label="Holiday name" />
          <Button variant="secondary" size="sm" iconLeft={<Plus />} onClick={add} disabled={disabled || !date}>Add</Button>
        </div>
      )}
    </div>
  );
}
