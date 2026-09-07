'use client';

import dynamic from 'next/dynamic';

// Client-only: the prototype uses BrowserRouter + localStorage, so it must not SSR.
const CrmRoot = dynamic(() => import('@crm/CrmRoot'), { ssr: false });

export default function CrmCatchAllPage() {
  return <CrmRoot />;
}
