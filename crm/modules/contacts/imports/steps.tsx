import {
  Contact as ContactIcon,
  Download,
  FileSpreadsheet,
  FileText,
  Info,
  MapPin,
  ScanLine,
  Sheet,
  ShieldCheck,
  Smartphone,
  TriangleAlert,
  UploadCloud,
  CheckCircle2,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge, Button, Checkbox, Input, Select } from '@crm/design-system';
import type { ImportMethod } from '@crm/mock-data';
import { findUser } from '@crm/mock-data';
import { methodLabels } from './import-flow';
import { downloadTemplate, templateFields } from './import-template';
import { summarizeAssignments, type ContactLocation } from '../zones/zone-assignment';

/* ---- Shared bits -------------------------------------------------------- */

function Banner({ tone, icon, children }: { tone: 'info' | 'warn' | 'danger' | 'success'; icon: ReactNode; children: ReactNode }) {
  return (
    <div className={`crm-istep-banner crm-istep-banner--${tone}`}>
      <span className="crm-istep-banner__icon" aria-hidden="true">
        {icon}
      </span>
      <div>{children}</div>
    </div>
  );
}

function StepIntro({ title, description }: { title: string; description: string }) {
  return (
    <div className="crm-istep-intro">
      <h2 className="crm-istep-title">{title}</h2>
      <p className="crm-istep-desc">{description}</p>
    </div>
  );
}

/* ---- CON-S20 Method ----------------------------------------------------- */
const methodCards: { id: ImportMethod; icon: ReactNode; blurb: string }[] = [
  { id: 'csv', icon: <FileSpreadsheet />, blurb: 'Upload a CSV or Excel export and map columns.' },
  { id: 'sheets', icon: <Sheet />, blurb: 'Use a Google Sheets template, or map an existing sheet.' },
  { id: 'intelligent', icon: <ScanLine />, blurb: 'Extract contacts from images, PDFs, registers or business cards.' },
  { id: 'google', icon: <ContactIcon />, blurb: 'Import from a connected Google account (read-only).' },
  { id: 'mobile', icon: <Smartphone />, blurb: 'Guide a device export, or upload the resulting VCF.' },
  { id: 'vcf', icon: <FileText />, blurb: 'Upload a .vcf contact card file.' },
];

/* ---- Shared: Download Import Template block (§1) ------------------------- */
export function TemplateDownload({ compact }: { compact?: boolean }) {
  const mandatory = templateFields.filter((f) => f.required).map((f) => f.label);
  return (
    <div className={`crm-template-cta${compact ? ' crm-template-cta--compact' : ''}`}>
      <div className="crm-template-cta__text">
        <p className="crm-template-cta__title">Don’t have a prepared file?</p>
        <p className="crm-template-cta__sub">
          Start from our template — it has every supported field, with mandatory ones marked (
          {mandatory.join(', ')}).
        </p>
      </div>
      <div className="crm-template-cta__actions">
        <Button variant="secondary" size="sm" iconLeft={<Download />} onClick={() => downloadTemplate('csv')}>
          Download Import Template (CSV)
        </Button>
        <Button variant="secondary" size="sm" iconLeft={<Download />} onClick={() => downloadTemplate('excel')}>
          Excel
        </Button>
      </div>
    </div>
  );
}

export function MethodStep({ method, onPick }: { method: ImportMethod | null; onPick: (m: ImportMethod) => void }) {
  return (
    <div>
      <StepIntro title="Choose an import method" description="Pick how you want to bring contacts in. You can change this later by starting over." />
      <div className="crm-method-grid">
        {methodCards.map((card) => (
          <button
            key={card.id}
            type="button"
            className={`crm-method-card${method === card.id ? ' crm-method-card--active' : ''}`}
            onClick={() => onPick(card.id)}
            aria-pressed={method === card.id}
          >
            <span className="crm-method-card__icon" aria-hidden="true">
              {card.icon}
            </span>
            <span className="crm-method-card__name">{methodLabels[card.id]}</span>
            <span className="crm-method-card__blurb">{card.blurb}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---- CON-S21 Source / Upload ------------------------------------------- */
function UploadZone({ hint, fileName }: { hint: string; fileName?: string }) {
  return (
    <div className="crm-upload">
      <UploadCloud aria-hidden="true" />
      {fileName ? (
        <>
          <span className="crm-upload__file">{fileName}</span>
          <span className="crm-upload__hint">Ready to continue</span>
        </>
      ) : (
        <>
          <span className="crm-upload__file">Drag a file here, or click to browse</span>
          <span className="crm-upload__hint">{hint}</span>
        </>
      )}
    </div>
  );
}

export function SourceStep({
  method,
  state,
  googleConnected,
  onOpenGoogle,
}: {
  method: ImportMethod;
  state: string | null;
  googleConnected: boolean;
  onOpenGoogle: () => void;
}) {
  const invalidFile = state === 'invalid-file';

  if (method === 'google') {
    return (
      <div>
        <StepIntro title="Google Contacts" description="Import contacts from your connected Google account. This is read-only." />
        {googleConnected ? (
          <div className="crm-source-google">
            <Banner tone="success" icon={<CheckCircle2 />}>
              <strong>Connected</strong> as anita.sharma@northline.example · 1,284 contacts found.
            </Banner>
          </div>
        ) : (
          <div className="crm-source-google">
            <Banner tone="warn" icon={<TriangleAlert />}>
              <strong>Not connected.</strong> Connect a Google account to continue.
            </Banner>
            <Button variant="primary" onClick={onOpenGoogle}>
              Connect Google Contacts
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (method === 'sheets') {
    return (
      <div>
        <StepIntro
          title="Google Sheets"
          description="Fill a preformatted Google Sheet, or map columns from an existing sheet. Read on demand — no continuous sync."
        />
        {googleConnected ? (
          <div className="crm-source-google">
            <Banner tone="success" icon={<CheckCircle2 />}>
              <strong>Connected</strong> as anita.sharma@northline.example.
            </Banner>

            <div className="crm-sheets">
              <div className="crm-sheets__option">
                <h3 className="crm-sheets__opt-title">Start from a template</h3>
                <p className="crm-sheets__opt-desc">
                  Creates a preformatted Google Sheet with the same fields as the CSV template. Fill it
                  in, then pick it below.
                </p>
                <Button variant="secondary" size="sm" iconLeft={<FileSpreadsheet />}>
                  Create Google Sheets template
                </Button>
              </div>

              <div className="crm-sheets__option">
                <h3 className="crm-sheets__opt-title">Use a spreadsheet</h3>
                <div className="crm-sheets__pickers">
                  <Select
                    label="Spreadsheet"
                    options={[
                      { value: 'tmpl', label: 'TalkTrack Contacts Import (template)' },
                      { value: 'walkins', label: 'Delhi Walk-ins — Aug 2026' },
                      { value: 'expo', label: 'Trade Expo Leads' },
                    ]}
                  />
                  <Select
                    label="Sheet / tab"
                    options={[
                      { value: 'sheet1', label: 'Sheet1' },
                      { value: 'contacts', label: 'Contacts' },
                    ]}
                  />
                </div>
                <p className="crm-sheets__note">
                  An existing sheet doesn’t need the template — you’ll map its columns to contact fields
                  next.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="crm-source-google">
            <Banner tone="warn" icon={<TriangleAlert />}>
              <strong>Not connected.</strong> Connect a Google account to read your spreadsheets.
            </Banner>
            <Button variant="primary" onClick={onOpenGoogle}>
              Connect Google account
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (method === 'mobile') {
    return (
      <div>
        <StepIntro title="Mobile contacts" description="Export contacts from a phone, then upload the file here." />
        <ol className="crm-mobile-steps">
          <li>On the device, open Contacts → Export → “Export to .vcf”.</li>
          <li>Send the file to yourself or your workspace storage.</li>
          <li>Upload the .vcf below.</li>
        </ol>
        <UploadZone hint="Accepted: .vcf up to 10 MB" fileName={invalidFile ? undefined : 'contacts-export.vcf'} />
        {invalidFile ? (
          <Banner tone="danger" icon={<TriangleAlert />}>
            <strong>Unsupported file.</strong> Upload a .vcf file exported from the device.
          </Banner>
        ) : null}
      </div>
    );
  }

  const isIntelligent = method === 'intelligent';
  return (
    <div>
      <StepIntro
        title={isIntelligent ? 'Upload a source to extract from' : `Upload your ${methodLabels[method]} file`}
        description={
          isIntelligent
            ? 'Add an image, PDF, register scan or business card. We’ll extract contacts for review.'
            : 'We’ll read the file and let you map columns to contact fields.'
        }
      />
      {method === 'csv' ? <TemplateDownload /> : null}
      <UploadZone
        hint={isIntelligent ? 'Accepted: JPG, PNG, PDF up to 20 MB' : method === 'vcf' ? 'Accepted: .vcf up to 10 MB' : 'Accepted: .csv, .xlsx up to 20 MB'}
        fileName={invalidFile ? undefined : isIntelligent ? 'business-cards-batch.pdf' : method === 'vcf' ? 'contacts.vcf' : 'delhi-walkins-aug.csv'}
      />
      {invalidFile ? (
        <Banner tone="danger" icon={<TriangleAlert />}>
          <strong>Invalid file.</strong> The file type or size is not supported. Check the format and try again.
        </Banner>
      ) : null}
    </div>
  );
}

/* ---- CON-S22 Field Mapping ---------------------------------------------- */
const targetOptions = [
  { value: '', label: '— Do not import —' },
  { value: 'name', label: 'Full name *' },
  { value: 'mobile', label: 'WhatsApp mobile *' },
  { value: 'email', label: 'Email' },
  { value: 'company', label: 'Company' },
  { value: 'city', label: 'City' },
  { value: 'tags', label: 'Tags' },
];

export function MapStep({ state }: { state: string | null }) {
  const incomplete = state === 'incomplete-mapping';
  const rows = [
    { source: 'Name', sample: 'Rahul Shah', target: 'name', mandatory: true },
    { source: 'Mobile', sample: '9810011234', target: incomplete ? '' : 'mobile', mandatory: true },
    { source: 'Email', sample: 'rahul@shahtextiles.example', target: 'email', mandatory: false },
    { source: 'Company', sample: 'Shah Textiles', target: 'company', mandatory: false },
    { source: 'City', sample: 'New Delhi', target: 'city', mandatory: false },
    { source: 'Notes', sample: 'Bulk buyer', target: '', mandatory: false },
  ];

  return (
    <div>
      <StepIntro title="Map columns to fields" description="Match each source column to a contact field. Fields marked * are required." />

      {incomplete ? (
        <Banner tone="danger" icon={<TriangleAlert />}>
          <strong>Mapping incomplete.</strong> Map the required field <em>WhatsApp mobile</em> before continuing.
        </Banner>
      ) : null}

      <div className="crm-map">
        <div className="crm-map__head">
          <span>Source column</span>
          <span>Sample value</span>
          <span>Contact field</span>
        </div>
        {rows.map((row) => {
          const missing = row.mandatory && !row.target;
          return (
            <div key={row.source} className={`crm-map__row${missing ? ' crm-map__row--missing' : ''}`}>
              <span className="crm-map__source">{row.source}</span>
              <span className="crm-map__sample">{row.sample}</span>
              <span className="crm-map__target">
                <Select label={`Map ${row.source}`} hideLabel size="sm" options={targetOptions} defaultValue={row.target} />
                {missing ? <span className="crm-map__flag">Required field not mapped</span> : null}
              </span>
            </div>
          );
        })}
      </div>

      <div className="crm-map__settings">
        <Select label="Assign imported contacts to" options={[{ value: 'meera', label: 'Meera Nair' }, { value: 'rule', label: 'Use assignment rules' }]} />
        <Select label="Add source tag" options={[{ value: 'walkin', label: 'Walk-in register' }, { value: 'none', label: 'No tag' }]} />
        <Select label="Source" options={[{ value: 'walkin', label: 'Walk-in register' }, { value: 'import', label: 'Import — Aug 2026' }]} />
      </div>
    </div>
  );
}

/* ---- CON-S24 Intelligent Extraction Review ------------------------------ */
export function ExtractStep({ state }: { state: string | null }) {
  const lowConfidence = state === 'low-confidence';
  const rows = [
    { name: 'Rahul Shah', company: 'Shah Textiles', mobile: '+91 98100 11234', confidence: 'high' as const },
    { name: 'A. Verma', company: 'Verma Interiors', mobile: '+91 98100 33456', confidence: 'medium' as const },
    { name: lowConfidence ? '(unclear)' : 'Imran Q.', company: 'Qureshi Motors', mobile: lowConfidence ? '+91 98100 556?' : '+91 98100 55678', confidence: lowConfidence ? ('low' as const) : ('medium' as const) },
  ];
  const confTone = { high: 'success', medium: 'warning', low: 'danger' } as const;

  return (
    <div>
      <StepIntro title="Review extracted contacts" description="Check the extracted values against the source. Low-confidence required fields must be fixed before import." />

      {lowConfidence ? (
        <Banner tone="warn" icon={<TriangleAlert />}>
          <strong>Low confidence on a required field.</strong> Row 3 has an unclear name and mobile — correct it to import that row.
        </Banner>
      ) : null}

      <div className="crm-extract">
        <div className="crm-extract__head">
          <span>Name *</span>
          <span>Company</span>
          <span>Mobile *</span>
          <span>Confidence</span>
        </div>
        {rows.map((row, i) => (
          <div key={i} className={`crm-extract__row${row.confidence === 'low' ? ' crm-extract__row--low' : ''}`}>
            <Input label="Name" hideLabel defaultValue={row.name} />
            <Input label="Company" hideLabel defaultValue={row.company} />
            <Input label="Mobile" hideLabel defaultValue={row.mobile} error={row.confidence === 'low' ? 'Unclear — verify' : undefined} />
            <Badge tone={confTone[row.confidence]}>{row.confidence}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---- CON-S23 Validation & Duplicate Rules ------------------------------- */
export function ValidateStep({ state }: { state: string | null }) {
  const invalidValues = state === 'invalid-values' || !state;
  const duplicates = state === 'duplicates' || !state;

  return (
    <div>
      <StepIntro title="Validate & resolve duplicates" description="Fix invalid values and choose how duplicates are handled. Matching is mobile-first." />

      <section className="crm-val">
        <h3 className="crm-val__title">Invalid values</h3>
        {invalidValues ? (
          <div className="crm-val__list">
            <div className="crm-val__item"><span className="crm-val__row">Row 3</span><span>Mobile too short — “98100”</span><Badge tone="danger">Will be rejected</Badge></div>
            <div className="crm-val__item"><span className="crm-val__row">Row 7</span><span>Invalid mobile — “not-a-number”</span><Badge tone="danger">Will be rejected</Badge></div>
          </div>
        ) : (
          <p className="crm-val__ok">No invalid values found.</p>
        )}
      </section>

      <section className="crm-val">
        <h3 className="crm-val__title">Duplicates</h3>
        {duplicates ? (
          <div className="crm-val__list">
            <div className="crm-val__item"><span className="crm-val__row">Priya Menon</span><span>Existing contact — exact mobile match</span><Badge tone="warning">Update existing</Badge></div>
            <div className="crm-val__item"><span className="crm-val__row">Rows 2 & 5</span><span>Duplicate in file — same mobile</span><Badge tone="warning">Skip later row</Badge></div>
          </div>
        ) : (
          <p className="crm-val__ok">No duplicates detected.</p>
        )}
        <div className="crm-val__policy">
          <Select label="Duplicate policy" options={[{ value: 'skip', label: 'Skip duplicates' }, { value: 'update', label: 'Update existing (fill blanks)' }, { value: 'create', label: 'Create anyway' }]} defaultValue="update" />
          <Select label="Sync authority" options={[{ value: 'crm', label: 'CRM is source of truth' }, { value: 'file', label: 'File overrides (not recommended)' }]} defaultValue="crm" />
        </div>
      </section>

      <section className="crm-val">
        <h3 className="crm-val__title">Phone standardization preview</h3>
        <div className="crm-val__phones">
          <div className="crm-val__phone"><span className="crm-val__raw">9810011234</span><span aria-hidden="true">→</span><span className="crm-val__norm">+91 98100 11234</span></div>
          <div className="crm-val__phone"><span className="crm-val__raw">098200 22345</span><span aria-hidden="true">→</span><span className="crm-val__norm">+91 98200 22345</span></div>
        </div>
      </section>
    </div>
  );
}

/* ---- CON-S25 Preview ---------------------------------------------------- */

// Representative valid-contact locations for this import, expanded from a
// compact spec so the real zone engine (city→state→zone→owner) produces the
// distribution shown — city rules win over state rules (Gurugram → Delhi NCR).
const PREVIEW_LOCATION_SPEC: { city: string; state?: string; n: number }[] = [
  { city: 'Gurugram', n: 64 },
  { city: 'New Delhi', n: 58 },
  { city: 'Noida', n: 22 },
  { city: 'Mumbai', n: 26 },
  { city: 'Pune', n: 14 },
  { city: 'Chandigarh', n: 18 },
  { city: 'Bengaluru', n: 12 }, // South zone has no owner → owner-not-assigned
  { city: '', n: 6 }, // no city/state → location-required
  { city: 'Rajkot', n: 4 }, // unknown → unmapped-zone
  { city: 'Indore', n: 2 }, // unknown → unmapped-zone
];

function previewLocations(): ContactLocation[] {
  return PREVIEW_LOCATION_SPEC.flatMap(({ city, state, n }) =>
    Array.from({ length: n }, () => ({ city, state })),
  );
}

export function PreviewStep() {
  const counts = [
    { label: 'New', value: 214, tone: 'success' as const },
    { label: 'Update', value: 12, tone: 'info' as const },
    { label: 'Skip', value: 31, tone: 'neutral' as const },
    { label: 'Reject', value: 4, tone: 'danger' as const },
  ];
  const assignment = summarizeAssignments(previewLocations());
  const exceptionTotal =
    assignment.exceptions.locationRequired +
    assignment.exceptions.unmappedZone +
    assignment.exceptions.ownerNotAssigned;

  return (
    <div>
      <StepIntro title="Preview before import" description="Review what will happen. Nothing is written until you start the import." />
      <div className="crm-preview-counts">
        {counts.map((c) => (
          <div key={c.label} className="crm-preview-count">
            <span className="crm-preview-count__value">{c.value}</span>
            <Badge tone={c.tone}>{c.label}</Badge>
          </div>
        ))}
      </div>

      {/* Zone + owner assignment preview (§7) */}
      <section className="crm-assign-preview">
        <div className="crm-assign-preview__head">
          <MapPin aria-hidden="true" />
          <h3 className="crm-assign-preview__title">Zone &amp; owner assignment</h3>
          <span className="crm-assign-preview__meta">
            {assignment.assigned} of {assignment.total} valid contacts routed automatically
          </span>
        </div>

        <div className="crm-assign-preview__cols">
          <div className="crm-assign-preview__col">
            <h4 className="crm-assign-preview__col-title">By zone</h4>
            {assignment.byZone.map((z) => (
              <div key={z.zoneId} className="crm-assign-row">
                <span>{z.zoneName}</span>
                <strong>{z.count}</strong>
              </div>
            ))}
          </div>
          <div className="crm-assign-preview__col">
            <h4 className="crm-assign-preview__col-title">By team member</h4>
            {assignment.byOwner.map((o) => (
              <div key={o.ownerId} className="crm-assign-row">
                <span>{findUser(o.ownerId)?.name ?? o.ownerId}</span>
                <strong>{o.count}</strong>
              </div>
            ))}
          </div>
        </div>

        {exceptionTotal > 0 ? (
          <div className="crm-assign-exceptions">
            <p className="crm-assign-exceptions__title">
              {exceptionTotal} contact{exceptionTotal !== 1 ? 's' : ''} need attention before or after import
            </p>
            <ul className="crm-assign-exceptions__list">
              {assignment.exceptions.locationRequired > 0 && (
                <li><Badge tone="warning">Location required</Badge> {assignment.exceptions.locationRequired} missing city/state</li>
              )}
              {assignment.exceptions.unmappedZone > 0 && (
                <li><Badge tone="warning">Unmapped zone</Badge> {assignment.exceptions.unmappedZone} not in any zone</li>
              )}
              {assignment.exceptions.ownerNotAssigned > 0 && (
                <li><Badge tone="danger">Owner not assigned</Badge> {assignment.exceptions.ownerNotAssigned} in a zone with no team member</li>
              )}
            </ul>
            <div className="crm-assign-exceptions__actions">
              <Button variant="secondary" size="sm">Bulk-assign zone / owner</Button>
              <Button variant="secondary" size="sm" iconLeft={<Download />}>Download exceptions</Button>
            </div>
            <p className="crm-assign-exceptions__hint">
              You can continue with valid contacts and correct these later — exceptions are never silently
              assigned to an arbitrary owner.
            </p>
          </div>
        ) : null}
      </section>

      <div className="crm-preview-summary">
        <SummaryRow label="Source tag" value="Walk-in register" />
        <SummaryRow label="Assignment" value="Zone-based (auto)" />
        <SummaryRow label="Duplicate policy" value="Update existing (fill blanks)" />
        <SummaryRow label="Sync authority" value="CRM is source of truth" />
      </div>
      <Banner tone="info" icon={<ShieldCheck />}>
        Imported contacts are <strong>not</strong> opted in for marketing automatically. Consent must be captured separately.
      </Banner>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="crm-preview-summary__row">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

/* ---- CON-S26 Processing ------------------------------------------------- */
export function ProcessingStep({ state, jobId }: { state: string | null; jobId: string }) {
  const fatal = state === 'fatal';
  const recoverable = state === 'recoverable-failure';
  const progress = fatal ? 0 : recoverable ? 46 : 100;

  return (
    <div>
      <StepIntro title="Importing contacts" description="This runs in the background. You can leave this page — the import will keep going." />

      {fatal ? (
        <Banner tone="danger" icon={<TriangleAlert />}>
          <strong>Import could not start.</strong> A pre-commit check failed and nothing was written. Fix the source and try again.
        </Banner>
      ) : recoverable ? (
        <Banner tone="warn" icon={<TriangleAlert />}>
          <strong>Import paused.</strong> A recoverable error occurred at 46%. You can retry from where it stopped.
        </Banner>
      ) : null}

      <div className="crm-processing">
        <div className="crm-processing__bar" aria-hidden="true">
          <span className="crm-processing__fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="crm-processing__meta">
          <span>{fatal ? '0' : recoverable ? '120' : '261'} of 261 processed</span>
          <span>Job {jobId}</span>
        </div>
      </div>

      <Banner tone="info" icon={<Info />}>
        Leaving this page does not cancel the import. Track progress from Imports &amp; Sync.
      </Banner>
    </div>
  );
}

/* ---- CON-S27 Results ---------------------------------------------------- */
export function ResultsStep({ state }: { state: string | null }) {
  const partial = state === 'partial-success';
  const counts = [
    { label: 'Added', value: partial ? 209 : 214 },
    { label: 'Updated', value: 12 },
    { label: 'Skipped', value: 31 },
    { label: 'Rejected', value: partial ? 9 : 4 },
  ];

  return (
    <div>
      <StepIntro title={partial ? 'Import finished with issues' : 'Import complete'} description="Here’s what happened. You can review imported contacts or download the error report." />

      {partial ? (
        <Banner tone="warn" icon={<TriangleAlert />}>
          <strong>Partial success.</strong> 9 rows were rejected. Download the error report to fix and re-import them.
        </Banner>
      ) : (
        <Banner tone="success" icon={<CheckCircle2 />}>
          <strong>All good.</strong> 214 contacts were added and 12 updated.
        </Banner>
      )}

      <Banner tone="info" icon={<MapPin />}>
        Imported contacts were routed to zones and owners automatically. <strong>24 contacts</strong> need a
        zone or owner — review them under <strong>Contacts → Needs attention</strong>.
      </Banner>

      <div className="crm-preview-counts">
        {counts.map((c) => (
          <div key={c.label} className="crm-preview-count">
            <span className="crm-preview-count__value">{c.value}</span>
            <Badge tone={c.label === 'Rejected' && c.value > 0 ? 'danger' : 'neutral'}>{c.label}</Badge>
          </div>
        ))}
      </div>

      {partial ? (
        <div className="crm-results-rejected">
          <div className="crm-results-rejected__head">
            <span>Row</span>
            <span>Value</span>
            <span>Reason</span>
          </div>
          <div className="crm-results-rejected__row"><span>3</span><span>98100</span><span>Mobile too short</span></div>
          <div className="crm-results-rejected__row"><span>7</span><span>not-a-number</span><span>Invalid mobile</span></div>
          <div className="crm-results-rejected__row"><span>18</span><span>(blank)</span><span>Missing name and company</span></div>
          <div className="crm-results-rejected__more">
            <Checkbox label="Include skipped rows in report" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
