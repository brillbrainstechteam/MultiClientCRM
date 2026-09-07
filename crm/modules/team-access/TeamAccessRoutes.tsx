import type { ComponentType } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireCapability } from './components';
import { TeamAccessLayout } from './TeamAccessLayout';
import { TeamAccessScreenPlaceholder } from './TeamAccessScreenPlaceholder';
import type { Capability } from './permissions';
import AuditScreen from './screens/AuditScreen';
import BranchDetailScreen from './screens/BranchDetailScreen';
import MemberProfileScreen from './screens/MemberProfileScreen';
import OverviewScreen from './screens/OverviewScreen';
import PeopleScreen from './screens/PeopleScreen';
import PerformanceScreen from './screens/PerformanceScreen';
import StructureScreen from './screens/StructureScreen';
import TeamWorkspaceScreen from './screens/TeamWorkspaceScreen';
import WorkDistributionScreen from './screens/WorkDistributionScreen';
import { teamAccessPages, type TeamAccessScreen } from './team-access-manifest';

/** Screens implemented so far, keyed by manifest path. Everything else stays a registered placeholder. */
const implemented: Record<string, ComponentType> = {
  '/team-access': OverviewScreen,
  '/team-access/people': PeopleScreen,
  '/team-access/people/:memberId': MemberProfileScreen,
  '/team-access/structure': StructureScreen,
  '/team-access/teams/:teamId': TeamWorkspaceScreen,
  '/team-access/branches/:branchId': BranchDetailScreen,
  '/team-access/work': WorkDistributionScreen,
  '/team-access/performance': PerformanceScreen,
  '/team-access/audit': AuditScreen,
};

/** Deep-link capability guards (CLAUDE.md §9): an unauthorised role gets a restricted state, not the view. */
const routeGuards: Record<string, { capability: Capability; area: string }> = {
  '/team-access/people': { capability: 'viewPeople', area: 'People' },
  '/team-access/people/:memberId': { capability: 'viewPeople', area: 'Member Profile' },
  '/team-access/structure': { capability: 'manageTeamsBranches', area: 'Structure' },
  '/team-access/teams/:teamId': { capability: 'manageTeamsBranches', area: 'Team Workspace' },
  '/team-access/branches/:branchId': { capability: 'manageTeamsBranches', area: 'Branch Detail' },
  '/team-access/work': { capability: 'manageWorkload', area: 'Work Distribution' },
  '/team-access/performance': { capability: 'viewPerformance', area: 'Performance' },
  '/team-access/audit': { capability: 'viewAudit', area: 'Audit' },
};

function childPath(screen: TeamAccessScreen): string {
  return screen.path.replace(/^\/team-access\/?/, '');
}

function screenElement(screen: TeamAccessScreen) {
  const Implemented = implemented[screen.path];
  const element = Implemented ? <Implemented /> : <TeamAccessScreenPlaceholder screen={screen} />;
  const guard = routeGuards[screen.path];
  return guard ? (
    <RequireCapability capability={guard.capability} area={guard.area}>
      {element}
    </RequireCapability>
  ) : (
    element
  );
}

function screenRoute(screen: TeamAccessScreen) {
  const relative = childPath(screen);
  const element = screenElement(screen);
  if (relative === '') {
    return <Route key={screen.path} index element={element} />;
  }
  return <Route key={screen.path} path={relative} element={element} />;
}

/** Team & Access route table (adapter route contract). */
export function TeamAccessRoutes() {
  return (
    <Routes>
      <Route element={<TeamAccessLayout />}>
        {teamAccessPages.map(screenRoute)}
        <Route path="*" element={<Navigate to="/team-access" replace />} />
      </Route>
    </Routes>
  );
}
