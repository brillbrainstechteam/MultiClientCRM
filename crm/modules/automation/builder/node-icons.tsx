import {
  Bot,
  Clock,
  Flag,
  GitBranch,
  Headset,
  HelpCircle,
  ListTree,
  MessageSquare,
  Plug,
  Puzzle,
  Shuffle,
  ShoppingCart,
  UserCog,
  Webhook,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { FlowNodeType } from '../domain/types';

export const nodeIcon: Record<FlowNodeType, LucideIcon> = {
  send_message: MessageSquare,
  question: HelpCircle,
  simple_branch: GitBranch,
  delay_wait: Clock,
  update_contact: UserCog,
  human_handover: Headset,
  ai_agent_handoff: Bot,
  end: Flag,
  api_call: Plug,
  webhook: Webhook,
  external_integration: Puzzle,
  advanced_condition: ListTree,
  random_split: Shuffle,
  commerce_action: ShoppingCart,
};
