import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWorkspace } from '@crm/app/workspace-context';
import { Button, Modal, Select, Toast } from '@crm/design-system';
import { widgetPolicyFor } from '../role-widget-policy';

const formatOptions = [
  { value: 'xlsx', label: 'Excel (.xlsx)' },
  { value: 'csv', label: 'CSV' },
  { value: 'pdf', label: 'PDF' },
];

/**
 * DASH-S14 — Export Dashboard. Reflects current filters/view; restricted
 * metrics (per role policy) are omitted automatically, never offered then
 * silently dropped.
 */
export function ExportModal() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { role, branch, whatsappNumber } = useWorkspace();
  const [format, setFormat] = useState('xlsx');
  const [generated, setGenerated] = useState(false);

  const open = searchParams.get('modal') === 'export';
  const policy = widgetPolicyFor(role);

  const close = () =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('modal');
      return next;
    });

  if (!open) return null;

  const includedMetrics = [
    'Attention summary',
    policy.businessSnapshot !== 'hidden' ? 'Business snapshot' : null,
    policy.whatsappHealth ? 'WhatsApp health' : null,
    'Sales & follow-ups',
    policy.campaigns ? 'Campaign performance' : null,
    policy.ordersPayments !== 'hidden' ? 'Orders' : null,
    policy.team ? 'Team workload' : null,
    policy.automation ? 'Automation health' : null,
    policy.trends ? 'Trends' : null,
  ].filter((metric): metric is string => Boolean(metric));

  const restrictedMetrics = [
    policy.businessSnapshot === 'operational' ? 'Payments collected' : null,
    policy.ordersPayments === 'operational' ? 'Payment amounts' : null,
    !policy.usageWarning ? 'Usage & billing' : null,
  ].filter((metric): metric is string => Boolean(metric));

  const scopeNote = [branch ? branch.name : 'All branches', whatsappNumber ? whatsappNumber.displayName : 'All numbers'].join(
    ' · ',
  );

  if (generated) {
    return (
      <Toast
        tone="success"
        message={`Dashboard export (${format.toUpperCase()}) generated for ${scopeNote}.`}
        onDismiss={() => {
          setGenerated(false);
          close();
        }}
      />
    );
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Export Dashboard"
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => setGenerated(true)}>
            Generate
          </Button>
        </>
      }
    >
      <div className="crm-export-modal">
        <p className="crm-export-modal__scope">Current view: {scopeNote}</p>

        <Select label="Format" options={formatOptions} value={format} onChange={(e) => setFormat(e.target.value)} />

        <div>
          <h3 className="crm-export-modal__section-title">Included metrics</h3>
          <ul className="crm-export-modal__list">
            {includedMetrics.map((metric) => (
              <li key={metric}>{metric}</li>
            ))}
          </ul>
        </div>

        {restrictedMetrics.length > 0 ? (
          <div>
            <h3 className="crm-export-modal__section-title">Omitted (not permitted for your role)</h3>
            <ul className="crm-export-modal__list crm-export-modal__list--muted">
              {restrictedMetrics.map((metric) => (
                <li key={metric}>{metric}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
