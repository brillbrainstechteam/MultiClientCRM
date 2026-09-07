import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export interface Crumb {
  label: string;
  to?: string;
}

export interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: Crumb[];
  /** Primary/secondary actions, right-aligned. */
  actions?: ReactNode;
  /** Tabs or a filter row pinned beneath the title. */
  toolbar?: ReactNode;
}

/** Standard title block for every module screen. */
export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  toolbar,
}: PageHeaderProps) {
  return (
    <header className="crm-page-header">
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <nav className="crm-page-header__breadcrumbs" aria-label="Breadcrumb">
          <ol>
            {breadcrumbs.map((crumb, index) => (
              <li key={`${crumb.label}-${index}`}>
                {crumb.to ? <Link to={crumb.to}>{crumb.label}</Link> : <span>{crumb.label}</span>}
                {index < breadcrumbs.length - 1 ? (
                  <span aria-hidden="true" className="crm-page-header__separator">
                    /
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      <div className="crm-page-header__main">
        <div className="crm-page-header__text">
          <h1 className="crm-page-header__title">{title}</h1>
          {description ? <p className="crm-page-header__description">{description}</p> : null}
        </div>
        {actions ? <div className="crm-page-header__actions">{actions}</div> : null}
      </div>

      {toolbar ? <div className="crm-page-header__toolbar">{toolbar}</div> : null}
    </header>
  );
}
