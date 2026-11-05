import { Link } from 'react-router-dom';
import { Avatar } from '@crm/design-system';
import type { Contact } from '@crm/mock-data';

export interface ContactIdentityProps {
  contact: Contact;
  /** `cell` for dense table rows, `header` for the Customer 360 identity block. */
  variant?: 'cell' | 'header';
  /** When set, the name links to the given route (usually Customer 360). */
  to?: string;
  /** When set and the contact has a company, the company becomes a link
   *  (e.g. all contacts at that company). Returns the route for a company name. */
  companyTo?: (company: string) => string;
}

/**
 * Canonical way to render "who this contact is": avatar + name + company/mobile.
 * Used by the contact table (CON-S02) and Customer 360 header (CON-S03).
 */
export function ContactIdentity({ contact, variant = 'cell', to, companyTo }: ContactIdentityProps) {
  const company = contact.company;
  const secondary = company ?? contact.mobile;
  const companyLink = companyTo && company ? companyTo(company) : null;

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
          {companyLink ? (
            <Link to={companyLink} className="crm-contact-identity__company-link" title={`All contacts at ${company}`}>{company}</Link>
          ) : (
            secondary
          )}
          {variant === 'header' && company ? ` · ${contact.mobile}` : ''}
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
