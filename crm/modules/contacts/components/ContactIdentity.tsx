import { Link } from 'react-router-dom';
import { Avatar } from '@crm/design-system';
import type { Contact } from '@crm/mock-data';

export interface ContactIdentityProps {
  contact: Contact;
  /** `cell` for dense table rows, `header` for the Customer 360 identity block. */
  variant?: 'cell' | 'header';
  /** When set, the name links to the given route (usually Customer 360). */
  to?: string;
}

/**
 * Canonical way to render "who this contact is": avatar + name + company/mobile.
 * Used by the contact table (CON-S02) and Customer 360 header (CON-S03).
 */
export function ContactIdentity({ contact, variant = 'cell', to }: ContactIdentityProps) {
  const secondary = contact.company ?? contact.mobile;

  return (
    <div className={`crm-contact-identity crm-contact-identity--${variant}`}>
      <Avatar
        initials={initialsFor(contact.name)}
        name={contact.name}
        size={variant === 'header' ? 'lg' : 'md'}
      />
      <div className="crm-contact-identity__text">
        {to ? (
          <Link to={to} className="crm-contact-identity__name">
            {contact.name}
          </Link>
        ) : (
          <span className="crm-contact-identity__name">{contact.name}</span>
        )}
        <span className="crm-contact-identity__secondary">
          {secondary}
          {variant === 'header' && contact.company ? ` · ${contact.mobile}` : ''}
        </span>
      </div>
    </div>
  );
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}
