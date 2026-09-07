import { Badge, Button, Drawer } from '@crm/design-system';
import { setupIssueContent } from './issue-config';

export interface SetupIssueDrawerProps {
  open: boolean;
  issueId: string | null;
  onClose: () => void;
}

/** C15 — Setup Issue drawer. What happened / what to do / who can fix it. */
export function SetupIssueDrawer({ open, issueId, onClose }: SetupIssueDrawerProps) {
  const content = issueId ? setupIssueContent[issueId] : undefined;

  return (
    <Drawer open={open && Boolean(content)} title={content?.title ?? 'Setup issue'} onClose={onClose} footer={<Button variant="primary" onClick={onClose}>Close</Button>}>
      {content ? (
        <div className="crm-issue-drawer">
          <section>
            <h3>What happened?</h3>
            <p>{content.whatHappened}</p>
          </section>
          <section>
            <h3>What do you need to do?</h3>
            <p>{content.whatToDo}</p>
          </section>
          <section>
            <h3>Who can fix it?</h3>
            <Badge tone={content.who === 'You' ? 'warning' : 'info'}>{content.who}</Badge>
          </section>
          <details className="crm-issue-drawer__technical">
            <summary>Technical Details</summary>
            <code>{content.technical}</code>
          </details>
        </div>
      ) : null}
    </Drawer>
  );
}
