import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@crm/components';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { Badge, Button } from '@crm/design-system';
import { ApprovedTemplatePicker, type TemplateSelection } from '../components';

const sourceLabel: Record<string, string> = {
  inbox: 'Inbox',
  campaigns: 'Campaigns',
  journey: 'Journeys & Automation',
};

/**
 * `/templates/picker` — deterministic capture host for the shared Approved
 * Template Picker (CODE_FIRST_ADAPTER.md "Shared Approved Template Picker").
 * Not a normal Templates navigation page: Campaigns/Inbox/Journeys embed
 * `ApprovedTemplatePicker` directly once built; this route exists so the
 * picker itself has a reachable, capturable surface today.
 */
export default function TemplatePickerHostScreen() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const scopedHref = useScopedHref();
  const [selection, setSelection] = useState<TemplateSelection | null>(null);

  const source = searchParams.get('source') ?? 'campaigns';
  const wabaId = searchParams.get('waba') ?? undefined;
  const returnTo = searchParams.get('returnTo');

  return (
    <div className="crm-tpl-picker-host">
      <PageHeader
        title="Choose an approved template"
        description={`Requested by ${sourceLabel[source] ?? source}. Only Approved, usable templates are shown.`}
        actions={<Badge tone="brand" appearance="outline">Source: {sourceLabel[source] ?? source}</Badge>}
      />

      <ApprovedTemplatePicker wabaId={wabaId} onSelect={setSelection} />

      {selection ? (
        <div className="crm-tpl-picker-host__result">
          <p>
            Selected <strong>{selection.templateId}</strong> · {selection.locale} · {selection.wabaId}
          </p>
          <Button
            variant="primary"
            onClick={() =>
              navigate(
                returnTo
                  ? scopedHref(returnTo, { templateId: selection.templateId, locale: selection.locale, waba: selection.wabaId })
                  : scopedHref(`/${source === 'journey' ? 'automation' : source}`, {
                      templateId: selection.templateId,
                      locale: selection.locale,
                      waba: selection.wabaId,
                    }),
              )
            }
          >
            Return to {sourceLabel[source] ?? source} with this selection
          </Button>
        </div>
      ) : null}
    </div>
  );
}
