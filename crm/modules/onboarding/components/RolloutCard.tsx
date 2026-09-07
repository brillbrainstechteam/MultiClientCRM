
/**
 * C18 — Rollout guidance. Concise non-blocking cards, not a questionnaire
 * (SKILL.md "Rollout guidance"). Content kept as a list here so a future
 * policy source can replace it without touching the layout.
 */
const guidance = [
  'Start with customers who have opted in or messaged you recently.',
  'Make sure your business is clearly identifiable in the first message.',
  'Increase outbound volume gradually rather than all at once.',
  'Watch your quality rating and pause if it drops.',
  'Respect blocks, reports and opt-outs immediately.',
];

export function RolloutCard() {
  return (
    <section className="crm-optional-card">
      <header className="crm-optional-card__head">
        <div>
          <h3>Rolling out safely</h3>
          <p>A few guidelines before you send at volume.</p>
        </div>
      </header>
      <ul className="crm-rollout-list">
        {guidance.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
    </section>
  );
}
