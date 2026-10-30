import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { LeadForm } from './LeadForm';

/**
 * Public lead-capture form (no auth). Shareable as /f/<token>. The token maps to
 * one tenant; the form's shape follows that tenant's onboarding mode (B2B/B2C).
 */

export const metadata: Metadata = { title: 'Enquiry form', robots: { index: false, follow: false } };

export default async function PublicLeadFormPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const tenant = await prisma.tenant.findUnique({
    where: { leadFormToken: token },
    select: { businessModel: true, leadFormEnabled: true },
  });

  if (!tenant || !tenant.leadFormEnabled) {
    return (
      <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, fontFamily: 'var(--font-inter), system-ui, sans-serif', background: '#faf7f2' }}>
        <div style={{ textAlign: 'center', color: '#6b7280' }}>
          <p style={{ fontSize: 18, fontWeight: 600, color: '#374151' }}>This form is not available.</p>
          <p style={{ fontSize: 14 }}>The link may be inactive. Please contact the business directly.</p>
        </div>
      </main>
    );
  }

  return (
    <LeadForm
      token={token}
      mode={tenant.businessModel === 'b2c' ? 'b2c' : 'b2b'}
    />
  );
}
