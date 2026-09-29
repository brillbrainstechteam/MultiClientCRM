import { STARTER_TEMPLATES, type StarterTemplate } from '@crm/modules/templates/data/starter-library';

/**
 * Which ready template a journey touchpoint should suggest.
 *
 * Keyed by the step keys in ProspectJourney; the values are `suggestedName`
 * from the marketing department's library. Steps that are calls or physical
 * items (intro call, thank-you creative, welcome kit) have no message to
 * suggest and are deliberately absent — the link only appears where a real
 * template exists.
 */
export const STEP_TEMPLATE: Record<string, string> = {
  // Prospect touchpoints
  introCall: 'mkt_exports_system_approaching_new_prospects',
  digitalCollateral: 'mkt_marketing_pr_check_our_whatsapp_catalogue',
  videoCall: 'mkt_corporate_mark_call_email_to_align_a_meeting',
  virtualMeeting: 'mkt_infuencer_mark_align_virtaual_meeting',
  fieldVisit: 'mkt_field_marketin_tele_appointment_confirmation',
  officeVisit: 'mkt_field_marketin_office_visit_nice_meeting',
  marketingCollateral: 'mkt_marketing_pr_new_collection_arrival',
  // Post-exhibition nurture
  introMessage: 'mkt_customer_commu_intro_message',
  thankYou: 'mkt_post_exhibitio_follow_up_with_thank_you_new_client',
};

export function templateForStep(stepKey: string): StarterTemplate | null {
  const suggested = STEP_TEMPLATE[stepKey];
  if (!suggested) return null;
  return STARTER_TEMPLATES.find((t) => t.suggestedName === suggested) ?? null;
}
