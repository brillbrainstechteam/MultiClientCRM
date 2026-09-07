import { Route, Routes } from 'react-router-dom';
import { AppShell } from '@crm/components';
import { AiAgentsRoutes } from '@crm/modules/ai-agents/AiAgentsRoutes';
import { AutomationRoutes } from '@crm/modules/automation/AutomationRoutes';
import BillingPage from '@crm/modules/billing/BillingPage';
import CallingPage from '@crm/modules/calling/CallingPage';
import { CampaignsRoutes } from '@crm/modules/campaigns/CampaignsRoutes';
import { CatalogueOrdersRoutes } from '@crm/modules/catalogue-orders/CatalogueOrdersRoutes';
import { ContactsRoutes } from '@crm/modules/contacts/ContactsRoutes';
import { ContactSettingsRoutes } from '@crm/modules/contacts/settings/ContactSettingsRoutes';
import DashboardPage from '@crm/modules/dashboard/DashboardPage';
import InboxPage from '@crm/modules/inbox/InboxPage';
import InboxWindowScreen from '@crm/modules/inbox/InboxWindowScreen';
import InboxAnalyticsPage from '@crm/modules/inbox/InboxAnalyticsPage';
import LoginScreen from '@crm/modules/auth/LoginScreen';
import SignupScreen from '@crm/modules/auth/SignupScreen';
import LandingPage from '@crm/modules/marketing/LandingPage';
import { OnboardingRoutes } from '@crm/modules/onboarding/OnboardingRoutes';
import { ProviderAdminRoutes } from '@crm/modules/provider-admin/ProviderAdminRoutes';
import ReportsPage from '@crm/modules/reports/ReportsPage';
import HistoryCentre from '@crm/modules/settings/history/HistoryCentre';
import SettingsPage from '@crm/modules/settings/SettingsPage';
import { WhatsAppSettingsRoutes } from '@crm/modules/settings/whatsapp/WhatsAppSettingsRoutes';
import { RolesSettingsRoutes } from '@crm/modules/team-access/settings/RolesSettingsRoutes';
import { RoutingSettingsRoutes } from '@crm/modules/team-access/settings/RoutingSettingsRoutes';
import { TeamAccessRoutes } from '@crm/modules/team-access/TeamAccessRoutes';
import { TemplatesRoutes } from '@crm/modules/templates/TemplatesRoutes';
import NotFoundPage from './NotFoundPage';

/**
 * Global route table (05_ROUTE_AND_STATE_CONVENTIONS.md).
 *
 * Every module owns one top-level path. Sub-routes are added by the module's
 * own batch � nothing here should encode a screen that has not been specified.
 */
export function AppRoutes() {
  return (
    <Routes>
      {/* Public, pre-auth screens — no AppShell chrome. */}
      <Route index element={<LandingPage />} />
      <Route path="login" element={<LoginScreen />} />
      <Route path="signup" element={<SignupScreen />} />

      {/* Standalone, chrome-free pop-out Inbox window (opened via "Open in new window"). */}
      <Route path="inbox-window" element={<InboxWindowScreen />} />

      {/* First-time setup and Provider Admin use dedicated shells, not AppShell. */}
      <Route path="setup/*" element={<OnboardingRoutes />} />
      <Route path="provider/*" element={<ProviderAdminRoutes />} />

      <Route element={<AppShell />}>
        <Route path="dashboard/*" element={<DashboardPage />} />
        <Route path="contacts/*" element={<ContactsRoutes />} />

        <Route path="inbox/analytics" element={<InboxAnalyticsPage />} />
        <Route path="inbox/*" element={<InboxPage />} />

        <Route path="calling/*" element={<CallingPage />} />
        <Route path="templates/*" element={<TemplatesRoutes />} />
        <Route path="campaigns/*" element={<CampaignsRoutes />} />
        <Route path="automation/*" element={<AutomationRoutes />} />

        <Route path="catalogue-orders/*" element={<CatalogueOrdersRoutes />} />

        <Route path="team-access/*" element={<TeamAccessRoutes />} />

        <Route path="ai-agents/*" element={<AiAgentsRoutes />} />
        <Route path="ai-assistance/*" element={<AiAgentsRoutes />} />

        <Route path="reports/*" element={<ReportsPage />} />

        {/* Module-owned Settings subtrees must appear before the generic Settings route. */}
        <Route path="settings/contacts/*" element={<ContactSettingsRoutes />} />
        <Route path="settings/team/*" element={<RolesSettingsRoutes />} />
        <Route path="settings/routing/*" element={<RoutingSettingsRoutes />} />
        <Route path="settings/whatsapp/*" element={<WhatsAppSettingsRoutes />} />
        <Route path="settings/history" element={<HistoryCentre />} />
        <Route path="settings/*" element={<SettingsPage />} />

        <Route path="billing/*" element={<BillingPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
