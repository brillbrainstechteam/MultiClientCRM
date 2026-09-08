export const metadata = { title: 'Privacy Policy — TalkTrackCRM' };

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 760, margin: '48px auto', padding: '0 24px', lineHeight: 1.6, color: 'var(--crm-text-primary)' }}>
      <h1 style={{ color: 'var(--crm-text-title)', fontSize: 30, marginBottom: 8 }}>Privacy Policy</h1>
      <p style={{ color: 'var(--crm-text-muted)', marginBottom: 24 }}>Last updated: 2 September 2026</p>

      <p style={{ marginBottom: 16 }}>
        TalkTrackCRM (“we”, “our”) provides a WhatsApp-based customer relationship management
        platform operated by BrillBrains Consultants Pvt. Ltd. This policy explains what data we
        process and why.
      </p>

      <h2 style={sx.h2}>Data we process</h2>
      <p style={sx.p}>
        When a business connects its WhatsApp Business Account through our platform, we process the
        WhatsApp Business Account and phone-number identifiers, message content exchanged between the
        business and its customers, sender/recipient phone numbers, delivery and read statuses, and
        related metadata — solely to provide the messaging inbox, automations and analytics the
        business uses.
      </p>

      <h2 style={sx.h2}>How we use it</h2>
      <p style={sx.p}>
        Data is used only to operate the service for the connected business: routing and displaying
        conversations, sending replies the business initiates, and producing the business’s own
        reports. We do not sell personal data or use message content for advertising.
      </p>

      <h2 style={sx.h2}>Meta / WhatsApp</h2>
      <p style={sx.p}>
        Our use and transfer of information received from Meta APIs adheres to the{' '}
        <a href="https://developers.facebook.com/terms/dfc_platform_terms/" style={sx.a}>Meta Platform Terms</a>{' '}
        and Developer Policies. Access tokens are stored encrypted and used only to act on behalf of
        the business that granted them.
      </p>

      <h2 style={sx.h2}>Google user data</h2>
      <p style={sx.p}>
        If a business chooses to connect its Google account, TalkTrackCRM requests access only to
        Google Contacts (<code>contacts</code>), Google Sheets (<code>spreadsheets</code>) and files
        this app creates in Google Drive (<code>drive.file</code>). We use this access solely to (a)
        import the business’s contacts into its own CRM, (b) write contacts the business creates back
        to its Google Contacts, and (c) sync the business’s contact data into a Google Sheet it owns.
      </p>
      <p style={sx.p}>
        TalkTrackCRM’s use and transfer of information received from Google APIs adheres to the{' '}
        <a href="https://developers.google.com/terms/api-services-user-data-policy" style={sx.a}>Google API Services User Data Policy</a>,
        including the Limited Use requirements. We do not sell Google user data, do not use it for
        advertising, and do not transfer it to third parties except as needed to provide the
        service to the business, for security, or to comply with law. Google user data is stored only
        for the connected business, is not used to train generalised AI models, and access can be
        revoked by the business at any time from its Google account or by disconnecting in TalkTrackCRM.
      </p>

      <h2 style={sx.h2}>Retention & deletion</h2>
      <p style={sx.p}>
        Businesses may disconnect their WhatsApp account at any time, which revokes our access. On
        request we delete the associated data. To request deletion or ask a question, contact{' '}
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
