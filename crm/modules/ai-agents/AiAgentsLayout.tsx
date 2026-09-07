import { Outlet } from 'react-router-dom';
import { AiAgentsStoreProvider } from './ai-agents-store';

/**
 * Wraps every AI Agents page with the session store (CODE_FIRST_ADAPTER.md —
 * lifecycle/version/audit state must stay consistent across Library, Setup,
 * Test Lab and Usage). No secondary nav: the module deliberately has four
 * primary surfaces reached by direct routes, not a sub-navigation rail.
 */
export function AiAgentsLayout() {
  return (
    <AiAgentsStoreProvider>
      <div className="crm-aia">
        <Outlet />
      </div>
    </AiAgentsStoreProvider>
  );
}
