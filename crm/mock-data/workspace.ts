import type { Branch, Team, User, WhatsAppNumber, Workspace } from './types';

/**
 * Deterministic tenant fixtures. IDs are human-readable and stable so Figma
 * captures of the same route always render identical content.
 */

export let branches: Branch[] = [
  { id: 'branch_delhi', name: 'Delhi NCR', city: 'New Delhi' },
  { id: 'branch_mumbai', name: 'Mumbai West', city: 'Mumbai' },
  { id: 'branch_bengaluru', name: 'Bengaluru South', city: 'Bengaluru' },
];

export let whatsappNumbers: WhatsAppNumber[] = [
  {
    id: 'wa_delhi_sales',
    displayNumber: '+91 98110 20001',
    displayName: 'Northline Sales — Delhi',
    brand: 'Northline Retail',
    branchId: 'branch_delhi',
    department: 'Sales',
    connectionStatus: 'connected',
    qualityRating: 'high',
    messagingLimit: '10K / 24h',
    permittedRoles: ['owner', 'manager', 'agent'],
  },
  {
    id: 'wa_delhi_support',
    displayNumber: '+91 98110 20002',
    displayName: 'Northline Support — Delhi',
    brand: 'Northline Retail',
    branchId: 'branch_delhi',
    department: 'Support',
    connectionStatus: 'connected',
    qualityRating: 'medium',
    messagingLimit: '10K / 24h',
    permittedRoles: ['owner', 'manager', 'agent'],
  },
  {
    id: 'wa_mumbai_sales',
    displayNumber: '+91 98200 30011',
    displayName: 'Northline Sales — Mumbai',
    brand: 'Northline Retail',
    branchId: 'branch_mumbai',
    department: 'Sales',
    connectionStatus: 'degraded',
    qualityRating: 'low',
    messagingLimit: '1K / 24h',
    permittedRoles: ['owner', 'manager'],
  },
  {
    id: 'wa_bengaluru_service',
    displayNumber: '+91 96860 40021',
    displayName: 'Northline Service — Bengaluru',
    brand: 'Northline Service',
    branchId: 'branch_bengaluru',
    department: 'Service',
    connectionStatus: 'disconnected',
    qualityRating: 'unrated',
    messagingLimit: '—',
    permittedRoles: ['owner'],
  },
];

export let teams: Team[] = [
  { id: 'team_delhi_sales', name: 'Delhi Sales', branchId: 'branch_delhi' },
  { id: 'team_delhi_support', name: 'Delhi Support', branchId: 'branch_delhi' },
  { id: 'team_mumbai_sales', name: 'Mumbai Sales', branchId: 'branch_mumbai' },
];

export let users: User[] = [
  {
    id: 'user_anita',
    name: 'Anita Sharma',
    initials: 'AS',
    email: 'anita.sharma@northline.example',
    role: 'owner',
    roleLabel: 'Workspace Owner',
    teamId: 'team_delhi_sales',
    branchId: 'branch_delhi',
    permittedWhatsAppNumberIds: [
      'wa_delhi_sales',
      'wa_delhi_support',
      'wa_mumbai_sales',
      'wa_bengaluru_service',
    ],
    availability: 'available',
  },
  {
    id: 'user_vikram',
    name: 'Vikram Rao',
    initials: 'VR',
    email: 'vikram.rao@northline.example',
    role: 'manager',
    roleLabel: 'Branch Manager — Delhi NCR',
    teamId: 'team_delhi_sales',
    branchId: 'branch_delhi',
    permittedWhatsAppNumberIds: ['wa_delhi_sales', 'wa_delhi_support', 'wa_mumbai_sales'],
    availability: 'busy',
  },
  {
    id: 'user_meera',
    name: 'Meera Nair',
    initials: 'MN',
    email: 'meera.nair@northline.example',
    role: 'agent',
    roleLabel: 'Sales Agent',
    teamId: 'team_delhi_sales',
    branchId: 'branch_delhi',
    permittedWhatsAppNumberIds: ['wa_delhi_sales'],
    availability: 'available',
  },
  /* Additional team roster — Dashboard Team Workload widget needs more than one
     agent per branch to show overloaded/inactive variety. `findUserByRole`
     still resolves to the three users above (first match wins), so this is a
     purely additive extension that does not change any existing behaviour. */
  {
    id: 'user_rohan',
    name: 'Rohan Iyer',
    initials: 'RI',
    email: 'rohan.iyer@northline.example',
    role: 'agent',
    roleLabel: 'Sales Agent',
    teamId: 'team_delhi_sales',
    branchId: 'branch_delhi',
    permittedWhatsAppNumberIds: ['wa_delhi_sales'],
    availability: 'busy',
  },
  {
    id: 'user_farida',
    name: 'Farida Khan',
    initials: 'FK',
    email: 'farida.khan@northline.example',
    role: 'agent',
    roleLabel: 'Support Agent',
    teamId: 'team_delhi_support',
    branchId: 'branch_delhi',
    permittedWhatsAppNumberIds: ['wa_delhi_support'],
    availability: 'offline',
  },
  {
    id: 'user_karan',
    name: 'Karan Mehta',
    initials: 'KM',
    email: 'karan.mehta@northline.example',
    role: 'agent',
    roleLabel: 'Sales Agent',
    teamId: 'team_mumbai_sales',
    branchId: 'branch_mumbai',
    permittedWhatsAppNumberIds: [],
    availability: 'busy',
  },
];

export const workspace: Workspace = {
  id: 'workspace_northline',
  name: 'Northline Retail',
  legalName: 'Northline Retail Pvt. Ltd.',
  plan: 'growth',
  enabledModules: [
    'dashboard',
    'contacts',
    'inbox',
    'calling',
    'templates',
    'campaigns',
    'automation',
    'catalogue-orders',
    'team-access',
    'ai-assistance',
    'reports',
    'settings',
    'billing',
  ],
  branchIds: branches.map((branch) => branch.id),
  whatsappNumberIds: whatsappNumbers.map((number) => number.id),
};

export function findUser(userId: string): User | undefined {
  return users.find((user) => user.id === userId);
}

export function findUserByRole(role: User['role']): User {
  const match = users.find((user) => user.role === role);
  // Owner is always present, so this fallback is only a type guard.
  return match ?? users[0];
}

export function findBranch(branchId: string): Branch | undefined {
  return branches.find((branch) => branch.id === branchId);
}

export function findWhatsAppNumber(numberId: string): WhatsAppNumber | undefined {
  return whatsappNumbers.find((number) => number.id === numberId);
}

export function findTeam(teamId: string): Team | undefined {
  return teams.find((team) => team.id === teamId);
}


/** Replace workspace reference data with real DB rows (hydration). */
export function setWorkspaceData(next: {
  branches?: Branch[]; whatsappNumbers?: WhatsAppNumber[]; teams?: Team[]; users?: User[];
}): void {
  if (next.branches) branches = next.branches;
  if (next.whatsappNumbers) whatsappNumbers = next.whatsappNumbers;
  if (next.teams) teams = next.teams;
  if (next.users) users = next.users;
}
