'use client';

import { useRef, useState, useEffect } from 'react';

/**
 * Public lead form (client). Speech-to-text per field via the browser's built-in
 * SpeechRecognition — a mic button dictates into any text field, with typing
 * always available. Fields follow the tenant's B2B/B2C mode.
 */

type Mode = 'b2b' | 'b2c';

interface FieldDef {
  key: string;
  label: string;
  type?: 'text' | 'tel' | 'email' | 'textarea';
  placeholder?: string;
  voice?: boolean; // show the mic
  required?: boolean;
}

const B2C_FIELDS: FieldDef[] = [
  { key: 'name', label: 'Your name', voice: true, required: true, placeholder: 'e.g. Ananya Sharma' },
  { key: 'mobile', label: 'Mobile number', type: 'tel', required: true, placeholder: '+91 98XXXXXXXX' },
  { key: 'city', label: 'City', voice: true, placeholder: 'e.g. Jaipur' },
  { key: 'productInterest', label: 'What are you looking for?', voice: true, placeholder: 'e.g. bridal necklace, gold chain' },
  { key: 'occasion', label: 'Occasion', voice: true, placeholder: 'e.g. wedding, anniversary' },
  { key: 'budgetRange', label: 'Budget (optional)', placeholder: 'e.g. ₹50,000 – ₹1,00,000' },
  { key: 'notes', label: 'Anything else?', type: 'textarea', voice: true, placeholder: 'Tell us more about what you need…' },
];

const B2B_FIELDS: FieldDef[] = [
  { key: 'accountName', label: 'Business name', voice: true, required: true, placeholder: 'e.g. Sunrise Jewellers' },
  { key: 'name', label: 'Contact person', voice: true, placeholder: 'Your name' },
  { key: 'mobile', label: 'Mobile number', type: 'tel', required: true, placeholder: '+91 98XXXXXXXX' },
  { key: 'gstin', label: 'GSTIN (optional)', placeholder: '22AAAAA0000A1Z5' },
  { key: 'city', label: 'City', voice: true, placeholder: 'e.g. Surat' },
  { key: 'productInterest', label: 'Product interest', voice: true, placeholder: 'e.g. 22k gold chains, diamond sets' },
  { key: 'expectedVolume', label: 'Expected volume / order size', voice: true, placeholder: 'e.g. 500g per month' },
  { key: 'notes', label: 'Anything else?', type: 'textarea', voice: true, placeholder: 'Requirements, timelines…' },
];

const GOLD = '#b4883b';
const INK = '#2a2318';

export function LeadForm({ token, businessName, mode }: { token: string; businessName: string; mode: Mode }) {
  const fields = mode === 'b2c' ? B2C_FIELDS : B2B_FIELDS;
  const [values, setValues] = useState<Record<string, string>>({});
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [listening, setListening] = useState<string | null>(null);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recRef = useRef<any>(null);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setVoiceSupported(Boolean(SR));
  }, []);

  const set = (k: string, v: string) => setValues((p) => ({ ...p, [k]: v }));

  const dictate = (key: string) => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    // Toggle off if already listening on this field.
    if (listening === key && recRef.current) { recRef.current.stop(); return; }
    if (recRef.current) { try { recRef.current.stop(); } catch { /* noop */ } }
    const rec = new SR();
    rec.lang = 'en-IN';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e: any) => {
      const text = Array.from(e.results).map((r: any) => r[0].transcript).join(' ').trim();
      setValues((p) => ({ ...p, [key]: (p[key] ? `${p[key]} ${text}` : text).trim() }));
    };
    rec.onend = () => setListening(null);
    rec.onerror = () => setListening(null);
    recRef.current = rec;
    setListening(key);
    try { rec.start(); } catch { setListening(null); }
  };

  const submit = async () => {
    const needMobile = values.mobile?.trim();
    const needName = values.name?.trim() || values.accountName?.trim();
    if (!needMobile && !needName) { setErr('Please enter at least your name and mobile number.'); return; }
    setBusy(true); setErr(null);
    try {
      const r = await fetch(`/api/public/lead/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, consent, company_website: honeypot }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d.error ?? 'Something went wrong. Please try again.'); return; }
      setDone(true);
    } catch {
      setErr('Could not send. Please check your connection and try again.');
    } finally { setBusy(false); }
  };

  if (done) {
    return (
      <Shell businessName={businessName}>
        <div style={{ textAlign: 'center', padding: '28px 8px' }}>
          <div style={{ fontSize: 44 }}>✓</div>
          <h2 style={{ margin: '8px 0 6px', fontFamily: 'var(--font-fraunces), serif', color: INK, fontSize: 24 }}>Thank you!</h2>
          <p style={{ color: '#6b6150', fontSize: 15, lineHeight: 1.5 }}>Your enquiry has reached {businessName}. Our team will be in touch with you shortly.</p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell businessName={businessName}>
      <p style={{ color: '#6b6150', fontSize: 14.5, margin: '0 0 18px', lineHeight: 1.5 }}>
        Share a few details and our team will get back to you. {voiceSupported ? 'Tap the mic to speak instead of typing.' : ''}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {fields.map((f) => (
          <label key={f.key} style={{ display: 'block' }}>
            <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: INK, marginBottom: 5 }}>
              {f.label}{f.required ? <span style={{ color: '#c0392b' }}> *</span> : null}
            </span>
            <div style={{ position: 'relative' }}>
              {f.type === 'textarea' ? (
                <textarea
                  value={values[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)}
                  placeholder={f.placeholder} rows={3}
                  style={{ ...inputStyle, resize: 'vertical', paddingRight: f.voice ? 46 : 14 }}
                />
              ) : (
                <input
                  type={f.type ?? 'text'} inputMode={f.type === 'tel' ? 'tel' : undefined}
                  value={values[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  style={{ ...inputStyle, paddingRight: f.voice ? 46 : 14 }}
                />
              )}
              {f.voice && voiceSupported ? (
                <button
                  type="button" onClick={() => dictate(f.key)}
                  aria-label={listening === f.key ? 'Stop dictation' : `Dictate ${f.label}`}
                  style={{
                    position: 'absolute', top: f.type === 'textarea' ? 8 : '50%', right: 8,
                    transform: f.type === 'textarea' ? 'none' : 'translateY(-50%)',
                    width: 32, height: 32, borderRadius: '50%', border: 0, cursor: 'pointer',
                    display: 'grid', placeItems: 'center',
                    background: listening === f.key ? '#c0392b' : '#f1e9d9',
                    color: listening === f.key ? '#fff' : GOLD,
                    animation: listening === f.key ? 'ttpulse 1s ease-in-out infinite' : 'none',
                  }}
                >
                  <MicIcon />
                </button>
              ) : null}
            </div>
          </label>
        ))}

        {/* Honeypot — hidden from people, catches bots. */}
        <input
          type="text" value={honeypot} onChange={(e) => setHoneypot(e.target.value)}
          tabIndex={-1} autoComplete="off" aria-hidden="true"
          style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
        />

        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, color: '#6b6150', marginTop: 2, cursor: 'pointer' }}>
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 2, width: 16, height: 16, accentColor: GOLD }} />
          <span>I agree to be contacted on WhatsApp / phone about my enquiry.</span>
        </label>

        {err ? <p style={{ color: '#c0392b', fontSize: 13.5, margin: '2px 0 0' }}>{err}</p> : null}

        <button
          type="button" onClick={submit} disabled={busy}
          style={{ marginTop: 6, width: '100%', padding: '14px 16px', borderRadius: 12, border: 0, cursor: busy ? 'default' : 'pointer', background: INK, color: '#f6e7c4', fontSize: 15.5, fontWeight: 700, opacity: busy ? 0.7 : 1 }}
        >
          {busy ? 'Sending…' : 'Submit enquiry'}
        </button>
      </div>
    </Shell>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 11,
  border: '1px solid #e3d8c3', background: '#fff', color: INK, fontSize: 15,
  fontFamily: 'inherit', outline: 'none',
};

function Shell({ businessName, children }: { businessName: string; children: React.ReactNode }) {
  const initial = (businessName || 'E').charAt(0).toUpperCase();
  return (
    <main style={{ minHeight: '100dvh', background: '#faf7f2', fontFamily: 'var(--font-inter), system-ui, sans-serif', padding: '28px 16px 48px' }}>
      <style>{`@keyframes ttpulse{0%,100%{box-shadow:0 0 0 0 rgba(192,57,43,.45)}50%{box-shadow:0 0 0 6px rgba(192,57,43,0)}}`}</style>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{ display: 'inline-block', width: 46, height: 46, lineHeight: '46px', borderRadius: 12, background: INK, color: '#f6e7c4', fontFamily: 'var(--font-fraunces), serif', fontWeight: 700, fontSize: 22 }}>
            {initial}
          </div>
          <h1 style={{ margin: '10px 0 0', fontFamily: 'var(--font-fraunces), serif', color: INK, fontSize: 22, fontWeight: 600 }}>{businessName}</h1>
        </div>
        <div style={{ background: '#fffdf9', border: '1px solid #ece2cf', borderRadius: 18, padding: '22px 20px', boxShadow: '0 8px 30px rgba(42,35,24,.06)' }}>
          {children}
        </div>
        <p style={{ textAlign: 'center', color: '#b4a98f', fontSize: 11.5, marginTop: 16 }}>Powered by TalkTrack</p>
      </div>
    </main>
  );
}

function MicIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" />
    </svg>
  );
}
