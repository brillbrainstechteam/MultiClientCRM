export interface SetupIssueContent {
  title: string;
  whatHappened: string;
  whatToDo: string;
  who: 'You' | 'Previous provider' | 'Our support' | 'Meta';
  technical: string;
}

/**
 * Setup Issue translations keyed by connection-progress step id (SKILL.md
 * "Setup issues" — What happened / What do you need to do / Who can fix it).
 * Kept as data so new issue types don't require new components.
 */
export const setupIssueContent: Record<string, SetupIssueContent> = {
  'meta-return': {
    title: 'Meta signup did not complete',
    whatHappened: 'Meta returned without granting the access this CRM needs, or reported an error mid-signup.',
    whatToDo: 'Check that you are an admin on the Meta Business account and try again. If it keeps failing, our support team can investigate with you.',
    who: 'Our support',
    technical: 'embedded_signup_return_state != completed',
  },
  account: {
    title: 'Account connection issue',
    whatHappened: 'Meta could not confirm system-user access to your Business account.',
    whatToDo: 'Re-open the Meta connection step and re-authorise business access.',
    who: 'You',
    technical: 'system_user_token_invalid: business_management scope not granted.',
  },
  number: {
    title: 'Number registration issue',
    whatHappened: 'The phone number could not be registered on the WhatsApp Business Platform.',
    whatToDo: 'This usually means the number is still registered elsewhere. If it was on another provider, they may need to release it first.',
    who: 'Previous provider',
    technical: 'phone_number_registration_failed: number already registered on another Cloud API app.',
  },
  messages: {
    title: 'Messaging connection issue',
    whatHappened: 'A test message could not be sent through the new connection.',
    whatToDo: 'Our support team can check the Cloud API messaging endpoint for this number.',
    who: 'Our support',
    technical: 'test_message_send_failed: 131056 rate/permission error from Graph API.',
  },
  webhooks: {
    title: 'Receiving updates is not connected',
    whatHappened: 'The webhook subscription that delivers incoming messages to your Inbox did not confirm.',
    whatToDo: 'This is a backend configuration step — our support team can usually fix it without any action from you.',
    who: 'Our support',
    technical: 'webhook_subscription_unconfirmed: callback verification timed out after 3 attempts.',
  },
  profile: {
    title: 'Business profile did not sync',
    whatHappened: 'Your business profile details could not be pulled from Meta yet.',
    whatToDo: 'This is optional and does not block going live — it will retry automatically.',
    who: 'Meta',
    technical: 'business_profile_sync_pending: Meta profile propagation delay.',
  },
  templates: {
    title: 'Templates check pending',
    whatHappened: 'Existing approved templates have not been imported yet.',
    whatToDo: 'Optional — you can create templates directly in the Templates module at any time.',
    who: 'Meta',
    technical: 'template_import_pending.',
  },
  test: {
    title: 'Connection test not complete',
    whatHappened: 'The end-to-end test message has not been confirmed delivered yet.',
    whatToDo: 'Usually resolves once the steps above complete. Contact support if it stays stuck for more than a few minutes.',
    who: 'Our support',
    technical: 'e2e_test_message_unconfirmed.',
  },
};
