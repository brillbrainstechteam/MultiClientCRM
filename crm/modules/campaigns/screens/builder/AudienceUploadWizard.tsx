import { useState } from 'react';
import { CheckCircle2, FileSpreadsheet, UploadCloud } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Banner, Button, Modal, Select, Stepper, type StepperItem } from '@crm/design-system';
import type { AudienceSourceRef } from '../../domain/types';

/**
 * CAM-W01–W04, hosted as a modal-state within the Audience step
 * (CODE_FIRST_ADAPTER.md "Audience upload — CAM-W01–W04": `...&step=audience&uploadStep=…`).
 * No real file parsing — the uploaded file's mapping/validation outcome is a
 * deterministic fixture so the partial-success and field-mapping states are
 * reproducible by URL, same convention Contacts' own Import Wizard uses.
 */

const uploadSteps: StepperItem[] = [
  { id: 'file', label: 'Upload File' },
  { id: 'mapping', label: 'Field Mapping' },
  { id: 'validation', label: 'Validation' },
  { id: 'results', label: 'Results' },
];

const sourceColumns = ['Full Name', 'Mobile Number', 'City', 'Segment Tag'];
const targetFields = [
  { value: 'name', label: 'Contact name' },
  { value: 'mobile', label: 'Mobile number (required)' },
  { value: 'city', label: 'City' },
  { value: 'tag', label: 'Tag' },
];
const defaultMapping: Record<string, string> = {
  'Full Name': 'name',
  'Mobile Number': 'mobile',
  City: 'city',
  'Segment Tag': 'tag',
};

const outcomes = {
  partial: { totalRows: 500, validRows: 468, invalidRows: 32, fileName: 'festive_customers.csv' },
  success: { totalRows: 500, validRows: 500, invalidRows: 0, fileName: 'festive_customers_clean.csv' },
} as const;

const invalidReasons = [
  { reason: 'Missing mobile number', count: 18 },
  { reason: 'Invalid mobile format', count: 9 },
  { reason: 'Duplicate row within file', count: 5 },
];

export function AudienceUploadWizard({
  open,
  onClose,
  onComplete,
}: {
  open: boolean;
  onClose: () => void;
  onComplete: (source: AudienceSourceRef, savedToContacts: boolean) => void;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [fileChosen, setFileChosen] = useState(false);
  const [mapping, setMapping] = useState<Record<string, string>>(defaultMapping);

  const step = searchParams.get('uploadStep') ?? 'file';
  const result = searchParams.get('uploadResult') === 'success' ? 'success' : 'partial';
  const outcome = outcomes[result];

  const setUploadStep = (id: string) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('uploadStep', id);
      return next;
    });

  const close = () => {
    setFileChosen(false);
    setMapping(defaultMapping);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('uploadStep');
      next.delete('uploadResult');
      return next;
    });
    onClose();
  };

  const finish = (savedToContacts: boolean) => {
    onComplete(
      {
        id: `src_upload_${Date.now()}`,
        kind: 'upload',
        label: `${outcome.fileName} (uploaded${savedToContacts ? ', saved to Contacts' : ', this campaign only'})`,
        count: outcome.validRows,
      },
      savedToContacts,
    );
    close();
  };

  const mobileMapped = Object.values(mapping).includes('mobile');

  return (
    <Modal open={open} title="Add a temporary audience upload" onClose={close} size="lg">
      <div className="crm-camp-upload-wizard">
        <Stepper items={uploadSteps} currentId={step} />

        <div className="crm-camp-upload-wizard__content">
          {step === 'file' ? (
            <div className="crm-camp-upload-wizard__file">
              <p className="crm-camp-upload-wizard__hint">
                Upload an Excel (.xlsx) or CSV file. It's used for this campaign's audience only, unless you choose to
                save it permanently to Contacts on the Results step.
              </p>
              <label className="crm-camp-upload-wizard__dropzone">
                <UploadCloud />
                <span>{fileChosen ? outcome.fileName : 'Choose a file, or use the sample below'}</span>
                <input
                  type="file"
                  accept=".csv,.xlsx"
                  className="crm-visually-hidden"
                  onChange={() => setFileChosen(true)}
                />
              </label>
              <Button variant="secondary" iconLeft={<FileSpreadsheet />} onClick={() => setFileChosen(true)}>
                Use sample file — {outcomes.partial.fileName} ({outcomes.partial.totalRows} rows)
              </Button>
            </div>
          ) : null}

          {step === 'mapping' ? (
            <div className="crm-camp-upload-wizard__mapping">
              <p className="crm-camp-upload-wizard__hint">Map each column in your file to a campaign audience field.</p>
              <table className="crm-camp-upload-wizard__table">
                <thead>
                  <tr>
                    <th>File column</th>
                    <th>Maps to</th>
                  </tr>
                </thead>
                <tbody>
                  {sourceColumns.map((column) => (
                    <tr key={column}>
                      <td>{column}</td>
                      <td>
                        <Select
                          label={`Map ${column}`}
                          hideLabel
                          size="sm"
                          options={[{ value: '', label: 'Do not import' }, ...targetFields]}
                          value={mapping[column] ?? ''}
                          onChange={(e) => setMapping((prev) => ({ ...prev, [column]: e.target.value }))}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!mobileMapped ? (
                <Banner tone="danger" title="Mobile number is required" description="Map a column to Mobile number before continuing — it is the identity WhatsApp messages are sent to." />
              ) : null}
            </div>
          ) : null}

          {step === 'validation' ? (
            <div className="crm-camp-upload-wizard__validation">
              <div className="crm-camp-upload-wizard__validation-summary">
                <div>
                  <p className="crm-camp-upload-wizard__stat">{outcome.totalRows}</p>
                  <p className="crm-camp-upload-wizard__stat-label">Total rows</p>
                </div>
                <div>
                  <p className="crm-camp-upload-wizard__stat crm-camp-upload-wizard__stat--positive">{outcome.validRows}</p>
                  <p className="crm-camp-upload-wizard__stat-label">Valid</p>
                </div>
                <div>
                  <p className="crm-camp-upload-wizard__stat crm-camp-upload-wizard__stat--negative">{outcome.invalidRows}</p>
                  <p className="crm-camp-upload-wizard__stat-label">Invalid / skipped</p>
                </div>
              </div>
              {outcome.invalidRows > 0 ? (
                <>
                  <p className="crm-camp-upload-wizard__hint">Invalid rows are skipped — valid rows still proceed.</p>
                  <ul className="crm-camp-upload-wizard__reasons">
                    {invalidReasons.map((r) => (
                      <li key={r.reason}>
                        <span>{r.reason}</span>
                        <span>{r.count}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <Banner tone="info" title="All rows passed validation" description="Every row in this file mapped to a valid, deliverable contact." />
              )}
            </div>
          ) : null}

          {step === 'results' ? (
            <div className="crm-camp-upload-wizard__results">
              <Banner
                tone="info"
                title={`${outcome.validRows} of ${outcome.totalRows} rows ready to use`}
                description={outcome.invalidRows > 0 ? `${outcome.invalidRows} rows were skipped — see Validation for details.` : 'All rows validated successfully.'}
              />
              <div className="crm-camp-upload-wizard__results-actions">
                <button type="button" className="crm-camp-upload-wizard__result-card" onClick={() => finish(false)}>
                  <CheckCircle2 />
                  <span className="crm-camp-upload-wizard__result-card-title">Use for this campaign only</span>
                  <span className="crm-camp-upload-wizard__result-card-desc">Temporary — not added to your permanent Contacts database.</span>
                </button>
                <button type="button" className="crm-camp-upload-wizard__result-card" onClick={() => finish(true)}>
                  <CheckCircle2 />
                  <span className="crm-camp-upload-wizard__result-card-title">Save to Contacts &amp; use</span>
                  <span className="crm-camp-upload-wizard__result-card-desc">Adds these {outcome.validRows} contacts to Contacts permanently, then uses them here.</span>
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="crm-camp-upload-wizard__footer">
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <div className="crm-camp-upload-wizard__footer-right">
            {step !== 'file' ? (
              <Button
                variant="secondary"
                onClick={() => setUploadStep(uploadSteps[uploadSteps.findIndex((s) => s.id === step) - 1].id)}
              >
                Back
              </Button>
            ) : null}
            {step === 'file' ? (
              <Button variant="primary" disabled={!fileChosen} onClick={() => setUploadStep('mapping')}>
                Continue
              </Button>
            ) : null}
            {step === 'mapping' ? (
              <Button variant="primary" disabled={!mobileMapped} onClick={() => setUploadStep('validation')}>
                Continue
              </Button>
            ) : null}
            {step === 'validation' ? (
              <Button variant="primary" onClick={() => setUploadStep('results')}>
                Continue
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </Modal>
  );
}
