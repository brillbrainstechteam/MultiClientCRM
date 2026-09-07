import { AlertTriangle, Inbox, Lock, PlugZap, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

interface BaseStateProps {
  title: string;
  description?: string;
  /** Primary/secondary CTAs rendered by the caller so wording stays contextual. */
  actions?: ReactNode;
}

function StateShell({
  tone,
  icon,
  title,
  description,
  actions,
}: BaseStateProps & { tone: string; icon: ReactNode }) {
  return (
    <div className={`crm-state crm-state--${tone}`} role="status">
      <span className="crm-state__icon" aria-hidden="true">
        {icon}
      </span>
      <p className="crm-state__title">{title}</p>
      {description ? <p className="crm-state__description">{description}</p> : null}
      {actions ? <div className="crm-state__actions">{actions}</div> : null}
    </div>
  );
}

/** No records exist yet, or filters matched nothing. */
export function EmptyState(props: BaseStateProps) {
  return <StateShell tone="neutral" icon={<Inbox />} {...props} />;
}

/** Something failed to load and the user can retry. */
export function ErrorState(props: BaseStateProps) {
  return <StateShell tone="danger" icon={<AlertTriangle />} {...props} />;
}

/** The user's role or scope does not permit this view. Never leak the data. */
export function PermissionRestricted(props: BaseStateProps) {
  return <StateShell tone="warning" icon={<Lock />} {...props} />;
}

/** A connected WhatsApp number or integration is offline. */
export function DisconnectedState(props: BaseStateProps) {
  return <StateShell tone="warning" icon={<PlugZap />} {...props} />;
}

/** Some sources returned data and others did not — figures are incomplete. */
export function PartialDataState(props: BaseStateProps) {
  return <StateShell tone="info" icon={<TriangleAlert />} {...props} />;
}

export interface LoadingSkeletonProps {
  /** Number of placeholder lines. */
  lines?: number;
  /** Optional fixed height for block-shaped skeletons (charts, cards). */
  height?: number;
}

export function LoadingSkeleton({ lines = 3, height }: LoadingSkeletonProps) {
  if (height !== undefined) {
    return (
      <div
        className="crm-skeleton crm-skeleton__block"
        style={{ height }}
        aria-hidden="true"
      />
    );
  }

  return (
    <div className="crm-skeleton" aria-hidden="true">
      {Array.from({ length: lines }, (_unused, index) => (
        <span key={index} className="crm-skeleton__line" />
      ))}
    </div>
  );
}
