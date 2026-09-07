import { Link } from 'react-router-dom';
import { Avatar } from '@crm/design-system';
import type { Contact } from '@crm/mock-data';

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

export function ContactCell({ contact, to }: { contact: Contact; to?: string }) {
  return (
    <div className="crm-call-contact">
      <Avatar initials={initialsFor(contact.name)} name={contact.name} size="md" />
      <div className="crm-call-contact__text">
        {to ? (
          <Link to={to} className="crm-call-contact__name">
            {contact.name}
          </Link>
        ) : (
          <span className="crm-call-contact__name">{contact.name}</span>
        )}
        <span className="crm-call-contact__secondary">{contact.company ?? contact.mobile}</span>
      </div>
    </div>
  );
}
