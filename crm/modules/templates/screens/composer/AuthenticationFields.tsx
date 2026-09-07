import { Info, Plus } from 'lucide-react';
import { Button, Checkbox, Input } from '@crm/design-system';
import type { TemplateComponents } from '../../domain/types';

/** TPL-S05D — Authentication Composer: guided OTP UI, no unrestricted marketing controls. */
export function AuthenticationFields({
  components,
  setComponents,
}: {
  components: TemplateComponents;
  setComponents: (updater: (c: TemplateComponents) => TemplateComponents) => void;
}) {
  const auth = components.authentication ?? { codeExpiryMinutes: 10, addSecurityDisclaimer: true };

  const ensureCodeVariable = () => {
    if (components.variables.some((v) => v.index === 1)) return;
    setComponents((c) => ({
      ...c,
      body: c.body || '{{1}} is your verification code. Do not share this code.',
      variables: [{ id: `var_${Date.now()}`, index: 1, description: 'One-time code', sampleValue: '482913' }],
    }));
  };

  return (
    <div className="crm-composer-fields">
      <section id="composer-section-body" className="crm-composer-fields__section">
        <h3>Verification message</h3>
        <p className="crm-composer-fields__helper">
          <Info aria-hidden="true" style={{ width: 13, height: 13, verticalAlign: '-2px' }} /> Authentication templates support only the one-time code
          variable and a quick-reply button — marketing content, media and extra buttons are not permitted by Meta.
        </p>
        <Button variant="secondary" size="sm" iconLeft={<Plus />} onClick={ensureCodeVariable} disabled={components.variables.some((v) => v.index === 1)}>
          {components.variables.some((v) => v.index === 1) ? 'Code variable added' : 'Insert code variable'}
        </Button>
        <p className="crm-composer-fields__helper">{components.body || 'Insert the code variable to preview the message.'}</p>
      </section>

      <section id="composer-section-authentication" className="crm-composer-fields__section">
        <h3>Code settings</h3>
        <Input
          label="Code expiry (minutes)"
          type="number"
          min={1}
          max={90}
          value={auth.codeExpiryMinutes}
          onChange={(e) => setComponents((c) => ({ ...c, authentication: { ...auth, codeExpiryMinutes: Number(e.target.value) } }))}
        />
        <Checkbox
          label={'Add security disclaimer ("Do not share this code")'}
          checked={auth.addSecurityDisclaimer}
          onChange={(e) => setComponents((c) => ({ ...c, authentication: { ...auth, addSecurityDisclaimer: e.target.checked } }))}
        />
        {components.buttons.length === 0 ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setComponents((c) => ({ ...c, buttons: [{ id: `btn_${Date.now()}`, type: 'quick-reply', label: 'Copy code' }] }))}
          >
            Add "Copy code" button
          </Button>
        ) : null}
      </section>
    </div>
  );
}
