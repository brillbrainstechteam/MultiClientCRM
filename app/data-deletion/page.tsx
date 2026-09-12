export const metadata = { title: 'Data Deletion — TalkTrackCRM' };

export default function DataDeletionPage() {
  return (
    <main style={{ maxWidth: 760, margin: '48px auto', padding: '0 24px', lineHeight: 1.6, color: 'var(--crm-text-primary)' }}>
      <h1 style={{ color: 'var(--crm-text-title)', fontSize: 30, marginBottom: 8 }}>Data Deletion Instructions</h1>
      <p style={{ color: 'var(--crm-text-muted)', marginBottom: 24 }}>Last updated: 12 September 2026</p>

      <p style={{ marginBottom: 16 }}>
        TalkTrackCRM, operated by BrillBrains Consultants Pvt. Ltd., lets a business connect its own
        WhatsApp Business Account and (optionally) its Google account to run its customer
        relationship management. This page explains how to delete the data associated with your
        account.
      </p>

      <h2 style={sx.h2}>1. Disconnect (revokes access immediately)</h2>
      <p style={sx.p}>
        Sign in to TalkTrackCRM and disconnect your WhatsApp number (and any connected Google
        account) from <strong>Settings → Connections</strong>. Disconnecting immediately revokes our
        access to that account and stops any further processing. You can also revoke Meta access from
        your Meta Business Settings, and Google access from your{' '}
        <a href="https://myaccount.google.com/permissions" style={sx.a}>Google account permissions</a>.
      </p>

      <h2 style={sx.h2}>2. Request full deletion</h2>
      <p style={sx.p}>
        To permanently delete the data we hold for your business — contacts, conversations, messages,
        WhatsApp Business Account and phone-number identifiers, encrypted access tokens, and any
        imported Google contacts — email{' '}
        <a href="mailto:tech@brillbrainsconsultants.com?subject=Data%20deletion%20request" style={sx.a}>tech@brillbrainsconsultants.com</a>{' '}
        from your registered email with the subject <em>“Data deletion request”</em>, or write to the
        registered office below.
      </p>

      <h2 style={sx.h2}>3. What we delete and when</h2>
      <p style={sx.p}>
        On a verified request we delete all personal data we hold for your business from our active
        systems within <strong>30 days</strong>, and from encrypted backups on their normal rotation
        cycle. We may retain the minimum records required to comply with legal, tax or fraud-prevention
        obligations; those are kept isolated and deleted when no longer required.
      </p>

      <h2 style={sx.h2}>4. Confirmation</h2>
      <p style={sx.p}>
        We confirm completion by email to the address that made the request. If you have any question
        about this process, contact{' '}
        <a href="mailto:tech@brillbrainsconsultants.com" style={sx.a}>tech@brillbrainsconsultants.com</a>.
      </p>

      <h2 style={sx.h2}>Registered office</h2>
      <p style={sx.p}>
        BrillBrains Consultants Pvt. Ltd.<br />
        E-204, Agarwal Residency, Shankar Lane, Kandivali West,<br />
        Adarsh Dairy Road, Malad West, Mumbai, Maharashtra 400067, India
      </p>
    </main>
  );
}

const sx = {
  h2: { color: 'var(--crm-text-title)', fontSize: 18, marginTop: 24, marginBottom: 6 } as const,
  p: { marginBottom: 12 } as const,
  a: { color: 'var(--crm-text-brand)', fontWeight: 600 } as const,
};
