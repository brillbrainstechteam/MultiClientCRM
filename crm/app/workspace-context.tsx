import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  branches,
  findBranch,
  findTeam,
  findWhatsAppNumber,
  users,
  whatsappNumbers,
  workspace,
} from '@crm/mock-data';
import type {
  Branch,
  ModuleKey,
  RoleKey,
  Team,
  User,
  WhatsAppNumber,
  Workspace,
} from '@crm/mock-data';

/**
 * Global scope for the prototype: which tenant, which acting user/role, which
 * branch and which WhatsApp number the screen is being viewed under.
 *
 * Everything is derived from the URL so a route is fully reproducible for
 * Figma capture. There is no hidden internal state:
 *   ?role=agent            — act as owner | manager | agent (default: owner)
 *   ?branchId=branch_delhi — branch scope, or `all`
 *   ?scope=delhi           — shorthand alias for branchId (03_GLOBAL rules)
 *   ?whatsappNumberId=…    — WhatsApp number scope, or `all`
 */

export const ALL_SCOPE = 'all';

export interface WorkspaceContextValue {
  workspace: Workspace;
  currentUser: User;
  role: RoleKey;
  team: Team | undefined;
  /** `undefined` means "all permitted branches". */
  branch: Branch | undefined;
  branchId: string;
  /** `undefined` means "all permitted numbers". */
  whatsappNumber: WhatsAppNumber | undefined;
  whatsappNumberId: string;
  /** Branches the acting user may select. */
  availableBranches: Branch[];
  /** WhatsApp numbers the acting user may select, respecting branch scope. */
  availableWhatsAppNumbers: WhatsAppNumber[];
  /** Modules enabled for the tenant AND visible to the acting role. */
  visibleModules: ModuleKey[];
  setScope: (next: { role?: RoleKey; branchId?: string; whatsappNumberId?: string }) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

/** Modules the workspace enables but a role must not even see. */
const roleHiddenModules: Record<RoleKey, ModuleKey[]> = {
  owner: [],
  manager: ['billing'],
  agent: ['billing', 'team-access', 'reports', 'automation', 'ai-assistance'],
};

/** `?scope=delhi` style shorthands resolved against branch ids. */
function resolveBranchParam(raw: string | null): string {
  if (!raw) return ALL_SCOPE;
  if (raw === ALL_SCOPE) return ALL_SCOPE;
  if (findBranch(raw)) return raw;
  const shorthand = branches.find((branch) => branch.id === `branch_${raw.toLowerCase()}`);
  return shorthand ? shorthand.id : ALL_SCOPE;
}

function resolveRoleParam(raw: string | null): RoleKey {
  return raw === 'manager' || raw === 'agent' || raw === 'owner' ? raw : 'owner';
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const value = useMemo<WorkspaceContextValue>(() => {
    const role = resolveRoleParam(searchParams.get('role'));
    const currentUser = users.find((user) => user.role === role) ?? users[0];

    const availableBranches =
      role === 'owner'
        ? branches
        : branches.filter(
            (branch) =>
              branch.id === currentUser.branchId ||
              whatsappNumbers.some(
                (number) =>
                  number.branchId === branch.id &&
                  currentUser.permittedWhatsAppNumberIds.includes(number.id),
              ),
          );

    const requestedBranchId = resolveBranchParam(
      searchParams.get('branchId') ?? searchParams.get('scope'),
    );
    const branchId =
      requestedBranchId !== ALL_SCOPE &&
      availableBranches.some((branch) => branch.id === requestedBranchId)
        ? requestedBranchId
        : ALL_SCOPE;
    const branch = branchId === ALL_SCOPE ? undefined : findBranch(branchId);

    const availableWhatsAppNumbers = whatsappNumbers.filter((number) => {
      const permitted =
        currentUser.permittedWhatsAppNumberIds.includes(number.id) &&
        number.permittedRoles.includes(role);
      const inBranch = branchId === ALL_SCOPE || number.branchId === branchId;
      return permitted && inBranch;
    });

    const requestedNumberId = searchParams.get('whatsappNumberId') ?? ALL_SCOPE;
    const whatsappNumberId = availableWhatsAppNumbers.some(
      (number) => number.id === requestedNumberId,
    )
      ? requestedNumberId
      : ALL_SCOPE;
    const whatsappNumber =
      whatsappNumberId === ALL_SCOPE ? undefined : findWhatsAppNumber(whatsappNumberId);

    const hidden = roleHiddenModules[role];
    const visibleModules = workspace.enabledModules.filter(
      (moduleKey) => !hidden.includes(moduleKey),
    );

    const setScope: WorkspaceContextValue['setScope'] = (next) => {
      setSearchParams(
        (previous) => {
          const params = new URLSearchParams(previous);
          // `scope` is only an input alias — collapse it to the canonical key.
          params.delete('scope');

          if (next.role !== undefined) {
            params.set('role', next.role);
            // Role change invalidates narrower scope selections.
            params.delete('branchId');
            params.delete('whatsappNumberId');
          }
          if (next.branchId !== undefined) {
            if (next.branchId === ALL_SCOPE) params.delete('branchId');
            else params.set('branchId', next.branchId);
            params.delete('whatsappNumberId');
          }
          if (next.whatsappNumberId !== undefined) {
            if (next.whatsappNumberId === ALL_SCOPE) params.delete('whatsappNumberId');
            else params.set('whatsappNumberId', next.whatsappNumberId);
          }
          return params;
        },
        { replace: false },
      );
    };

    return {
      workspace,
      currentUser,
      role,
      team: findTeam(currentUser.teamId),
      branch,
      branchId,
      whatsappNumber,
      whatsappNumberId,
      availableBranches,
      availableWhatsAppNumbers,
      visibleModules,
      setScope,
    };
  }, [searchParams, setSearchParams]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used inside <WorkspaceProvider>.');
  }
  return context;
}
