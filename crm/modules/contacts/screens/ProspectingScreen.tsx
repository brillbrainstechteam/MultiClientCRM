import { PageHeader } from '@crm/components';
import { ProspectingPanel } from '../ProspectingPanel';
import './ProspectingScreen.css';

/**
 * Find new businesses — B2B prospecting via Google Places.
 *
 * Deliberately its own tab rather than part of Imports & Sync: importing data
 * you already own and sourcing data you don't are different jobs, and this one
 * costs money per search.
 */
export default function ProspectingScreen() {
  return (
    <div className="crm-prospecting-page">
      <PageHeader
        title="Find new businesses"
        description="Find B2B prospects by location."
      />
      <ProspectingPanel />
    </div>
  );
}
