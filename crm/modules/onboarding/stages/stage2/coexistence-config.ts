/**
 * Coexistence capabilities/limitations — kept as data, not hard-coded policy
 * copy inline in the component, so a future workspace-level policy source can
 * replace this fixture without touching the screen (SKILL.md "Coexistence
 * acknowledgement").
 */
export const coexistenceStaysInApp = [
  'Sending/receiving from the phone that has the Business App installed',
  'Business profile photo, hours and catalogue managed from the app',
];

export const coexistenceAppearsInCrm = [
  'All conversations, assigned to your team in one shared Inbox',
  'Templates, campaigns and automation sent through the CRM',
  'Reporting across every conversation regardless of which side replied',
];

export const coexistenceLimitations = [
  'Only one device can have the Business App open at a time',
  'Some contact/label edits made in the app take a few minutes to sync',
];
