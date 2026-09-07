import type { FlowNode } from '../domain/types';
import { answerTypeLabel } from '../automation-labels';

/** One-line canvas summary for a node card — enough to recognise it at a glance. */
export function nodeSummary(node: FlowNode): string {
  switch (node.type) {
    case 'send_message': {
      const c = node.config;
      if (c.mode === 'text') return c.text?.trim() ? c.text : 'No message text yet';
      if (c.mode === 'media') return c.mediaLabel ? `Media: ${c.mediaLabel}` : 'No media selected';
      if (c.mode === 'template') return c.templateName ? `Template: ${c.templateName}` : 'No template selected';
      return c.text?.trim() ? `Interactive: ${c.text}` : 'No interactive message yet';
    }
    case 'question':
      return node.config.prompt.trim() ? `${answerTypeLabel[node.config.answerType]} — "${node.config.prompt}"` : 'No question text yet';
    case 'simple_branch':
      return `${node.config.branches.length} branch${node.config.branches.length === 1 ? '' : 'es'} + fallback`;
    case 'delay_wait': {
      const c = node.config;
      if (c.mode === 'duration') return c.durationValue ? `Wait ${c.durationValue} ${c.durationUnit}` : 'No duration set';
      if (c.mode === 'until_datetime') return c.untilDateTime ? `Wait until ${c.untilDateTime}` : 'No date/time set';
      return 'Wait for a reply';
    }
    case 'update_contact':
      return node.config.updates.length ? `${node.config.updates.length} update${node.config.updates.length === 1 ? '' : 's'}` : 'No updates configured';
    case 'human_handover':
      return node.config.targetLabel ? `To: ${node.config.targetLabel}` : 'No handover target set';
    case 'ai_agent_handoff':
      return node.config.agentName ? `Agent: ${node.config.agentName}` : 'No AI Agent selected';
    case 'end':
      return node.config.outcomeLabel || 'Ends the flow';
    case 'api_call':
      return node.config.endpointLabel || 'API action';
    case 'webhook':
      return node.config.webhookLabel || 'Webhook';
    case 'external_integration':
      return node.config.integrationName || 'External integration';
    default:
      return 'Phase 2 — not configurable yet';
  }
}
