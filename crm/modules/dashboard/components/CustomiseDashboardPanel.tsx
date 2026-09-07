import { useState } from 'react';
import { LayoutGrid } from 'lucide-react';
import { Button, Checkbox } from '@crm/design-system';
import { customisableWidgets, type WidgetVisibility } from '../dashboard-preferences';

export interface CustomiseDashboardPanelProps {
  visibility: WidgetVisibility;
  allowedKeys: Set<string>;
  onSave: (next: WidgetVisibility) => void;
  onCancel: () => void;
  onReset: () => void;
}

/**
 * DASH-S09 — Customise Dashboard, an in-page edit mode of DASH-S01 (not a
 * separate page). Only widgets the acting role's policy permits at all are
 * offered — a role never sees an option to reveal something it cannot access.
 */
export function CustomiseDashboardPanel({
  visibility,
  allowedKeys,
  onSave,
  onCancel,
  onReset,
}: CustomiseDashboardPanelProps) {
  const [draft, setDraft] = useState(visibility);

  const options = customisableWidgets.filter((widget) => allowedKeys.has(widget.key));

  return (
    <div className="crm-customise-panel">
      <div className="crm-customise-panel__head">
        <span className="crm-customise-panel__icon" aria-hidden="true">
          <LayoutGrid />
        </span>
        <div>
          <h2 className="crm-dash-section-title">Customise Dashboard</h2>
          <p className="crm-customise-panel__meta">
            Choose which widgets show on your Dashboard. Changes apply only to your view.
          </p>
        </div>
      </div>

      <div className="crm-customise-panel__grid">
        {options.map((widget) => (
          <Checkbox
            key={widget.key}
            label={widget.label}
            checked={draft[widget.key]}
            onChange={() => setDraft((prev) => ({ ...prev, [widget.key]: !prev[widget.key] }))}
          />
        ))}
      </div>

      <div className="crm-customise-panel__actions">
        <Button variant="ghost" onClick={onReset}>
          Reset to default
        </Button>
        <span className="crm-customise-panel__spacer" />
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" onClick={() => onSave(draft)}>
          Save layout
        </Button>
      </div>
    </div>
  );
}
