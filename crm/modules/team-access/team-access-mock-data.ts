import { branches, teams, users, whatsappNumbers } from '@crm/mock-data';
import type {
  AccessGrant,
  AssignmentRule,
  AuditEvent,
  BranchRecord,
  Department,
  Escalation,
  ExitDependency,
  FallbackQueue,
  PerformanceSnapshot,
  PermissionGroup,
  Role,
  TeamMember,
  TeamRecord,
  TransferBatch,
  WorkloadSummary,
} from './team-access-types';

/**
 * Deterministic Team & Access fixtures (adapter §6). Reuses the shared
 * tenant/branch/number/user records from `@crm/mock-data`; everything here is
 * the module's own administrative layer on top of them.
 */

export const departments: Department[] = [
  { id: 'dept_sales', name: 'Sales' },
  { id: 'dept_support', name: 'Support' },
  { id: 'dept_success', name: 'Customer Success' },
];

/* ------------------------------------------------------------------------ */
/* Roles                                                                     */
/* ------------------------------------------------------------------------ */

type Tier = 'owner' | 'admin' | 'manager' | 'team_lead' | 'team_member' | 'restricted';

const moduleActionMatrix: { id: string; label: string; actions: string[] }[] = [
  { id: 'inbox', label: 'Inbox & Conversations', actions: ['View conversations', 'Reply', 'Reassign', 'Close/reopen', 'Delete conversation'] },
  { id: 'contacts', label: 'Contacts & Companies', actions: ['View records', 'Create/edit', 'Change owner', 'Bulk import', 'Delete record'] },
  { id: 'campaigns', label: 'Campaigns & Automation', actions: ['View', 'Create/edit', 'Publish/send', 'Pause/stop'] },
  { id: 'team', label: 'Team & Access', actions: ['View people', 'Invite/edit member', 'Manage roles', 'Manage assignment rules', 'Start exit'] },
  { id: 'reports', label: 'Reports & Exports', actions: ['View reports', 'Export data', 'Download attachments'] },
];

const tierGrantDepth: Record<Tier, number> = {
  owner: 5,
  admin: 4,
  manager: 3,
  team_lead: 2,
  team_member: 1,
  restricted: 0,
};

/** Deterministically grants the first N actions per module for a tier so every role's matrix stays consistent. */
function buildPermissionGroups(tier: Tier): PermissionGroup[] {
  const depth = tierGrantDepth[tier];
  return moduleActionMatrix.map((group) => ({
    id: group.id,
    label: group.label,
    actions: group.actions.map((label, index) => ({
      id: `${group.id}_${index}`,
      label,
      granted: index < depth || (tier === 'owner' ? true : index === 0 && depth > 0),
    })),
  }));
}

const tierActingKey: Record<Tier, Role['actingRoleKey']> = {
  owner: 'owner',
  admin: 'owner',
  manager: 'manager',
  team_lead: 'manager',
  team_member: 'agent',
  restricted: 'agent',
};

const tierRisk: Record<Tier, Role['risk']> = {
  owner: 'high',
  admin: 'high',
  manager: 'elevated',
  team_lead: 'elevated',
  team_member: 'standard',
  restricted: 'standard',
};

const tierScope: Record<Tier, { level: Role['recordScopeLevel']; summary: string }> = {
  owner: { level: 'workspace', summary: 'All branches, teams and records' },
  admin: { level: 'workspace', summary: 'All branches, teams and records' },
  manager: { level: 'branch', summary: 'Own branch — all teams and records' },
  team_lead: { level: 'team', summary: 'Own team — team records only' },
  team_member: { level: 'own', summary: 'Own assigned and owned records only' },
  restricted: { level: 'own', summary: 'Own assigned records, read-mostly' },
};

function role(id: string, name: string, kind: Role['kind'], tier: Tier, description: string): Role {
  return {
    id,
    name,
    kind,
    actingRoleKey: tierActingKey[tier],
    description,
    recordScopeLevel: tierScope[tier].level,
    recordScopeSummary: tierScope[tier].summary,
    risk: tierRisk[tier],
    lastChangedAt: '2026-06-02T10:15:00+05:30',
    lastChangedBy: 'Anita Sharma',
    permissionGroups: buildPermissionGroups(tier),
    dataProtection: {
      maskPhone: tier === 'team_member' || tier === 'restricted',
      maskEmail: tier === 'restricted',
      allowCopy: tier !== 'restricted',
      allowDownload: tier === 'owner' || tier === 'admin' || tier === 'manager',
      allowExport: tier === 'owner' || tier === 'admin' || tier === 'manager',
      exceptions: tier === 'team_lead' ? ['May export own team records only'] : [],
    },
    isLastOwnerProtected: id === 'role_owner',
  };
}

export const roles: Role[] = [
  role('role_owner', 'Owner / Super Admin', 'standard', 'owner', 'Full workspace authority. Every workspace must retain at least one Owner.'),
  role('role_admin', 'Admin', 'standard', 'admin', 'Full operational administration across branches; cannot remove the last Owner.'),
  role('role_manager', 'Manager', 'standard', 'manager', 'Runs a branch: people, numbers, assignment and workload for that branch.'),
  role('role_team_lead', 'Team Lead', 'standard', 'team_lead', 'Runs a team: workload, handovers and day-to-day access within the team.'),
  role('role_team_member', 'Team Member', 'standard', 'team_member', 'Handles assigned work inside permitted numbers and teams.'),
  role('role_restricted', 'Restricted User', 'standard', 'restricted', 'Narrow, closely supervised access — typically temporary or trial staff.'),
  role(
    'role_bd_lead',
    'Business Development Lead',
    'custom',
    'team_lead',
    'Custom role: team-lead scope plus campaign publishing for outbound BD work.',
  ),
];

export function findRole(roleId: string): Role | undefined {
  return roles.find((r) => r.id === roleId);
}

/* ------------------------------------------------------------------------ */
/* Team members                                                              */
/* ------------------------------------------------------------------------ */

const capacity = (conv: [number, number | null], call: [number, number | null] = [0, null], lead: [number, number | null] = [0, null], task: [number, number | null] = [0, null], follow: [number, number | null] = [0, null]) => ({
  conversation: { current: conv[0], max: conv[1] },
  call: { current: call[0], max: call[1] },
  lead: { current: lead[0], max: lead[1] },
  task: { current: task[0], max: task[1] },
  follow_up: { current: follow[0], max: follow[1] },
});

export const teamMembers: TeamMember[] = [
  {
    id: 'member_anita',
    userId: 'user_anita',
    name: 'Anita Sharma',
    initials: 'AS',
    email: 'anita.sharma@northline.example',
    mobile: '+91 98110 00001',
    employmentStatus: 'active',
    inviteStatus: 'none',
    roleId: 'role_owner',
    branchIds: branches.map((b) => b.id),
    departmentIds: ['dept_sales'],
    teamIds: ['team_delhi_sales'],
    numberAccess: whatsappNumbers.map((n) => n.id),
    defaultNumberId: 'wa_delhi_sales',
    availability: 'available',
    capacityByWorkType: capacity([0, null], [0, null], [0, null], [0, null], [0, null]),
    managerId: null,
    title: 'Workspace Owner',
    invitedAt: null,
    joinedAt: '2023-01-10T09:00:00+05:30',
    lastActivityAt: '2026-08-11T09:20:00+05:30',
    twoFactorEnabled: true,
    activeSessionCount: 2,
  },
  {
    id: 'member_priya',
    userId: null,
    name: 'Priya Desai',
    initials: 'PD',
    email: 'priya.desai@northline.example',
    mobile: '+91 98110 00002',
    employmentStatus: 'active',
    inviteStatus: 'none',
    roleId: 'role_admin',
    branchIds: branches.map((b) => b.id),
    departmentIds: ['dept_sales', 'dept_support'],
    teamIds: ['team_delhi_sales', 'team_delhi_support'],
    numberAccess: ['wa_delhi_sales', 'wa_delhi_support', 'wa_mumbai_sales'],
    defaultNumberId: 'wa_delhi_sales',
    availability: 'available',
    capacityByWorkType: capacity([0, null], [0, null], [0, null], [0, null], [0, null]),
    managerId: 'member_anita',
    title: 'Workspace Admin',
    invitedAt: null,
    joinedAt: '2023-03-04T09:00:00+05:30',
    lastActivityAt: '2026-08-11T08:40:00+05:30',
    twoFactorEnabled: true,
    activeSessionCount: 1,
  },
  {
    id: 'member_vikram',
    userId: 'user_vikram',
    name: 'Vikram Rao',
    initials: 'VR',
    email: 'vikram.rao@northline.example',
    mobile: '+91 98110 00003',
    employmentStatus: 'active',
    inviteStatus: 'none',
    roleId: 'role_manager',
    branchIds: ['branch_delhi'],
    departmentIds: ['dept_sales'],
    teamIds: ['team_delhi_sales'],
    numberAccess: ['wa_delhi_sales', 'wa_delhi_support', 'wa_mumbai_sales'],
    defaultNumberId: 'wa_delhi_sales',
    availability: 'busy',
    capacityByWorkType: capacity([4, null], [2, null], [0, null], [0, null], [0, null]),
    managerId: 'member_anita',
    title: 'Branch Manager — Delhi NCR',
    invitedAt: null,
    joinedAt: '2023-02-01T09:00:00+05:30',
    lastActivityAt: '2026-08-11T09:05:00+05:30',
    twoFactorEnabled: true,
    activeSessionCount: 1,
  },
  {
    id: 'member_sanjay',
    userId: null,
    name: 'Sanjay Verma',
    initials: 'SV',
    email: 'sanjay.verma@northline.example',
    mobile: '+91 98110 00004',
    employmentStatus: 'active',
    inviteStatus: 'none',
    roleId: 'role_team_lead',
    branchIds: ['branch_delhi'],
    departmentIds: ['dept_sales'],
    teamIds: ['team_delhi_sales'],
    numberAccess: ['wa_delhi_sales'],
    defaultNumberId: 'wa_delhi_sales',
    availability: 'available',
    capacityByWorkType: capacity([6, 12], [1, 6], [3, 10], [2, null], [1, null]),
    managerId: 'member_vikram',
    title: 'Team Lead — Delhi Sales',
    invitedAt: null,
    joinedAt: '2023-06-12T09:00:00+05:30',
    lastActivityAt: '2026-08-11T09:15:00+05:30',
    twoFactorEnabled: true,
    activeSessionCount: 1,
  },
  {
    id: 'member_meera',
    userId: 'user_meera',
    name: 'Meera Nair',
    initials: 'MN',
    email: 'meera.nair@northline.example',
    mobile: '+91 98110 00005',
    employmentStatus: 'active',
    inviteStatus: 'none',
    roleId: 'role_team_member',
    branchIds: ['branch_delhi'],
    departmentIds: ['dept_sales'],
    teamIds: ['team_delhi_sales'],
    numberAccess: ['wa_delhi_sales'],
    defaultNumberId: 'wa_delhi_sales',
    availability: 'available',
    capacityByWorkType: capacity([7, 15], [2, 8], [4, 12], [1, null], [2, null]),
    managerId: 'member_sanjay',
    title: 'Sales Agent',
    invitedAt: null,
    joinedAt: '2023-09-18T09:00:00+05:30',
    lastActivityAt: '2026-08-11T09:22:00+05:30',
    twoFactorEnabled: false,
    activeSessionCount: 1,
  },
  {
    id: 'member_rohan',
    userId: 'user_rohan',
    name: 'Rohan Iyer',
    initials: 'RI',
    email: 'rohan.iyer@northline.example',
    mobile: '+91 98110 00006',
    employmentStatus: 'active',
    inviteStatus: 'none',
    roleId: 'role_team_member',
    branchIds: ['branch_delhi'],
    departmentIds: ['dept_sales'],
    teamIds: ['team_delhi_sales'],
    numberAccess: ['wa_delhi_sales'],
    defaultNumberId: 'wa_delhi_sales',
    // Overloaded fixture: every work type is at or over capacity.
    availability: 'busy',
    capacityByWorkType: capacity([18, 15], [9, 8], [13, 12], [4, 3], [5, 4]),
    managerId: 'member_sanjay',
    title: 'Sales Agent',
    invitedAt: null,
    joinedAt: '2024-01-08T09:00:00+05:30',
    lastActivityAt: '2026-08-11T07:50:00+05:30',
    twoFactorEnabled: false,
    activeSessionCount: 1,
  },
  {
    id: 'member_farida',
    userId: 'user_farida',
    name: 'Farida Khan',
    initials: 'FK',
    email: 'farida.khan@northline.example',
    mobile: '+91 98110 00007',
    employmentStatus: 'active',
    inviteStatus: 'none',
    roleId: 'role_team_member',
    branchIds: ['branch_delhi'],
    departmentIds: ['dept_support'],
    teamIds: ['team_delhi_support'],
    numberAccess: ['wa_delhi_support'],
    defaultNumberId: 'wa_delhi_support',
    // Unavailable-with-open-work fixture.
    availability: 'offline',
    capacityByWorkType: capacity([5, 15], [0, 6], [0, 8], [1, null], [2, null]),
    managerId: 'member_vikram',
    title: 'Support Agent',
    invitedAt: null,
    joinedAt: '2024-02-20T09:00:00+05:30',
    lastActivityAt: '2026-08-08T18:10:00+05:30',
    twoFactorEnabled: false,
    activeSessionCount: 0,
  },
  {
    id: 'member_karan',
    userId: 'user_karan',
    name: 'Karan Mehta',
    initials: 'KM',
    email: 'karan.mehta@northline.example',
    mobile: '+91 98110 00008',
    employmentStatus: 'active',
    inviteStatus: 'none',
    roleId: 'role_team_member',
    branchIds: ['branch_mumbai'],
    departmentIds: ['dept_sales'],
    teamIds: ['team_mumbai_sales'],
    // Deliberately no number access — demonstrates "no eligible assignee" / access-issue states.
    numberAccess: [],
    defaultNumberId: null,
    availability: 'busy',
    capacityByWorkType: capacity([3, 15], [1, 8], [2, 12], [0, null], [1, null]),
    managerId: 'member_vikram',
    title: 'Sales Agent',
    invitedAt: null,
    joinedAt: '2024-04-02T09:00:00+05:30',
    lastActivityAt: '2026-08-10T16:00:00+05:30',
    twoFactorEnabled: false,
    activeSessionCount: 1,
  },
  {
    id: 'member_neha',
    userId: null,
    name: 'Neha Gupta',
    initials: 'NG',
    email: 'neha.gupta@northline.example',
    mobile: '+91 98110 00009',
    employmentStatus: 'active',
    inviteStatus: 'none',
    roleId: 'role_restricted',
    branchIds: ['branch_delhi'],
    departmentIds: ['dept_support'],
    teamIds: ['team_delhi_support'],
    numberAccess: ['wa_delhi_support'],
    defaultNumberId: 'wa_delhi_support',
    availability: 'available',
    capacityByWorkType: capacity([2, 8], [0, 2], [0, 4], [0, null], [0, null]),
    managerId: 'member_vikram',
    title: 'Trial Support Agent',
    invitedAt: null,
    joinedAt: '2026-07-20T09:00:00+05:30',
    lastActivityAt: '2026-08-10T11:00:00+05:30',
    twoFactorEnabled: false,
    activeSessionCount: 1,
  },
  {
    id: 'member_arjun',
    userId: null,
    name: 'Arjun Malhotra',
    initials: 'AM',
    email: 'arjun.malhotra@northline.example',
    mobile: '+91 98110 00010',
    employmentStatus: 'pending',
    inviteStatus: 'pending',
    roleId: 'role_team_member',
    branchIds: ['branch_mumbai'],
    departmentIds: ['dept_sales'],
    teamIds: ['team_mumbai_sales'],
    numberAccess: ['wa_mumbai_sales'],
    defaultNumberId: 'wa_mumbai_sales',
    availability: 'offline',
    capacityByWorkType: capacity([0, 15], [0, 8], [0, 12], [0, null], [0, null]),
    managerId: 'member_vikram',
    title: 'Sales Agent (pending)',
    invitedAt: '2026-08-06T09:00:00+05:30',
    joinedAt: null,
    lastActivityAt: null,
    twoFactorEnabled: false,
    activeSessionCount: 0,
  },
  {
    id: 'member_ritu',
    userId: null,
    name: 'Ritu Kapoor',
    initials: 'RK',
    email: 'ritu.kapoor@northline.example',
    mobile: '+91 98110 00011',
    employmentStatus: 'inactive',
    inviteStatus: 'none',
    roleId: 'role_team_member',
    branchIds: ['branch_delhi'],
    departmentIds: ['dept_support'],
    teamIds: ['team_delhi_support'],
    numberAccess: [],
    defaultNumberId: null,
    availability: 'offline',
    capacityByWorkType: capacity([0, 15], [0, 8], [0, 12], [0, null], [0, null]),
    managerId: 'member_vikram',
    title: 'Former Support Agent',
    invitedAt: null,
    joinedAt: '2023-11-05T09:00:00+05:30',
    lastActivityAt: '2026-05-30T12:00:00+05:30',
    twoFactorEnabled: false,
    activeSessionCount: 0,
  },
  {
    id: 'member_farhan',
    userId: null,
    name: 'Farhan Sheikh',
    initials: 'FS',
    email: 'farhan.sheikh@northline.example',
    mobile: '+91 98110 00012',
    employmentStatus: 'pending',
    inviteStatus: 'expired',
    roleId: 'role_team_member',
    branchIds: ['branch_delhi'],
    departmentIds: ['dept_sales'],
    teamIds: ['team_delhi_sales'],
    numberAccess: ['wa_delhi_sales'],
    defaultNumberId: null,
    availability: 'offline',
    capacityByWorkType: capacity([0, 15], [0, 8], [0, 12], [0, null], [0, null]),
    managerId: 'member_sanjay',
    title: 'Sales Agent (invite expired)',
    invitedAt: '2026-07-01T09:00:00+05:30',
    joinedAt: null,
    lastActivityAt: null,
    twoFactorEnabled: false,
    activeSessionCount: 0,
  },
];

export function findMember(memberId: string): TeamMember | undefined {
  return teamMembers.find((m) => m.id === memberId);
}

export function findMemberByUserId(userId: string): TeamMember | undefined {
  return teamMembers.find((m) => m.userId === userId);
}

/* ------------------------------------------------------------------------ */
/* Teams / Branches overlay                                                  */
/* ------------------------------------------------------------------------ */

export const teamRecords: TeamRecord[] = [
  {
    id: 'team_delhi_sales',
    branchIds: ['branch_delhi'],
    crossBranch: false,
    departmentId: 'dept_sales',
    leadId: 'member_sanjay',
    memberIds: ['member_vikram', 'member_sanjay', 'member_meera', 'member_rohan', 'member_farhan'],
    numberIds: ['wa_delhi_sales'],
  },
  {
    id: 'team_delhi_support',
    branchIds: ['branch_delhi'],
    crossBranch: false,
    departmentId: 'dept_support',
    leadId: null,
    memberIds: ['member_farida', 'member_neha', 'member_ritu'],
    numberIds: ['wa_delhi_support'],
  },
  {
    id: 'team_mumbai_sales',
    branchIds: ['branch_mumbai'],
    crossBranch: false,
    departmentId: 'dept_sales',
    leadId: null,
    memberIds: ['member_karan', 'member_arjun'],
    numberIds: ['wa_mumbai_sales'],
  },
  {
    id: 'team_bengaluru_service',
    branchIds: ['branch_bengaluru'],
    crossBranch: false,
    departmentId: 'dept_support',
    leadId: null,
    // No coverage fixture: no active members yet, number is disconnected.
    memberIds: [],
    numberIds: ['wa_bengaluru_service'],
  },
  {
    id: 'team_central_success',
    branchIds: ['branch_delhi', 'branch_mumbai'],
    crossBranch: true,
    departmentId: 'dept_success',
    leadId: 'member_priya',
    memberIds: ['member_priya', 'member_vikram'],
    numberIds: ['wa_delhi_support', 'wa_mumbai_sales'],
  },
];

export function findTeamRecord(teamId: string): TeamRecord | undefined {
  return teamRecords.find((t) => t.id === teamId);
}

export const branchRecords: BranchRecord[] = [
  { id: 'branch_delhi', managerIds: ['member_vikram'], teamIds: ['team_delhi_sales', 'team_delhi_support'], numberIds: ['wa_delhi_sales', 'wa_delhi_support'] },
  { id: 'branch_mumbai', managerIds: ['member_vikram'], teamIds: ['team_mumbai_sales'], numberIds: ['wa_mumbai_sales'] },
  { id: 'branch_bengaluru', managerIds: [], teamIds: ['team_bengaluru_service'], numberIds: ['wa_bengaluru_service'] },
];

export function findBranchRecord(branchId: string): BranchRecord | undefined {
  return branchRecords.find((b) => b.id === branchId);
}

/** True when the tenant has more than one branch (drives conditional Branches nav). */
export const isMultiBranch = branches.length > 1;

/* ------------------------------------------------------------------------ */
/* Number access grants                                                      */
/* ------------------------------------------------------------------------ */

export const accessGrants: AccessGrant[] = [
  { id: 'grant_wa_delhi_sales_team', subjectType: 'team', subjectId: 'team_delhi_sales', numberId: 'wa_delhi_sales', canSend: true, canReceive: true, isDefault: true },
  { id: 'grant_wa_delhi_support_team', subjectType: 'team', subjectId: 'team_delhi_support', numberId: 'wa_delhi_support', canSend: true, canReceive: true, isDefault: true },
  { id: 'grant_wa_mumbai_sales_team', subjectType: 'team', subjectId: 'team_mumbai_sales', numberId: 'wa_mumbai_sales', canSend: true, canReceive: true, isDefault: true },
  { id: 'grant_wa_delhi_sales_meera', subjectType: 'user', subjectId: 'member_meera', numberId: 'wa_delhi_sales', canSend: true, canReceive: true, isDefault: true },
  { id: 'grant_wa_delhi_sales_rohan', subjectType: 'user', subjectId: 'member_rohan', numberId: 'wa_delhi_sales', canSend: true, canReceive: true, isDefault: true },
  { id: 'grant_wa_bengaluru_branch', subjectType: 'branch', subjectId: 'branch_bengaluru', numberId: 'wa_bengaluru_service', canSend: false, canReceive: false, isDefault: true },
];

/* ------------------------------------------------------------------------ */
/* Workload + performance                                                    */
/* ------------------------------------------------------------------------ */

export const workloadSummaries: WorkloadSummary[] = [
  { memberId: 'member_sanjay', openConversations: 6, overdueConversations: 0, callsDue: 1, callsOverdue: 0, leadsOpen: 3, tasksOpen: 2, followUpsOpen: 1, ownedContacts: 40, attention: 'none' },
  { memberId: 'member_meera', openConversations: 7, overdueConversations: 1, callsDue: 2, callsOverdue: 0, leadsOpen: 4, tasksOpen: 1, followUpsOpen: 2, ownedContacts: 58, attention: 'none' },
  { memberId: 'member_rohan', openConversations: 18, overdueConversations: 6, callsDue: 9, callsOverdue: 3, leadsOpen: 13, tasksOpen: 4, followUpsOpen: 5, ownedContacts: 71, attention: 'overloaded' },
  { memberId: 'member_farida', openConversations: 5, overdueConversations: 2, callsDue: 0, callsOverdue: 0, leadsOpen: 0, tasksOpen: 1, followUpsOpen: 2, ownedContacts: 33, attention: 'unavailable_with_work' },
  { memberId: 'member_karan', openConversations: 3, overdueConversations: 0, callsDue: 1, callsOverdue: 0, leadsOpen: 2, tasksOpen: 0, followUpsOpen: 1, ownedContacts: 22, attention: 'none' },
  { memberId: 'member_neha', openConversations: 2, overdueConversations: 0, callsDue: 0, callsOverdue: 0, leadsOpen: 0, tasksOpen: 0, followUpsOpen: 0, ownedContacts: 4, attention: 'underutilised' },
  { memberId: 'member_vikram', openConversations: 4, overdueConversations: 0, callsDue: 2, callsOverdue: 0, leadsOpen: 0, tasksOpen: 0, followUpsOpen: 0, ownedContacts: 12, attention: 'none' },
];

export function findWorkload(memberId: string): WorkloadSummary | undefined {
  return workloadSummaries.find((w) => w.memberId === memberId);
}

export const performanceSnapshots: PerformanceSnapshot[] = [
  { memberId: 'member_sanjay', assigned: 142, replied: 138, resolved: 121, overdue: 3, firstResponseMinutes: 6, resolutionHours: 4.2, followUpCompletionRate: 0.91, callsHandled: 34, dataAvailable: true },
  { memberId: 'member_meera', assigned: 165, replied: 160, resolved: 140, overdue: 5, firstResponseMinutes: 5, resolutionHours: 3.6, followUpCompletionRate: 0.88, callsHandled: 41, dataAvailable: true },
  { memberId: 'member_rohan', assigned: 210, replied: 178, resolved: 132, overdue: 22, firstResponseMinutes: 19, resolutionHours: 9.4, followUpCompletionRate: 0.54, callsHandled: 55, dataAvailable: true },
  { memberId: 'member_farida', assigned: 98, replied: 90, resolved: 80, overdue: 6, firstResponseMinutes: 11, resolutionHours: 6.1, followUpCompletionRate: 0.71, callsHandled: 12, dataAvailable: true },
  { memberId: 'member_karan', assigned: 60, replied: 55, resolved: 46, overdue: 1, firstResponseMinutes: 8, resolutionHours: 5.0, followUpCompletionRate: 0.8, callsHandled: 18, dataAvailable: true },
  // New-hire fixture: not enough history yet — must render "Not available", never 0.
  { memberId: 'member_neha', assigned: 0, replied: 0, resolved: 0, overdue: 0, firstResponseMinutes: null, resolutionHours: null, followUpCompletionRate: null, callsHandled: 0, dataAvailable: false },
];

export function findPerformance(memberId: string): PerformanceSnapshot | undefined {
  return performanceSnapshots.find((p) => p.memberId === memberId);
}

/* ------------------------------------------------------------------------ */
/* Assignment rules, fallback queues, escalations                            */
/* ------------------------------------------------------------------------ */

export const assignmentRules: AssignmentRule[] = [
  {
    id: 'rule_delhi_sales_default',
    name: 'Delhi Sales — default routing',
    scope: { branchId: 'branch_delhi', numberId: 'wa_delhi_sales' },
    priority: 1,
    conditions: [{ id: 'cond_1', field: 'team', operator: 'is', value: 'team_delhi_sales' }],
    strategy: 'owner_first_round_robin',
    ownerFirst: true,
    eligibleTeamIds: ['team_delhi_sales'],
    eligibleUserIds: [],
    respectCapacity: true,
    fallbackQueueId: 'queue_delhi_sales_fallback',
    status: 'active',
    version: 4,
    lastEditedAt: '2026-07-28T11:00:00+05:30',
    lastEditedBy: 'Vikram Rao',
    unmatchedLast7d: 2,
  },
  {
    id: 'rule_delhi_support_vip',
    name: 'Delhi Support — VIP tag priority',
    scope: { branchId: 'branch_delhi', numberId: 'wa_delhi_support' },
    priority: 1,
    conditions: [{ id: 'cond_2', field: 'tag', operator: 'is', value: 'vip' }],
    strategy: 'named_user',
    ownerFirst: false,
    eligibleTeamIds: [],
    eligibleUserIds: ['member_farida'],
    respectCapacity: false,
    fallbackQueueId: 'queue_delhi_support_fallback',
    status: 'active',
    version: 2,
    lastEditedAt: '2026-07-15T09:30:00+05:30',
    lastEditedBy: 'Priya Desai',
    unmatchedLast7d: 0,
  },
  {
    id: 'rule_delhi_support_escalations',
    name: 'Delhi Support — escalation follow-up',
    scope: { branchId: 'branch_delhi', numberId: 'wa_delhi_support' },
    priority: 2,
    conditions: [{ id: 'cond_4', field: 'source', operator: 'is', value: 'escalation' }],
    strategy: 'named_user',
    ownerFirst: false,
    eligibleTeamIds: [],
    // Loop-risk fixture: the fallback queue below resolves to the exact same
    // person as the eligible pool, so falling back never reaches anyone new.
    eligibleUserIds: ['member_neha'],
    respectCapacity: false,
    fallbackQueueId: 'queue_delhi_support_escalations_fallback',
    status: 'active',
    version: 1,
    lastEditedAt: '2026-07-30T16:10:00+05:30',
    lastEditedBy: 'Priya Desai',
    unmatchedLast7d: 3,
  },
  {
    id: 'rule_mumbai_sales_default',
    name: 'Mumbai Sales — default routing',
    scope: { branchId: 'branch_mumbai', numberId: 'wa_mumbai_sales' },
    priority: 2,
    conditions: [{ id: 'cond_3', field: 'branch', operator: 'is', value: 'branch_mumbai' }],
    strategy: 'round_robin',
    ownerFirst: false,
    eligibleTeamIds: ['team_mumbai_sales'],
    eligibleUserIds: [],
    respectCapacity: true,
    // Deliberately no fallback — used by the "no fallback" validation state.
    fallbackQueueId: null,
    status: 'draft',
    version: 1,
    lastEditedAt: '2026-08-04T14:20:00+05:30',
    lastEditedBy: 'Vikram Rao',
    unmatchedLast7d: 9,
  },
];

export function findAssignmentRule(ruleId: string): AssignmentRule | undefined {
  return assignmentRules.find((r) => r.id === ruleId);
}

export const fallbackQueues: FallbackQueue[] = [
  { id: 'queue_delhi_sales_fallback', name: 'Delhi Sales — fallback', scope: 'Delhi NCR · Sales', waiting: 5, oldestWaitMinutes: 38, slaRisk: 'watch', memberIds: ['team_delhi_sales'].flatMap(() => ['member_sanjay', 'member_meera']) },
  { id: 'queue_delhi_support_fallback', name: 'Delhi Support — fallback', scope: 'Delhi NCR · Support', waiting: 2, oldestWaitMinutes: 12, slaRisk: 'none', memberIds: ['member_farida', 'member_neha'] },
  { id: 'queue_delhi_support_escalations_fallback', name: 'Delhi Support — escalation fallback', scope: 'Delhi NCR · Support', waiting: 4, oldestWaitMinutes: 51, slaRisk: 'breach', memberIds: ['member_neha'] },
  { id: 'queue_unassigned', name: 'Unassigned — all branches', scope: 'Workspace-wide', waiting: 9, oldestWaitMinutes: 96, slaRisk: 'breach', memberIds: [] },
];

export function findFallbackQueue(queueId: string): FallbackQueue | undefined {
  return fallbackQueues.find((q) => q.id === queueId);
}

export const escalations: Escalation[] = [
  {
    id: 'esc_001',
    reason: 'sla_breach',
    contactId: null,
    contactName: 'Kabir Sons Trading',
    conversationId: null,
    currentOwnerId: 'member_rohan',
    currentAssigneeId: 'member_rohan',
    receivingTeamId: 'team_delhi_sales',
    slaMinutesRemaining: -34,
    handoverNoteComplete: false,
    createdAt: '2026-08-11T07:10:00+05:30',
    status: 'pending',
  },
  {
    id: 'esc_002',
    reason: 'complaint',
    contactId: null,
    contactName: 'Meenal Enterprises',
    conversationId: null,
    currentOwnerId: 'member_farida',
    currentAssigneeId: null,
    receivingTeamId: 'team_delhi_support',
    slaMinutesRemaining: 22,
    handoverNoteComplete: true,
    createdAt: '2026-08-11T08:05:00+05:30',
    status: 'pending',
  },
  {
    id: 'esc_003',
    reason: 'high_value',
    contactId: null,
    contactName: 'Orbit Logistics',
    conversationId: null,
    currentOwnerId: 'member_karan',
    currentAssigneeId: 'member_karan',
    receivingTeamId: 'team_mumbai_sales',
    slaMinutesRemaining: 140,
    handoverNoteComplete: true,
    createdAt: '2026-08-10T15:40:00+05:30',
    status: 'accepted',
  },
];

export function findEscalation(id: string): Escalation | undefined {
  return escalations.find((e) => e.id === id);
}

/* ------------------------------------------------------------------------ */
/* Transfers                                                                 */
/* ------------------------------------------------------------------------ */

export const transferBatches: TransferBatch[] = [
  {
    id: 'transfer_001',
    sourceMemberId: 'member_rohan',
    groups: [
      { entityType: 'conversation', count: 6 },
      { entityType: 'task', count: 4 },
    ],
    recipientType: 'user',
    recipientId: 'member_meera',
    ownershipMode: 'current_work_only',
    note: 'Redistributing overload ahead of the weekend.',
    createdAt: '2026-08-10T10:00:00+05:30',
    createdBy: 'Vikram Rao',
    status: 'partial',
    results: [
      { entityType: 'conversation', succeeded: 5, failed: 1, skipped: 0, reasons: ['1 conversation locked by an active escalation'] },
      { entityType: 'task', succeeded: 4, failed: 0, skipped: 0, reasons: [] },
    ],
  },
];

/* ------------------------------------------------------------------------ */
/* Exit dependencies (fixture for member_farida / member_ritu style exits)   */
/* ------------------------------------------------------------------------ */

export function exitDependenciesFor(memberId: string): ExitDependency[] {
  const workload = findWorkload(memberId);
  const member = findMember(memberId);
  return [
    { category: 'roles_memberships', label: 'Roles & team memberships', count: (member?.teamIds.length ?? 0) + 1, transferRequired: false, defaultRecipientId: null, defaultRecipientType: null, status: 'pending' },
    { category: 'number_access', label: 'WhatsApp number access', count: member?.numberAccess.length ?? 0, transferRequired: false, defaultRecipientId: null, defaultRecipientType: null, status: 'pending' },
    { category: 'sessions_tokens', label: 'Active sessions & tokens', count: member?.activeSessionCount ?? 0, transferRequired: false, defaultRecipientId: null, defaultRecipientType: null, status: 'pending' },
    { category: 'owned_contacts', label: 'Owned contacts & companies', count: workload?.ownedContacts ?? 0, transferRequired: true, defaultRecipientId: member?.managerId ?? null, defaultRecipientType: 'user', status: 'pending' },
    { category: 'conversations', label: 'Open conversations', count: workload?.openConversations ?? 0, transferRequired: true, defaultRecipientId: member?.teamIds[0] ?? null, defaultRecipientType: 'team', status: 'pending' },
    { category: 'calls', label: 'Scheduled / overdue calls', count: (workload?.callsDue ?? 0) + (workload?.callsOverdue ?? 0), transferRequired: true, defaultRecipientId: member?.teamIds[0] ?? null, defaultRecipientType: 'team', status: 'pending' },
    { category: 'tasks_follow_ups', label: 'Tasks & follow-ups', count: (workload?.tasksOpen ?? 0) + (workload?.followUpsOpen ?? 0), transferRequired: true, defaultRecipientId: member?.managerId ?? null, defaultRecipientType: 'user', status: 'pending' },
    { category: 'approvals', label: 'Pending approvals', count: 0, transferRequired: false, defaultRecipientId: null, defaultRecipientType: null, status: 'pending' },
    { category: 'campaign_workflow', label: 'Campaign / workflow dependencies', count: 1, transferRequired: true, defaultRecipientId: member?.managerId ?? null, defaultRecipientType: 'user', status: 'pending' },
  ];
}

/* ------------------------------------------------------------------------ */
/* Audit                                                                     */
/* ------------------------------------------------------------------------ */

export const auditEvents: AuditEvent[] = [
  {
    id: 'audit_001',
    actorId: 'member_anita',
    actorName: 'Anita Sharma',
    targetType: 'role',
    targetId: 'role_admin',
    targetLabel: 'Admin role',
    type: 'role_access',
    summary: 'Granted "Manage assignment rules" to the Admin role',
    before: 'Manage assignment rules: Off',
    after: 'Manage assignment rules: On',
    reason: 'Delegating routing configuration to workspace admins.',
    branchId: null,
    numberId: null,
    sourceIp: '49.36.88.101',
    sessionLabel: 'Chrome on Windows · Delhi office',
    timestamp: '2026-08-09T11:22:00+05:30',
    relatedEventIds: [],
    sensitive: false,
  },
  {
    id: 'audit_002',
    actorId: 'member_vikram',
    actorName: 'Vikram Rao',
    targetType: 'number',
    targetId: 'wa_delhi_sales',
    targetLabel: 'Northline Sales — Delhi',
    type: 'number_access',
    summary: 'Added Rohan Iyer to Northline Sales — Delhi access',
    before: 'Not granted',
    after: 'Send + Receive',
    reason: 'Covering increased inbound volume this week.',
    branchId: 'branch_delhi',
    numberId: 'wa_delhi_sales',
    sourceIp: '49.36.88.114',
    sessionLabel: 'Chrome on Windows · Delhi office',
    timestamp: '2026-08-08T09:41:00+05:30',
    relatedEventIds: [],
    sensitive: false,
  },
  {
    id: 'audit_003',
    actorId: 'member_vikram',
    actorName: 'Vikram Rao',
    targetType: 'member',
    targetId: 'member_rohan',
    targetLabel: 'Rohan Iyer',
    type: 'assignment_ownership',
    summary: 'Redistributed 6 conversations and 4 leads to Meera Nair',
    before: '18 open conversations, 13 open leads',
    after: '12 open conversations, 9 open leads',
    reason: 'Overload redistribution — 1 conversation could not be moved (active escalation).',
    branchId: 'branch_delhi',
    numberId: 'wa_delhi_sales',
    sourceIp: '49.36.88.114',
    sessionLabel: 'Chrome on Windows · Delhi office',
    timestamp: '2026-08-10T10:02:00+05:30',
    relatedEventIds: [],
    sensitive: false,
  },
  {
    id: 'audit_004',
    actorId: 'member_priya',
    actorName: 'Priya Desai',
    targetType: 'member',
    targetId: 'member_arjun',
    targetLabel: 'Arjun Malhotra',
    type: 'member',
    summary: 'Invited Arjun Malhotra as Sales Agent — Mumbai',
    before: null,
    after: 'Invitation sent, pending acceptance',
    reason: null,
    branchId: 'branch_mumbai',
    numberId: 'wa_mumbai_sales',
    sourceIp: '106.51.20.44',
    sessionLabel: 'Chrome on macOS · Mumbai office',
    timestamp: '2026-08-06T09:00:00+05:30',
    relatedEventIds: [],
    sensitive: false,
  },
  {
    id: 'audit_005',
    actorId: 'member_vikram',
    actorName: 'Vikram Rao',
    targetType: 'member',
    targetId: 'member_ritu',
    targetLabel: 'Ritu Kapoor',
    type: 'offboarding',
    summary: 'Started exit — access blocked immediately',
    before: 'Active',
    after: 'Inactive — access blocked',
    reason: 'Voluntary resignation, last day 2026-05-30.',
    branchId: 'branch_delhi',
    numberId: null,
    sourceIp: '49.36.88.114',
    sessionLabel: 'Chrome on Windows · Delhi office',
    timestamp: '2026-05-30T12:05:00+05:30',
    relatedEventIds: ['audit_006'],
    sensitive: true,
  },
  {
    id: 'audit_006',
    actorId: 'member_vikram',
    actorName: 'Vikram Rao',
    targetType: 'member',
    targetId: 'member_ritu',
    targetLabel: 'Ritu Kapoor',
    type: 'offboarding',
    summary: 'Exit transfer completed with 1 item requiring manual follow-up',
    before: null,
    after: 'Owned contacts transferred; 1 campaign dependency needs manual reassignment',
    reason: null,
    branchId: 'branch_delhi',
    numberId: null,
    sourceIp: '49.36.88.114',
    sessionLabel: 'Chrome on Windows · Delhi office',
    timestamp: '2026-05-30T12:11:00+05:30',
    relatedEventIds: ['audit_005'],
    sensitive: true,
  },
  {
    id: 'audit_007',
    actorId: 'member_anita',
    actorName: 'Anita Sharma',
    targetType: 'record',
    targetId: 'export_audit_2026_08',
    targetLabel: 'Audit export — August 2026',
    type: 'export',
    summary: 'Exported audit history (Aug 1–11, all branches)',
    before: null,
    after: null,
    reason: 'Monthly compliance review.',
    branchId: null,
    numberId: null,
    sourceIp: '49.36.88.101',
    sessionLabel: 'Chrome on Windows · Delhi office',
    timestamp: '2026-08-11T08:00:00+05:30',
    relatedEventIds: [],
    sensitive: false,
  },
];

export function findAuditEvent(id: string): AuditEvent | undefined {
  return auditEvents.find((e) => e.id === id);
}

/* Re-export shared fixtures Team & Access reads without redefining. */
export { branches, teams, users, whatsappNumbers };
