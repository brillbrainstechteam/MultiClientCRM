import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import {
  DisconnectedState,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PartialDataState,
  PermissionRestricted,
} from './StateViews';

export type WidgetState = 'loading' | 'empty' | 'error' | 'restricted' | 'disconnected' | 'partial';

export interface WidgetShellProps {
  title: string;
  icon?: ReactNode;
  /** Scope this widget inherited from the Dashboard header (branch/number/period). */
  contextLabel?: string;
  /** Small icon-button style actions in the header (e.g. refresh). */
  actions?: ReactNode;
  /** "View details" / drill-down link rendered as the widget footer. */
  footerTo?: string;
  footerLabel?: string;
  /**
   * `partial` labels the widget as incomplete but still renders `children`.
   * Every other state replaces the body with the matching StateViews variant.
   */
  state?: WidgetState;
  stateTitle?: string;
  stateDescription?: string;
  stateActions?: ReactNode;
  children: ReactNode;
}

/**
 * The one reusable widget frame for Dashboard domain widgets (CLAUDE.md §4).
 * Every widget shares the same header, scope label, drill-down footer and the
 * loading/empty/error/restricted/disconnected/partial-data pattern so a single
 * widget failing never blanks the rest of the Dashboard.
 */
export function WidgetShell({
  title,
  icon,
  contextLabel,
  actions,
  footerTo,
  footerLabel = 'View details',
  state,
  stateTitle,
  stateDescription,
  stateActions,
  children,
}: WidgetShellProps) {
  const replacesBody = state && state !== 'partial';

  return (
    <section className="crm-widget" aria-label={title}>
      <header className="crm-widget__header">
        <div className="crm-widget__heading">
          {icon ? (
            <span className="crm-widget__icon" aria-hidden="true">
              {icon}
            </span>
          ) : null}
          <h3 className="crm-widget__title">{title}</h3>
        </div>
        <div className="crm-widget__head-right">
          {contextLabel ? <span className="crm-widget__context">{contextLabel}</span> : null}
          {actions ? <div className="crm-widget__actions">{actions}</div> : null}
        </div>
      </header>

      {state === 'partial' ? (
        <PartialDataState
          title={stateTitle ?? 'Some data could not be loaded'}
          description={stateDescription ?? 'Showing the figures that are available.'}
        />
      ) : null}

      <div className="crm-widget__body">
        {replacesBody ? (
          <WidgetStateBody
            state={state}
            title={stateTitle}
            description={stateDescription}
            actions={stateActions}
          />
        ) : (
          children
        )}
      </div>

      {footerTo && !replacesBody ? (
        <footer className="crm-widget__footer">
          <Link to={footerTo} className="crm-widget__footer-link">
            {footerLabel}
            <ChevronRight aria-hidden="true" />
          </Link>
        </footer>
      ) : null}
    </section>
  );
}

function WidgetStateBody({
  state,
  title,
  description,
  actions,
}: {
  state: Exclude<WidgetState, 'partial'>;
  title?: string;
  description?: string;
  actions?: ReactNode;
}) {
  if (state === 'loading') return <LoadingSkeleton lines={4} />;
  if (state === 'empty') {
    return <EmptyState title={title ?? 'Nothing to show yet'} description={description} actions={actions} />;
  }
  if (state === 'error') {
    return (
      <ErrorState title={title ?? 'Could not load this widget'} description={description} actions={actions} />
    );
  }
  if (state === 'restricted') {
    return (
      <PermissionRestricted
        title={title ?? 'You do not have access to this data'}
        description={description}
        actions={actions}
      />
    );
  }
  return (
    <DisconnectedState
      title={title ?? 'A connected account is disconnected'}
      description={description}
      actions={actions}
    />
  );
}
