
export interface ToggleProps {
  label: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  hideLabel?: boolean;
  /** Optional helper text under the label. */
  description?: string;
}

/** Switch control for on/off configuration settings. */
export function Toggle({
  label,
  checked,
  defaultChecked,
  onChange,
  disabled,
  hideLabel,
  description,
}: ToggleProps) {
  return (
    <label className={`crm-toggle${disabled ? ' crm-toggle--disabled' : ''}`}>
      <span className="crm-toggle__control">
        <input
          type="checkbox"
          role="switch"
          checked={checked}
          defaultChecked={defaultChecked}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.checked)}
        />
        <span className="crm-toggle__track" aria-hidden="true">
          <span className="crm-toggle__thumb" />
        </span>
      </span>
      {!hideLabel ? (
        <span className="crm-toggle__text">
          <span className="crm-toggle__label">{label}</span>
          {description ? <span className="crm-toggle__description">{description}</span> : null}
        </span>
      ) : (
        <span className="crm-visually-hidden">{label}</span>
      )}
    </label>
  );
}
