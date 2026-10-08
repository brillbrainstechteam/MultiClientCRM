import { useRef } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button, Input, Select, Textarea } from '@crm/design-system';
import type { ButtonType, HeaderFormat, TemplateComponents } from '../../domain/types';
import { characterCount } from '../../domain/validation';

const headerFormatOptions: { value: HeaderFormat; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'text', label: 'Text' },
  { value: 'image', label: 'Image' },
  { value: 'video', label: 'Video' },
  { value: 'document', label: 'Document' },
];

const buttonTypeOptions: { value: ButtonType; label: string }[] = [
  { value: 'quick-reply', label: 'Quick Reply' },
  { value: 'website', label: 'Website' },
  { value: 'dynamic-website', label: 'Dynamic Website' },
  { value: 'call-phone', label: 'Call Phone' },
  { value: 'coupon', label: 'Coupon' },
  { value: 'product', label: 'Product' },
];

export function StandardFields({
  components,
  setComponents,
}: {
  components: TemplateComponents;
  setComponents: (updater: (c: TemplateComponents) => TemplateComponents) => void;
}) {
  const bodyVariableIndexes = [...components.body.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1]));
  const mediaInputRef = useRef<HTMLInputElement>(null);

  const onMediaChosen = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = String(reader.result).split(',')[1] ?? '';
      setComponents((c) => ({ ...c, headerMediaLabel: file.name, headerMedia: { base64, mimeType: file.type, fileName: file.name } }));
    };
    reader.readAsDataURL(file);
  };

  const addButton = () =>
    setComponents((c) => ({
      ...c,
      buttons: [...c.buttons, { id: `btn_${Date.now()}`, type: 'quick-reply', label: '' }],
    }));

  const insertVariable = () => {
    const nextIndex = (components.variables.at(-1)?.index ?? 0) + 1;
    setComponents((c) => ({
      ...c,
      body: `${c.body}{{${nextIndex}}}`,
      variables: [...c.variables, { id: `var_${Date.now()}`, index: nextIndex, description: '', sampleValue: '' }],
    }));
  };

  return (
    <div className="crm-composer-fields">
      <section id="composer-section-header" className="crm-composer-fields__section">
        <h3>Header</h3>
        <Select
          label="Header format"
          hideLabel
          options={headerFormatOptions}
          value={components.headerFormat}
          onChange={(e) => setComponents((c) => ({ ...c, headerFormat: e.target.value as HeaderFormat }))}
        />
        {components.headerFormat === 'text' ? (
          <Input
            label="Header text"
            hideLabel
            placeholder="Header text"
            value={components.headerText ?? ''}
            onChange={(e) => setComponents((c) => ({ ...c, headerText: e.target.value }))}
          />
        ) : null}
        {components.headerFormat === 'image' || components.headerFormat === 'video' || components.headerFormat === 'document' ? (
          <div>
            <input
              ref={mediaInputRef}
              type="file"
              accept={components.headerFormat === 'image' ? 'image/jpeg,image/png' : components.headerFormat === 'video' ? 'video/mp4' : 'application/pdf'}
              hidden
              onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; onMediaChosen(f); }}
            />
            <Button variant="secondary" size="sm" onClick={() => mediaInputRef.current?.click()}>
              {components.headerMediaLabel ? `Replace sample (${components.headerMediaLabel})` : 'Upload sample file'}
            </Button>
            <p className="crm-composer-fields__hint">Meta reviews the template against this sample {components.headerFormat}.</p>
          </div>
        ) : null}
      </section>

      <section id="composer-section-body" className="crm-composer-fields__section">
        <h3>Body</h3>
        <Textarea
          label="Body"
          hideLabel
          rows={5}
          value={components.body}
          onChange={(e) => setComponents((c) => ({ ...c, body: e.target.value }))}
          placeholder="Hi {{1}}, …"
        />
        <div className="crm-composer-fields__meta-row">
          <span>{characterCount(components)} / 1024 characters</span>
          <Button variant="ghost" size="sm" iconLeft={<Plus />} onClick={insertVariable}>Insert variable</Button>
        </div>
      </section>

      {components.variables.length > 0 ? (
        <section id="composer-section-variables" className="crm-composer-fields__section">
          <h3>Variables</h3>
          {components.variables.map((variable) => (
            <div key={variable.id} className="crm-composer-fields__variable-row">
              <span className="crm-composer-fields__variable-tag">{`{{${variable.index}}}`}</span>
              <Input
                label={`Description for {{${variable.index}}}`}
                hideLabel
                placeholder="Internal description"
                value={variable.description}
                onChange={(e) =>
                  setComponents((c) => ({
                    ...c,
                    variables: c.variables.map((v) => (v.id === variable.id ? { ...v, description: e.target.value } : v)),
                  }))
                }
              />
              <Input
                label={`Sample value for {{${variable.index}}}`}
                hideLabel
                required
                placeholder="Sample value"
                value={variable.sampleValue}
                onChange={(e) =>
                  setComponents((c) => ({
                    ...c,
                    variables: c.variables.map((v) => (v.id === variable.id ? { ...v, sampleValue: e.target.value } : v)),
                  }))
                }
                error={!bodyVariableIndexes.includes(variable.index) ? 'Not used in the body' : undefined}
              />
            </div>
          ))}
        </section>
      ) : null}

      <section id="composer-section-footer" className="crm-composer-fields__section">
        <h3>Footer</h3>
        <Input
          label="Footer text"
          hideLabel
          placeholder="Optional footer"
          value={components.footer ?? ''}
          onChange={(e) => setComponents((c) => ({ ...c, footer: e.target.value }))}
          hint={`${(components.footer ?? '').length} / 60 characters`}
        />
      </section>

      <section id="composer-section-buttons" className="crm-composer-fields__section">
        <div className="crm-composer-fields__section-head">
          <h3>Buttons</h3>
          <Button variant="ghost" size="sm" iconLeft={<Plus />} onClick={addButton}>Add button</Button>
        </div>
        {components.buttons.map((button) => (
          <div key={button.id} className="crm-composer-fields__button-row">
            <Select
              label="Button type"
              hideLabel
              options={buttonTypeOptions}
              value={button.type}
              onChange={(e) =>
                setComponents((c) => ({
                  ...c,
                  buttons: c.buttons.map((b) => (b.id === button.id ? { ...b, type: e.target.value as ButtonType } : b)),
                }))
              }
            />
            <Input
              label="Label"
              hideLabel
              placeholder="Button label"
              value={button.label}
              onChange={(e) =>
                setComponents((c) => ({ ...c, buttons: c.buttons.map((b) => (b.id === button.id ? { ...b, label: e.target.value } : b)) }))
              }
            />
            {button.type !== 'quick-reply' ? (
              <Input
                label="Value"
                hideLabel
                placeholder={button.type === 'website' || button.type === 'dynamic-website' ? 'https://…' : button.type === 'call-phone' ? '+91…' : 'Value'}
                value={button.value ?? ''}
                onChange={(e) =>
                  setComponents((c) => ({ ...c, buttons: c.buttons.map((b) => (b.id === button.id ? { ...b, value: e.target.value } : b)) }))
                }
              />
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              iconLeft={<Trash2 />}
              onClick={() => setComponents((c) => ({ ...c, buttons: c.buttons.filter((b) => b.id !== button.id) }))}
            >
              Remove
            </Button>
          </div>
        ))}
      </section>
    </div>
  );
}
