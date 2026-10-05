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

/*
 * The remaining wizard steps (source, mapping, validation, preview, processing,
 * results) used to live here as fixtures — they displayed a hardcoded
 * "delhi-walkins-aug.csv" and invented progress. They were replaced by
 * wizard-steps.tsx, which reads the real file and imports it, and are deleted
 * so the fixtures can never render again.
 */
