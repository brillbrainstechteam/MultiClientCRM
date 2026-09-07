export const metadata = { title: 'Terms of Service — TalkTrackCRM' };

export default function TermsPage() {
  return (
    <main style={{ maxWidth: 760, margin: '48px auto', padding: '0 24px', lineHeight: 1.6, color: 'var(--crm-text-primary)' }}>
      <h1 style={{ color: 'var(--crm-text-title)', fontSize: 30, marginBottom: 8 }}>Terms of Service</h1>
      <p style={{ color: 'var(--crm-text-muted)', marginBottom: 24 }}>Last updated: 2 September 2026</p>
      <p style={{ marginBottom: 12 }}>
        TalkTrackCRM is a WhatsApp customer-relationship platform operated by BrillBrains Consultants
        Pvt. Ltd. By connecting a WhatsApp Business Account you authorise TalkTrackCRM to send and receive
        messages on your behalf and to display and manage those conversations within your workspace.
      </p>
      <p style={{ marginBottom: 12 }}>
        You are responsible for the content you send and for complying with WhatsApp’s Business and
        Commerce policies. Messaging is subject to Meta’s pricing and rules; you are responsible for
        the charges incurred on your WhatsApp Business Account.
      </p>
      <p style={{ marginBottom: 12 }}>
        You may disconnect your WhatsApp account at any time. The service is provided “as is” during
        this early access period. Questions:{' '}
        <a href="mailto:tech@brillbrainsconsultants.com" style={{ color: 'var(--crm-text-brand)', fontWeight: 600 }}>tech@brillbrainsconsultants.com</a>.
      </p>
      <p style={{ marginBottom: 12, color: 'var(--crm-text-muted)', fontSize: 13 }}>
        BrillBrains Consultants Pvt. Ltd., E-204, Agarwal Residency, Shankar Lane, Kandivali West,
        Adarsh Dairy Road, Malad West, Mumbai, Maharashtra 400067, India.
      </p>
    </main>
  );
}
