import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prospectingAllowed } from '@/lib/crm/prospecting-access';

/** Whether the signed-in tenant may use Maps prospecting (drives the UI lock). */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const businessModel = user.tenant.businessModel;
  return NextResponse.json({
    enabled: prospectingAllowed({ id: user.tenantId, businessModel }),
    businessModel,
  });
}
