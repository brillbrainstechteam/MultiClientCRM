import { useState } from 'react';
import { UserPlus, Search, Link as LinkIcon } from 'lucide-react';
import { Drawer, Button } from '@crm/design-system';
import { contacts } from '@crm/mock-data';
import type { InboxConversation } from '../inbox-types';

interface SaveCustomerDrawerProps {
  open: boolean;
  conversation: InboxConversation | null;
  onClose: () => void;
  onSaved: (contactId: string) => void;
}

interface DuplicateMatch {
  contactId: string;
  name: string;
  mobile: string;
  company: string | null;
}

function findDuplicates(mobile: string): DuplicateMatch[] {
  const normalized = mobile.replace(/\D/g, '');
  return contacts
    .filter((c) => c.mobile.replace(/\D/g, '').endsWith(normalized.slice(-10)))
    .map((c) => ({ contactId: c.id, name: c.name, mobile: c.mobile, company: c.company ?? null }));
}

export function SaveCustomerDrawer({ open, conversation: c, onClose, onSaved }: SaveCustomerDrawerProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [company, setCompany] = useState('');
  const [step, setStep] = useState<'form' | 'duplicate-check' | 'success'>('form');
  const [matches, setMatches] = useState<DuplicateMatch[]>([]);
  const [linkedId, setLinkedId] = useState<string | null>(null);

  const rawMobile = c?.rawMobile ?? '';

  function handleCheck() {
    if (!name.trim()) return;
    const found = findDuplicates(rawMobile);
    if (found.length > 0) {
      setMatches(found);
      setStep('duplicate-check');
    } else {
      // Prototype: simulate create
      setStep('success');
      setTimeout(() => {
        onSaved(`contact_new_${Date.now()}`);
        resetForm();
        onClose();
      }, 900);
    }
  }

  function handleLink(contactId: string) {
    setLinkedId(contactId);
    setStep('success');
    setTimeout(() => {
      onSaved(contactId);
      resetForm();
      onClose();
    }, 900);
  }

  function handleCreateNew() {
    setStep('success');
    setTimeout(() => {
      onSaved(`contact_new_${Date.now()}`);
      resetForm();
      onClose();
    }, 900);
  }

  function resetForm() {
    setName('');
    setEmail('');
    setCity('');
    setCompany('');
    setStep('form');
    setMatches([]);
    setLinkedId(null);
  }

  const inputStyle = {
    width: '100%', boxSizing: 'border-box' as const, padding: '7px 10px',
    border: '1px solid var(--crm-border)', borderRadius: 6, fontSize: 13,
    background: 'var(--crm-bg-primary)', color: 'var(--crm-text-primary)',
  };

  const labelStyle = { fontSize: 11, color: 'var(--crm-text-muted)', display: 'block', marginBottom: 4 };

  return (
    <Drawer
      open={open}
      title="Save Customer"
      onClose={() => { resetForm(); onClose(); }}
    >
      {step === 'form' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Mobile pre-fill */}
          <div style={{ padding: '8px 12px', background: 'var(--crm-bg-secondary)', borderRadius: 6, fontSize: 12, color: 'var(--crm-text-secondary)' }}>
            <span style={{ fontWeight: 600, color: 'var(--crm-text-primary)' }}>WhatsApp number: </span>
            {rawMobile}
          </div>

          <div>
            <label style={labelStyle}>Full name *</label>
            <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sneha Iyer" />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" />
          </div>
          <div>
            <label style={labelStyle}>City</label>
            <input style={inputStyle} value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
          </div>
          <div>
            <label style={labelStyle}>Company</label>
            <input style={inputStyle} value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company name" />
          </div>

          <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
            <Button variant="secondary" size="sm" onClick={() => { resetForm(); onClose(); }}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleCheck} disabled={!name.trim()}>
              <Search size={13} style={{ marginRight: 4 }} />
              Check duplicates & save
            </Button>
          </div>
        </div>
      )}

      {step === 'duplicate-check' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ padding: '10px 12px', background: '#fffbf0', border: '1px solid var(--crm-warning)', borderRadius: 8, fontSize: 12, color: 'var(--crm-text-secondary)' }}>
            We found {matches.length} existing contact{matches.length > 1 ? 's' : ''} with a similar number. Link to an existing contact or create new.
          </div>

          <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--crm-text-primary)' }}>Possible matches</div>
          {matches.map((m) => (
            <div key={m.contactId} style={{ border: '1px solid var(--crm-border)', borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--crm-text-primary)' }}>{m.name}</div>
                <div style={{ fontSize: 11, color: 'var(--crm-text-muted)' }}>{m.mobile}{m.company ? ` · ${m.company}` : ''}</div>
              </div>
              <Button variant="secondary" size="sm" onClick={() => handleLink(m.contactId)}>
                <LinkIcon size={11} style={{ marginRight: 3 }} />
                Link
              </Button>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
            <Button variant="secondary" size="sm" onClick={() => setStep('form')}>Back</Button>
            <Button variant="primary" size="sm" onClick={handleCreateNew}>
              <UserPlus size={13} style={{ marginRight: 4 }} />
              Create new contact
            </Button>
          </div>
        </div>
      )}

      {step === 'success' && (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>✓</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--crm-text-primary)', marginBottom: 4 }}>
            {linkedId ? 'Contact linked' : 'Contact created'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--crm-text-muted)' }}>Returning to conversation…</div>
        </div>
      )}
    </Drawer>
  );
}
