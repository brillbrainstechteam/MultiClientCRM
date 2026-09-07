import {
  Bot,
  FileText,
  MessageCircle,
  PhoneCall,
  Radio,
  RefreshCw,
  ShoppingBag,
  StickyNote,
  UserCog,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { findUser } from '@crm/mock-data';
import type { ActivityItem, ActivityKind } from '@crm/mock-data';

const kindIcon: Record<ActivityKind, LucideIcon> = {
  whatsapp: MessageCircle,
  call: PhoneCall,
  note: StickyNote,
  'stage-change': RefreshCw,
  assignment: UserCog,
  consent: Radio,
  order: ShoppingBag,
  import: FileText,
  system: Bot,
};

/** One entry in the Customer 360 activity timeline (CON-S03). */
export function TimelineItem({ item, isLast = false }: { item: ActivityItem; isLast?: boolean }) {
  const Icon = kindIcon[item.kind];
  const actor = item.actorId ? findUser(item.actorId)?.name : null;

  return (
    <li className="crm-timeline-item">
      <div className="crm-timeline-item__rail">
        <span className={`crm-timeline-item__marker crm-timeline-item__marker--${item.kind}`}>
          <Icon aria-hidden="true" />
        </span>
        {!isLast ? <span className="crm-timeline-item__line" /> : null}
      </div>
      <div className="crm-timeline-item__body">
        <div className="crm-timeline-item__head">
          <span className="crm-timeline-item__summary">{item.summary}</span>
          <time className="crm-timeline-item__time">{formatWhen(item.at)}</time>
        </div>
        {item.detail ? <p className="crm-timeline-item__detail">{item.detail}</p> : null}
        {actor ? <span className="crm-timeline-item__actor">by {actor}</span> : null}
      </div>
    </li>
  );
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
