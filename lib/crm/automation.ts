import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import { graphBase } from '@/lib/meta/config';

/**
 * Automation — lean "trigger -> conditions -> actions" rules, executed on
 * inbound WhatsApp messages (Option B in docs/OPEN_ITEMS). Rules are stored in
 * CrmAutomationRule and are disabled by default. Supported here:
 *   triggers:  inbound_message | first_message | keyword
 *   conditions:[{ field:'text', op:'contains'|'equals', value }]
 *   actions:   [{type:'send_message', text}] | [{type:'add_tag', tag}]
 *            | [{type:'set_lead_status', value}]
 * The visual flow-builder + full trigger set (Option A) remain open.
 */

interface RuleCondition { field?: string; op?: string; value?: string }
interface RuleAction { type?: string; text?: string; tag?: string; value?: string }

interface InboundContext {
  tenantId: string;
  phoneNumberId: string;
  from: string;            // customer's wa id (digits, no '+')
  text: string;
  isFirstMessage: boolean;
  accessToken: string | null; // encrypted token of the sending account
}

const textMatches = (conds: RuleCondition[], text: string): boolean => {
  const t = text.toLowerCase();
  return conds.every((c) => {
    if (c.field && c.field !== 'text') return true; // only text conditions are evaluated for now
    const v = (c.value ?? '').toLowerCase();
    if (!v) return true;
    return c.op === 'equals' ? t.trim() === v : t.includes(v);
  });
};

const triggerFires = (trigger: string, ctx: InboundContext, conds: RuleCondition[]): boolean => {
  switch (trigger) {
    case 'first_message': return ctx.isFirstMessage;
    case 'keyword': return conds.some((c) => (c.value ?? '') && ctx.text.toLowerCase().includes((c.value ?? '').toLowerCase()));
    case 'inbound_message': return true;
    default: return false;
  }
};

async function sendText(ctx: InboundContext, body: string): Promise<void> {
  if (!ctx.accessToken || !body) return;
  const token = decrypt(ctx.accessToken);
  const res = await fetch(`${graphBase()}/${ctx.phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: ctx.from, type: 'text', text: { body } }),
  });
  const json = (await res.json().catch(() => ({}))) as { messages?: Array<{ id?: string }> };
  if (!res.ok) return;
  const convo = await prisma.conversation.upsert({
    where: { tenantId_phoneNumberId_contactPhone: { tenantId: ctx.tenantId, phoneNumberId: ctx.phoneNumberId, contactPhone: ctx.from } },
    update: { lastMessageAt: new Date() },
    create: { tenantId: ctx.tenantId, phoneNumberId: ctx.phoneNumberId, contactPhone: ctx.from, lastMessageAt: new Date() },
  });
  await prisma.message.create({
    data: { conversationId: convo.id, waMessageId: json.messages?.[0]?.id ?? null, direction: 'outbound', type: 'text', text: body, status: 'sent' },
  }).catch(() => undefined);
}

async function applyActions(ctx: InboundContext, actions: RuleAction[]): Promise<void> {
  for (const a of actions) {
    if (a.type === 'send_message' && a.text) {
      await sendText(ctx, a.text);
    } else if (a.type === 'add_tag' && a.tag) {
      const c = await prisma.crmContact.findFirst({ where: { tenantId: ctx.tenantId, mobile: `+${ctx.from}` }, select: { id: true, tags: true } });
      if (c && !c.tags.includes(a.tag)) {
        await prisma.crmContact.update({ where: { id: c.id }, data: { tags: { set: [...c.tags, a.tag] } } });
      }
    } else if (a.type === 'set_lead_status' && a.value) {
      await prisma.crmContact.updateMany({ where: { tenantId: ctx.tenantId, mobile: `+${ctx.from}` }, data: { leadStatus: a.value } });
    }
  }
}

/** Evaluate + run all enabled inbound-triggered rules for the tenant. Best-effort. */
export async function runInboundAutomations(ctx: InboundContext): Promise<void> {
  const rules = await prisma.crmAutomationRule.findMany({
    where: { tenantId: ctx.tenantId, enabled: true, trigger: { in: ['inbound_message', 'first_message', 'keyword'] } },
  });
  for (const rule of rules) {
    const conds = (Array.isArray(rule.conditions) ? rule.conditions : []) as RuleCondition[];
    const actions = (Array.isArray(rule.actions) ? rule.actions : []) as RuleAction[];
    if (!triggerFires(rule.trigger, ctx, conds)) continue;
    if (!textMatches(conds, ctx.text)) continue;
    try {
      await applyActions(ctx, actions);
      await prisma.crmAutomationRule.update({ where: { id: rule.id }, data: { runCount: { increment: 1 }, lastRunAt: new Date() } });
    } catch {
      // never let one rule break the webhook
    }
  }
}
