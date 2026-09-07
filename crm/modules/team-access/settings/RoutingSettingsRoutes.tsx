import { RequireCapability } from '../components';
import { AssignmentRuleWizardDrawer } from '../overlays/AssignmentRuleWizardDrawer';
import { RuleTestDrawer } from '../overlays/RuleTestDrawer';
import AssignmentRulesScreen from './AssignmentRulesScreen';

/** Registers /settings/routing (TSET-S05) plus the create/edit wizard and Test drawer overlays. Owner-only (permissions.ts `manageAssignmentRules`). */
export function RoutingSettingsRoutes() {
  return (
    <RequireCapability capability="manageAssignmentRules" area="Assignment Rules">
      <AssignmentRulesScreen />
      <AssignmentRuleWizardDrawer />
      <RuleTestDrawer />
    </RequireCapability>
  );
}
