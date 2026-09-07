import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@crm/design-system';
import { advancedNodeLabel, coreNodeLabel } from '../automation-labels';
import { coreNodeTypes, advancedNodeTypes, phase2NodeTypes } from '../domain/types';
import { nodeIcon } from './node-icons';

const basicHints: Record<string, string> = {
  send_message: 'Text, media, approved template or interactive message',
  question: 'Capture an answer and save it to the contact',
  simple_branch: 'Route by answer, reply/no reply, or a field match',
  delay_wait: 'Wait a duration, until a time, or for a reply',
  update_contact: 'Set a field, tag, stage, owner, priority or follow-up',
  human_handover: 'Hand the conversation to a user, team or branch',
  ai_agent_handoff: 'Hand off to an existing AI Agent',
  end: 'Finish this path',
};

const advancedHints: Record<string, string> = {
  api_call: 'Call an external API action (needs an integration)',
  webhook: 'Trigger an outbound webhook (needs an integration)',
  external_integration: 'Use a connected third-party integration',
  advanced_condition: 'Nested AND/OR condition groups',
  random_split: 'Random or workload-based split routing',
  commerce_action: 'Cart, checkout and order-lifecycle actions',
};

/**
 * Reference legend for available step types (AUTOMATION_GENERATION_SPEC.md
 * §5 "Left palette"). Basic is open by default, Advanced is collapsed. Node
 * creation itself happens from the canvas's connection picker (see
 * `NodeConnectionPicker`), which lists the same catalogue — that keeps a
 * single source of truth for "what can I add" while staying fully
 * keyboard-accessible instead of relying on drag-and-drop.
 */
export function BuilderPalette() {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <aside className="crm-aut-palette" aria-label="Step palette">
      <section className="crm-aut-palette__section">
        <h3 className="crm-aut-palette__heading">Basic</h3>
        <ul className="crm-aut-palette__list">
          {coreNodeTypes.map((type) => {
            const Icon = nodeIcon[type];
            return (
              <li key={type} className="crm-aut-palette__item">
                <span className="crm-aut-palette__item-icon" aria-hidden="true">
                  <Icon size={16} />
                </span>
                <span>
                  <p className="crm-aut-palette__item-label">{coreNodeLabel[type]}</p>
                  <p className="crm-aut-palette__item-hint">{basicHints[type]}</p>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="crm-aut-palette__section">
        <button
          type="button"
          className="crm-aut-palette__toggle"
          aria-expanded={advancedOpen}
          onClick={() => setAdvancedOpen((open) => !open)}
        >
          {advancedOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <h3 className="crm-aut-palette__heading">Advanced</h3>
        </button>
        {advancedOpen ? (
          <ul className="crm-aut-palette__list">
            {advancedNodeTypes.map((type) => {
              const Icon = nodeIcon[type];
              const isPhase2 = phase2NodeTypes.includes(type);
              return (
                <li key={type} className="crm-aut-palette__item">
                  <span className="crm-aut-palette__item-icon" aria-hidden="true">
                    <Icon size={16} />
                  </span>
                  <span>
                    <p className="crm-aut-palette__item-label">
                      {advancedNodeLabel[type]}
                      {isPhase2 ? (
                        <Badge tone="neutral" appearance="outline">
                          Phase 2
                        </Badge>
                      ) : null}
                    </p>
                    <p className="crm-aut-palette__item-hint">{advancedHints[type]}</p>
                  </span>
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>
    </aside>
  );
}
