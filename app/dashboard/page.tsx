import { redirect } from 'next/navigation';

// The CRM app now lives under /crm (the ported product UI). These legacy paths
// forward there so old links/bookmarks land in the new app instead of a
// retired shell.
export default function Page() {
  redirect('/crm/dashboard');
}
