
export interface AvatarProps {
  /** Two-letter initials. Kept explicit so mock records stay deterministic. */
  initials: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  availability?: 'available' | 'busy' | 'away' | 'offline';
}

export function Avatar({ initials, name, size = 'md', availability }: AvatarProps) {
  return (
    <span className={`crm-avatar crm-avatar--${size}`} title={name}>
      <span aria-hidden="true">{initials}</span>
      <span className="crm-visually-hidden">{name}</span>
      {availability ? (
        <span
          className={`crm-avatar__availability crm-avatar__availability--${availability}`}
          aria-hidden="true"
        />
      ) : null}
    </span>
  );
}
