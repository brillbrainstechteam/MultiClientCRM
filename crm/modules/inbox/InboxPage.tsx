/**
 * INB-S01 — Inbox Workspace entry point.
 *
 * URL state contract (CODE_FIRST_ADAPTER.md):
 *   ?view=mine|unassigned|needs-reply|pending|overdue|resolved|spam|all
 *   ?conversation=conv_id
 *   ?searchMode=contacts|messages&q=...
 *   ?focusMessage=msg_id  (deep-focus for message search)
 *   ?drawer=filters|customer|save-customer|template-picker|attachments|activity|ai-tasks
 *   ?popover=assign|status|labels|quick-replies|message-status&message=id|message-failure&message=id
 *   ?modal=new-chat|follow-up|spam|forward&message=id|handoff
 *   ?mode=bulk&selected=conv_001,conv_002
 *   ?state=loading|empty|view-empty|disconnected|window-expiring|window-expired|restricted
 *   Filter params: ?f_statuses=open,pending&f_assignees=user_meera&f_labels=lbl_hot_lead
 */

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { findItem } from '@crm/modules/catalogue-orders/data';
import {
  PenSquare,
  SlidersHorizontal,
  Search,
  X,
  MessageSquareDashed,
  BarChart2,
  Settings,
  CheckSquare,
  Maximize2,
} from 'lucide-react';
import {
  IconButton,
  SearchField,
  Select,
  PermissionRestricted,
  DisconnectedState,
  LoadingSkeleton,
  Drawer,
} from '@crm/design-system';
import { useWorkspace, ALL_SCOPE } from '@crm/app/workspace-context';
import { useScopedHref } from '@crm/app/use-scoped-href';
import { contacts } from '@crm/mock-data';
import type { QuickViewKey, ConversationSortKey, SearchMode, InboxFilterState, InboxMessage, InboxTemplate, AiSuggestedTask } from './inbox-types';
import { emptyFilterState, isFilterActive } from './inbox-types';
import {
  allConversations,
  conversationMessages,
  findConversation,
  findActivityEvents,
  findAiTasks,
} from './inbox-mock-data';
import {
  getConversationsForView,
  quickViewCounts,
  defaultViewForRole,
  searchConversationsByContact,
  searchConversationsByMessage,
} from './inbox-selectors';
import type { MessageSearchResult } from './inbox-selectors';
import { inboxPolicyFor } from './inbox-role-policy';
import {
  ConversationRow,
  ConversationHeader,
  MessageHistory,
  ComposerShell,
  CustomerContextShell,
  InboxFilterDrawer,
  ActiveFilterChips,
  TemplatePicker,
  QuickRepliesPopover,
  AttachmentPicker,
  ForwardMessage,
  MessageStatusPopover,
  MessageFailurePopover,
  AssignPopover,
  StatusPopover,
  LabelsPopover,
  ActivityDrawer,
  SaveCustomerDrawer,
  NewChatModal,
  BulkToolbar,
  SpamModal,
  HandoffModal,
  AiTasksDrawer,
} from './components';
import type { ComposerMode } from './components';

const SORT_OPTIONS: { value: ConversationSortKey; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'sla-urgent', label: 'SLA urgent' },
  { value: 'unread', label: 'Most unread' },
];

// ---- Filter param helpers --------------------------------------------------

function filtersFromParams(params: URLSearchParams): InboxFilterState {
  function csv(key: string): string[] {
    const v = params.get(key);
    return v ? v.split(',').filter(Boolean) : [];
  }
  return {
    assigneeIds: csv('f_assignees'),
    teamIds: csv('f_teams'),
    labelIds: csv('f_labels'),
    statuses: csv('f_statuses') as Array<'open' | 'pending' | 'resolved'>,
    whatsappNumberIds: csv('f_numbers'),
    branchIds: csv('f_branches'),
    replyStatuses: csv('f_reply'),
    responseWindowStatuses: csv('f_window') as Array<'active' | 'expiring' | 'expired'>,
    dateFrom: params.get('f_from'),
    dateTo: params.get('f_to'),
  };
}

function filtersToParams(f: InboxFilterState, prev: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(prev);
  function setOrDelete(key: string, values: string[]) {
    if (values.length > 0) next.set(key, values.join(','));
    else next.delete(key);
  }
  setOrDelete('f_assignees', f.assigneeIds);
  setOrDelete('f_teams', f.teamIds);
  setOrDelete('f_labels', f.labelIds);
  setOrDelete('f_statuses', f.statuses);
  setOrDelete('f_numbers', f.whatsappNumberIds);
  setOrDelete('f_branches', f.branchIds);
  setOrDelete('f_reply', f.replyStatuses);
  setOrDelete('f_window', f.responseWindowStatuses);
  if (f.dateFrom) next.set('f_from', f.dateFrom); else next.delete('f_from');
  if (f.dateTo) next.set('f_to', f.dateTo); else next.delete('f_to');
  return next;
}

// ---- InboxPage ------------------------------------------------------------

export default function InboxPage({ standalone = false }: { standalone?: boolean } = {}) {
  const { role, currentUser, branchId, whatsappNumberId } = useWorkspace();
  const [searchParams, setSearchParams] = useSearchParams();
  const scopedHref = useScopedHref();
  const navigate = useNavigate();

  const policy = inboxPolicyFor(role);

  /** Pop the inbox out into a focused, chrome-free window (carries current scope + view). */
  function openInNewWindow() {
    const qs = searchParams.toString();
    window.open(
      `/inbox-window${qs ? `?${qs}` : ''}`,
      'talktrack-inbox',
      'popup,width=1440,height=900',
    );
  }

  // ---- Local prototype state -----------------------------------------------

  // Mark-read: prototype behavior
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  // Per-conversation overrides (Batch 3 interactions)
  const [convAssignees, setConvAssignees] = useState<Map<string, { userId: string | null; teamId: string | null }>>(new Map());
  const [convStatuses, setConvStatuses] = useState<Map<string, 'open' | 'pending' | 'resolved'>>(new Map());
  const [convLabels, setConvLabels] = useState<Map<string, string[]>>(new Map());

  // Spam state overrides
  const [convSpam, setConvSpam] = useState<Map<string, boolean>>(new Map());

  // AI task status overrides
  const [, setAiTaskStatuses] = useState<Map<string, AiSuggestedTask['status']>>(new Map());

  // Locally sent messages per conversation (appended on send)
  const [localMessages, setLocalMessages] = useState<Map<string, InboxMessage[]>>(new Map());

  // Reply-to context
  const [replyToMessage, setReplyToMessage] = useState<InboxMessage | null>(null);

  // Quick reply insert (text injected into composer)
  const [pendingComposerInsert, setPendingComposerInsert] = useState('');

  // Message selected for forward
  const [forwardMessage, setForwardMessage] = useState<InboxMessage | null>(null);

  // "More" queue dropdown (low-frequency queues live here — spec §3/§4)
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  // ---- URL state parsing --------------------------------------------------
  const forceState = searchParams.get('state');
  const view = (searchParams.get('view') ?? defaultViewForRole(role)) as QuickViewKey;
  const activeConvId = searchParams.get('conversation');
  const searchMode = (searchParams.get('searchMode') ?? 'contacts') as SearchMode;
  const searchQuery = searchParams.get('q') ?? '';
  const isSearchMode = searchParams.has('searchMode') || searchQuery.length > 0;
  const sortKey = (searchParams.get('sort') ?? 'newest') as ConversationSortKey;
  const isBulkMode = searchParams.get('mode') === 'bulk';
  const selectedIds = (searchParams.get('selected') ?? '').split(',').filter(Boolean);
  const activeDrawer = searchParams.get('drawer');
  const activePopover = searchParams.get('popover');
  const activeModal = searchParams.get('modal');
  const popoverMessageId = searchParams.get('message');
  const focusMessageId = searchParams.get('focusMessage');
  const filters = filtersFromParams(searchParams);

  // ---- Force states -------------------------------------------------------
  if (forceState === 'restricted') {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <PermissionRestricted
          title="Inbox access restricted"
          description="You don't have permission to view the Inbox. Contact your workspace admin."
        />
      </div>
    );
  }

  if (forceState === 'disconnected') {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <DisconnectedState
          title="WhatsApp number disconnected"
          description="The selected WhatsApp number is not connected. Check your number settings."
        />
      </div>
    );
  }

  // ---- Filtered conversation list -----------------------------------------
  const allScoped = getConversationsForView(
    role,
    currentUser.id,
    whatsappNumberId === ALL_SCOPE ? 'all' : whatsappNumberId,
    branchId === ALL_SCOPE ? 'all' : branchId,
    view,
    filters,
    sortKey,
  );

  // Search
  let conversations = allScoped;
  let msgSearchResults: MessageSearchResult[] = [];

  if (isSearchMode) {
    if (searchMode === 'contacts') {
      conversations = searchConversationsByContact(allScoped, searchQuery, contacts);
    } else {
      const result = searchConversationsByMessage(allScoped, searchQuery, conversationMessages as Record<string, Array<{ id: string; text: string; direction: string; at: string; isNote: boolean }>>);
      conversations = result.conversations;
      msgSearchResults = result.results;
    }
  }

  const viewCounts = quickViewCounts(allConversations, currentUser.id, role);
  const primaryViews = viewCounts.filter((v) => v.group === 'primary');
  const moreViews = viewCounts.filter((v) => v.group === 'more');
  const activeViewIsMore = moreViews.some((v) => v.key === view);
  const activeConv = activeConvId ? findConversation(activeConvId) : null;

  // Effective values with local overrides applied
  const effectiveAssignee = activeConvId
    ? (convAssignees.get(activeConvId) ?? { userId: activeConv?.assigneeId ?? null, teamId: activeConv?.teamId ?? null })
    : { userId: null, teamId: null };
  const effectiveStatus = activeConvId
    ? (convStatuses.get(activeConvId) ?? activeConv?.status ?? 'open') as 'open' | 'pending' | 'resolved'
    : 'open';
  const effectiveLabels = activeConvId
    ? (convLabels.get(activeConvId) ?? activeConv?.labelIds ?? [])
    : [];
  const effectiveIsSpam = activeConvId
    ? (convSpam.get(activeConvId) ?? activeConv?.isSpam ?? false)
    : false;
  const activeAiTasks = activeConvId ? findAiTasks(activeConvId) : [];

  // Merge mock messages + locally sent messages
  const baseMockMessages: InboxMessage[] = activeConvId ? (conversationMessages[activeConvId] ?? []) : [];
  const sentMessages = activeConvId ? (localMessages.get(activeConvId) ?? []) : [];
  const activeMessages: InboxMessage[] = [...baseMockMessages, ...sentMessages];

  // Find popover target message
  const popoverMessage = popoverMessageId
    ? activeMessages.find((m) => m.id === popoverMessageId) ?? null
    : null;

  const isLoading = forceState === 'loading';
  const isViewEmpty = !isLoading && conversations.length === 0;
  const filtersActive = isFilterActive(filters);

  // ---- URL helpers --------------------------------------------------------
  function setConversation(id: string) {
    setReadIds((prev) => new Set([...prev, id]));
    setReplyToMessage(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('conversation', id);
      next.delete('mode');
      next.delete('selected');
      next.delete('focusMessage');
      next.delete('popover');
      next.delete('message');
      return next;
    });
  }

  function setView(v: QuickViewKey) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('view', v);
      next.delete('conversation');
      return next;
    });
  }

  function setSort(s: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('sort', s);
      return next;
    });
  }

  function openSearchMode(mode: SearchMode) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('searchMode', mode);
      return next;
    });
  }

  function closeSearch() {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('searchMode');
      next.delete('q');
      return next;
    });
  }

  function setQuery(q: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (q) next.set('q', q);
      else next.delete('q');
      return next;
    });
  }

  function openOverlay(key: 'drawer' | 'popover' | 'modal', value: string, extra?: Record<string, string>) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set(key, value);
      if (extra) Object.entries(extra).forEach(([k, v]) => next.set(k, v));
      return next;
    });
  }

  function closeOverlay(key: 'drawer' | 'popover' | 'modal') {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete(key);
      next.delete('message');
      return next;
    });
  }

  function toggleBulkSelect(id: string, checked: boolean) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      const ids = (next.get('selected') ?? '').split(',').filter(Boolean);
      if (checked) {
        if (!ids.includes(id)) ids.push(id);
      } else {
        const i = ids.indexOf(id);
        if (i !== -1) ids.splice(i, 1);
      }
      next.set('selected', ids.join(','));
      if (!next.has('mode')) next.set('mode', 'bulk');
      return next;
    });
  }

  function enterBulkMode() {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('mode', 'bulk');
      if (!next.has('selected')) next.set('selected', '');
      return next;
    });
  }

  function exitBulkMode() {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('mode');
      next.delete('selected');
      return next;
    });
  }

  /** Spec §28/§29 — select every conversation matching the active filters. */
  function selectAllMatching() {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('mode', 'bulk');
      next.set('selected', conversations.map((c) => c.id).join(','));
      return next;
    });
  }

  function applyFilters(f: InboxFilterState) {
    setSearchParams((prev) => {
      const next = filtersToParams(f, prev);
      next.delete('drawer');
      return next;
    });
  }

  function clearFilter(key: keyof InboxFilterState, value?: string) {
    setSearchParams((prev) => {
      const current = filtersFromParams(prev);
      const next = { ...current } as unknown as Record<keyof InboxFilterState, unknown>;
      if (value !== undefined) {
        const arr = current[key] as string[];
        next[key] = arr.filter((v) => v !== value);
      } else {
        next[key] = Array.isArray(current[key]) ? [] : null;
      }
      return filtersToParams(next as unknown as InboxFilterState, prev);
    });
  }

  function resetFilters() {
    setSearchParams((prev) => filtersToParams(emptyFilterState(), prev));
  }

  function goBackToList() {
    setReplyToMessage(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('conversation');
      return next;
    });
  }

  function focusMessage(convId: string, msgId: string) {
    setReadIds((prev) => new Set([...prev, convId]));
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('conversation', convId);
      next.set('focusMessage', msgId);
      return next;
    });
  }

  // ---- Messaging ----------------------------------------------------------

  const handleSend = useCallback((text: string, mode: ComposerMode, replyToId?: string) => {
    if (!activeConvId) return;
    const now = new Date().toISOString();
    const newMsg: InboxMessage = {
      id: `local_${Date.now()}`,
      conversationId: activeConvId,
      kind: 'text',
      direction: 'outbound',
      text,
      status: 'sending',
      statusDetail: { sentAt: null, deliveredAt: null, readAt: null, failedAt: null, failureReason: null, failureCode: null },
      sentById: currentUser.id,
      isAutomated: false,
      isNote: mode === 'note',
      mentionedUserIds: [],
      replyToMessageId: replyToId ?? null,
      at: now,
    };
    setLocalMessages((prev) => {
      const next = new Map(prev);
      const existing = next.get(activeConvId) ?? [];
      next.set(activeConvId, [...existing, newMsg]);
      return next;
    });

    // Simulate sending → sent → delivered progression
    setTimeout(() => {
      setLocalMessages((prev) => {
        const next = new Map(prev);
        const msgs = next.get(activeConvId) ?? [];
        next.set(activeConvId, msgs.map((m) =>
          m.id === newMsg.id
            ? { ...m, status: 'sent' as const, statusDetail: { ...m.statusDetail, sentAt: new Date().toISOString() } }
            : m,
        ));
        return next;
      });
    }, 800);

    setTimeout(() => {
      setLocalMessages((prev) => {
        const next = new Map(prev);
        const msgs = next.get(activeConvId) ?? [];
        next.set(activeConvId, msgs.map((m) =>
          m.id === newMsg.id
            ? { ...m, status: 'delivered' as const, statusDetail: { ...m.statusDetail, deliveredAt: new Date().toISOString() } }
            : m,
        ));
        return next;
      });
    }, 2200);
  }, [activeConvId, currentUser.id]);

  const handleTemplateSend = useCallback((template: InboxTemplate, variables: Record<string, string>) => {
    if (!activeConvId) return;
    // Resolve template body with variable values
    let resolvedText = template.bodyText;
    template.variables.forEach((varName, i) => {
      resolvedText = resolvedText.replaceAll(`{{${i + 1}}}`, variables[varName] || `[${varName}]`);
    });
    const now = new Date().toISOString();
    const newMsg: InboxMessage = {
      id: `local_tmpl_${Date.now()}`,
      conversationId: activeConvId,
      kind: 'template',
      direction: 'outbound',
      text: resolvedText,
      templateId: template.id,
      status: 'sending',
      statusDetail: { sentAt: null, deliveredAt: null, readAt: null, failedAt: null, failureReason: null, failureCode: null },
      sentById: currentUser.id,
      isAutomated: false,
      isNote: false,
      mentionedUserIds: [],
      replyToMessageId: null,
      at: now,
    };
    setLocalMessages((prev) => {
      const next = new Map(prev);
      const existing = next.get(activeConvId) ?? [];
      next.set(activeConvId, [...existing, newMsg]);
      return next;
    });
    setTimeout(() => {
      setLocalMessages((prev) => {
        const next = new Map(prev);
        const msgs = next.get(activeConvId) ?? [];
        next.set(activeConvId, msgs.map((m) =>
          m.id === newMsg.id
            ? { ...m, status: 'sent' as const, statusDetail: { ...m.statusDetail, sentAt: new Date().toISOString() } }
            : m,
        ));
        return next;
      });
    }, 800);
  }, [activeConvId, currentUser.id]);

  const handleAttachmentSend = useCallback((file: { name: string; size: string; type: 'image' | 'video' | 'document'; previewUrl?: string }) => {
    if (!activeConvId) return;
    const now = new Date().toISOString();
    const newMsg: InboxMessage = {
      id: `local_att_${Date.now()}`,
      conversationId: activeConvId,
      kind: file.type,
      direction: 'outbound',
      text: `[${file.type}: ${file.name}]`,
      attachmentName: file.name,
      attachmentSize: file.size,
      attachmentUrl: file.previewUrl,
      status: 'sending',
      statusDetail: { sentAt: null, deliveredAt: null, readAt: null, failedAt: null, failureReason: null, failureCode: null },
      sentById: currentUser.id,
      isAutomated: false,
      isNote: false,
      mentionedUserIds: [],
      replyToMessageId: null,
      at: now,
    };
    setLocalMessages((prev) => {
      const next = new Map(prev);
      const existing = next.get(activeConvId) ?? [];
      next.set(activeConvId, [...existing, newMsg]);
      return next;
    });
    setTimeout(() => {
      setLocalMessages((prev) => {
        const next = new Map(prev);
        const msgs = next.get(activeConvId) ?? [];
        next.set(activeConvId, msgs.map((m) =>
          m.id === newMsg.id
            ? { ...m, status: 'sent' as const, statusDetail: { ...m.statusDetail, sentAt: new Date().toISOString() } }
            : m,
        ));
        return next;
      });
    }, 800);
  }, [activeConvId, currentUser.id]);

  // Consumes the Catalogue Picker → Share Composer handoff (SKILL.md §10
  // Inbox — "consume selected item IDs"). Share Composer lands here with
  // `sharedItemIds` once the customer/conversation and format are validated;
  // this posts one outbound message representing the shared items, then
  // strips the param so it isn't reapplied on further navigation.
  useEffect(() => {
    const sharedItemIds = searchParams.get('sharedItemIds');
    if (!sharedItemIds || !activeConvId) return;
    const ids = sharedItemIds.split(',').filter(Boolean);
    const titles = ids.map((id) => findItem(id)?.title ?? id);
    const now = new Date().toISOString();
    const newMsg: InboxMessage = {
      id: `local_catalogue_${Date.now()}`,
      conversationId: activeConvId,
      kind: 'document',
      direction: 'outbound',
      text: `[Catalogue share: ${titles.join(', ')}]`,
      status: 'sending',
      statusDetail: { sentAt: null, deliveredAt: null, readAt: null, failedAt: null, failureReason: null, failureCode: null },
      sentById: currentUser.id,
      isAutomated: false,
      isNote: false,
      mentionedUserIds: [],
      replyToMessageId: null,
      at: now,
    };
    setLocalMessages((prev) => {
      const next = new Map(prev);
      const existing = next.get(activeConvId) ?? [];
      next.set(activeConvId, [...existing, newMsg]);
      return next;
    });
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('sharedItemIds');
      return next;
    }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, activeConvId]);

  const handleReopen = useCallback(() => {
    if (!activeConvId) return;
    setConvStatuses((prev) => {
      const next = new Map(prev);
      next.set(activeConvId, 'open');
      return next;
    });
  }, [activeConvId]);

  const handleForwardConfirm = useCallback((_targetConvId: string, _note: string) => {
    setForwardMessage(null);
  }, []);

  const handleAssign = useCallback((userId: string | null, teamId: string | null) => {
    if (!activeConvId) return;
    setConvAssignees((prev) => {
      const next = new Map(prev);
      next.set(activeConvId, { userId, teamId });
      return next;
    });
  }, [activeConvId]);

  const handleChangeStatus = useCallback((status: 'open' | 'pending' | 'resolved') => {
    if (!activeConvId) return;
    setConvStatuses((prev) => {
      const next = new Map(prev);
      next.set(activeConvId, status);
      return next;
    });
  }, [activeConvId]);

  const handleApplyLabels = useCallback((labelIds: string[]) => {
    if (!activeConvId) return;
    setConvLabels((prev) => {
      const next = new Map(prev);
      next.set(activeConvId, labelIds);
      return next;
    });
  }, [activeConvId]);

  const handleToggleSpam = useCallback((markAsSpam: boolean) => {
    if (!activeConvId) return;
    setConvSpam((prev) => {
      const next = new Map(prev);
      next.set(activeConvId, markAsSpam);
      return next;
    });
  }, [activeConvId]);

  const handleApproveTask = useCallback((taskId: string, _edits?: Partial<AiSuggestedTask>) => {
    setAiTaskStatuses((prev) => new Map(prev).set(taskId, 'approved'));
  }, []);

  const handleRejectTask = useCallback((taskId: string) => {
    setAiTaskStatuses((prev) => new Map(prev).set(taskId, 'rejected'));
  }, []);

  // ---- Message search snippet rendering -----------------------------------
  function renderSnippet(snippet: string, start: number, end: number): React.ReactNode {
    return (
      <span className="crm-inbox-msg-result__snippet">
        {snippet.slice(0, start)}
        <mark>{snippet.slice(start, end)}</mark>
        {snippet.slice(end)}
      </span>
    );
  }

  return (
    <div className={`crm-inbox-page${activeConvId ? '' : ' crm-inbox-page--list-view'}`}>
      {/* ====== Full-width queue bar — sits above the workspace (§3/§4) ====== */}
      {!isSearchMode && !isBulkMode && (
        <div className="crm-inbox-queues">
          {primaryViews.map(({ key, label, count }) => (
            <button
              key={key}
              className={`crm-inbox-queue${view === key ? ' crm-inbox-queue--active' : ''}`}
              onClick={() => setView(key)}
            >
              <span className="crm-inbox-queue__label">{label}</span>
              {count > 0 && <span className="crm-inbox-queue__count">{count}</span>}
            </button>
          ))}
          {moreViews.length > 0 && (
            <div className="crm-inbox-more">
              <button
                className={`crm-inbox-queue crm-inbox-queue--more${activeViewIsMore ? ' crm-inbox-queue--active' : ''}`}
                onClick={() => setMoreMenuOpen((v) => !v)}
                aria-expanded={moreMenuOpen}
              >
                <span className="crm-inbox-queue__label">More</span>
              </button>
              {moreMenuOpen && (
                <>
                  <button className="crm-inbox-more__backdrop" aria-label="Close" onClick={() => setMoreMenuOpen(false)} />
                  <div className="crm-inbox-more__menu" role="menu">
                    {moreViews.map(({ key, label, count }) => (
                      <button
                        key={key}
                        role="menuitem"
                        className={`crm-inbox-more__item${view === key ? ' crm-inbox-more__item--active' : ''}`}
                        onClick={() => { setView(key); setMoreMenuOpen(false); }}
                      >
                        <span>{label}</span>
                        {count > 0 && <span className="crm-inbox-more__count">{count}</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <div className={`crm-inbox-workspace${activeConvId ? '' : ' crm-inbox-workspace--list-view'}`}>
      {/* ====== LEFT: sidebar + list ====== */}
      <div className="crm-inbox-workspace__list">
        <div className="crm-inbox-sidebar">
          {/* Header */}
          <div className="crm-inbox-sidebar__header">
            {isSearchMode ? (
              <>
                <div className="crm-inbox-search-bar__mode">
                  <button
                    className={`crm-inbox-search-bar__mode-btn${searchMode === 'contacts' ? ' crm-inbox-search-bar__mode-btn--active' : ''}`}
                    onClick={() => openSearchMode('contacts')}
                  >
                    Contacts
                  </button>
                  <button
                    className={`crm-inbox-search-bar__mode-btn${searchMode === 'messages' ? ' crm-inbox-search-bar__mode-btn--active' : ''}`}
                    onClick={() => openSearchMode('messages')}
                  >
                    Messages
                  </button>
                </div>
                <SearchField
                  label="Search inbox"
                  value={searchQuery}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchMode === 'contacts' ? 'Search customers…' : 'Search messages…'}
                  width="100%"
                />
                <IconButton label="Close search" icon={<X size={16} />} onClick={closeSearch} />
              </>
            ) : (
              <>
                <span className="crm-inbox-sidebar__title">Inbox</span>
                <div className="crm-inbox-sidebar__actions">
                  <IconButton label="Search" icon={<Search size={16} />} onClick={() => openSearchMode('contacts')} />
                  {!standalone && (
                    <IconButton
                      label="Open inbox in new window"
                      icon={<Maximize2 size={16} />}
                      onClick={openInNewWindow}
                    />
                  )}
                  {policy.canViewAnalytics && (
                    <IconButton
                      label="Analytics"
                      icon={<BarChart2 size={16} />}
                      onClick={() => navigate('/inbox/analytics')}
                    />
                  )}
                  <IconButton
                    label="Inbox settings"
                    icon={<Settings size={16} />}
                    onClick={() => navigate('/settings?section=inbox-config&returnTo=/inbox')}
                  />
                  <IconButton
                    label="New chat"
                    icon={<PenSquare size={16} />}
                    onClick={() => openOverlay('modal', 'new-chat')}
                  />
                </div>
              </>
            )}
          </div>

          {/* Normal toolbar — Conversations · Sort · Filter · Search · Select (spec §7/§27) */}
          {!isSearchMode && !isBulkMode && (
            <div className="crm-inbox-list-toolbar">
              <div className="crm-inbox-list-toolbar__head">
                <span className="crm-inbox-list-toolbar__count">
                  Conversations
                  {!isLoading && conversations.length > 0 && (
                    <span className="crm-inbox-list-toolbar__num">{conversations.length}</span>
                  )}
                </span>
                {policy.canBulkAction && conversations.length > 0 && (
                  <button className="crm-inbox-select-btn" onClick={enterBulkMode}>
                    <CheckSquare size={14} /> Select
                  </button>
                )}
              </div>
              <div className="crm-inbox-list-toolbar__controls">
                <Select
                  className="crm-inbox-sort"
                  label="Sort"
                  hideLabel
                  value={sortKey}
                  onChange={(e) => setSort(e.target.value)}
                  options={SORT_OPTIONS}
                  size="sm"
                />
                <IconButton
                  label="Filters"
                  icon={<SlidersHorizontal size={16} />}
                  onClick={() => openOverlay('drawer', 'filters')}
                />
                <IconButton
                  label="Search conversations"
                  icon={<Search size={16} />}
                  onClick={() => openSearchMode('contacts')}
                />
              </div>
            </div>
          )}

          {/* Active filter chips */}
          {!isSearchMode && filtersActive && (
            <ActiveFilterChips
              filters={filters}
              onClearFilter={clearFilter}
              onResetAll={resetFilters}
            />
          )}

          {/* Bulk selection bar (spec §28–§30) — appears only in bulk mode */}
          {isBulkMode && (
            <div className="crm-inbox-bulk-bar">
              <div className="crm-inbox-bulk-bar__top">
                <span className="crm-inbox-bulk-bar__count">
                  {selectedIds.length} selected
                </span>
                {conversations.length > 0 && selectedIds.length < conversations.length ? (
                  <button className="crm-inbox-bulk-bar__selectall" onClick={selectAllMatching}>
                    Select all {conversations.length} matching
                  </button>
                ) : conversations.length > 0 && selectedIds.length === conversations.length ? (
                  <span className="crm-inbox-bulk-bar__allmatched">
                    All {conversations.length} matching conversations selected
                  </span>
                ) : null}
                <button className="crm-inbox-bulk-bar__cancel" onClick={exitBulkMode}>
                  Cancel
                </button>
              </div>
              {selectedIds.length > 0 && (
                <BulkToolbar
                  selectedCount={selectedIds.length}
                  policy={policy}
                  onClearSelection={exitBulkMode}
                  onBulkAssign={() => openOverlay('popover', 'assign')}
                  onBulkResolve={() => {
                    selectedIds.forEach((id) => setConvStatuses((prev) => new Map(prev).set(id, 'resolved')));
                    exitBulkMode();
                  }}
                  onBulkLabels={() => openOverlay('popover', 'labels')}
                  onBulkFollowUp={() => openOverlay('popover', 'status')}
                  onBulkSpam={() => openOverlay('modal', 'spam')}
                />
              )}
            </div>
          )}

          {/* Conversation list */}
          <div style={{ flex: 1, overflow: 'hidden auto' }}>
            {isLoading ? (
              <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[1, 2, 3, 4, 5].map((i) => <LoadingSkeleton key={i} height={72} />)}
              </div>
            ) : isViewEmpty ? (
              <div className="crm-inbox-list-empty">
                <MessageSquareDashed size={40} className="crm-inbox-list-empty__icon" />
                <div className="crm-inbox-list-empty__title">
                  {view === 'resolved' ? 'No resolved conversations' :
                   view === 'spam' ? 'No spam' :
                   isSearchMode ? 'No results' :
                   filtersActive ? 'No conversations match these filters' :
                   'All caught up!'}
                </div>
                <div className="crm-inbox-list-empty__body">
                  {isSearchMode
                    ? 'Try a different name or phone number.'
                    : filtersActive
                    ? 'Try adjusting or resetting the filters.'
                    : 'No conversations match the current view.'}
                </div>
                {filtersActive && !isSearchMode && (
                  <button
                    style={{ fontSize: 13, color: 'var(--crm-text-brand)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                    onClick={resetFilters}
                  >
                    Reset filters
                  </button>
                )}
              </div>
            ) : isSearchMode && searchMode === 'messages' ? (
              // Message search results
              msgSearchResults.length === 0 ? (
                <div className="crm-inbox-list-empty">
                  <MessageSquareDashed size={40} className="crm-inbox-list-empty__icon" />
                  <div className="crm-inbox-list-empty__title">No messages found</div>
                  <div className="crm-inbox-list-empty__body">Try a different search term.</div>
                </div>
              ) : (
                msgSearchResults.map((result) => {
                  const conv = findConversation(result.conversationId);
                  if (!conv) return null;
                  const contactName = contacts.find((c) => c.id === conv.contactId)?.name ?? conv.rawMobile ?? 'Unknown';
                  return (
                    <div
                      key={`${result.conversationId}:${result.messageId}`}
                      className={`crm-inbox-msg-result${result.conversationId === activeConvId && result.messageId === focusMessageId ? ' crm-inbox-msg-result--active' : ''}`}
                      onClick={() => focusMessage(result.conversationId, result.messageId)}
                    >
                      <div className="crm-inbox-msg-result__name">{contactName}</div>
                      {renderSnippet(result.snippet, result.matchStart, result.matchEnd)}
                    </div>
                  );
                })
              )
            ) : (
              conversations.map((conv) => (
                <ConversationRow
                  key={conv.id}
                  conversation={{ ...conv, unreadCount: readIds.has(conv.id) ? 0 : conv.unreadCount }}
                  isActive={conv.id === activeConvId}
                  isBulkMode={isBulkMode}
                  isSelected={selectedIds.includes(conv.id)}
                  onSelect={setConversation}
                  onToggleBulk={toggleBulkSelect}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* ====== CENTER: conversation detail ====== */}
      <div className="crm-inbox-workspace__detail">
        {!activeConv ? (
          <div className="crm-inbox-no-selection">
            <MessageSquareDashed size={48} className="crm-inbox-no-selection__icon" />
            <div className="crm-inbox-no-selection__title">Select a conversation</div>
            <div className="crm-inbox-no-selection__body">
              Choose a conversation from the list to read messages and take action.
            </div>
          </div>
        ) : (
          <>
            <ConversationHeader
              conversation={activeConv}
              policy={policy}
              onOpenAssign={() => openOverlay('popover', 'assign')}
              onOpenStatus={() => openOverlay('popover', 'status')}
              onOpenLabels={() => openOverlay('popover', 'labels')}
              onOpenActivity={() => openOverlay('drawer', 'activity')}
              onOpenAiTasks={() => openOverlay('drawer', 'ai-tasks')}
              onOpenHandoff={() => openOverlay('modal', 'handoff')}
              onOpenMenu={() => {}}
              onOpenCustomerContext={() => openOverlay('drawer', 'customer')}
              onBack={goBackToList}
            />
            <MessageHistory
              messages={activeMessages}
              inboundName={
                (activeConv.contactId
                  ? contacts.find((ct) => ct.id === activeConv.contactId)?.name
                  : undefined) ?? activeConv.rawMobile ?? undefined
              }
              focusMessageId={focusMessageId ?? undefined}
              isLoading={forceState === 'loading'}
              onShowStatus={(id) =>
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  next.set('popover', 'message-status');
                  next.set('message', id);
                  return next;
                })
              }
              onShowFailure={(id) =>
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  next.set('popover', 'message-failure');
                  next.set('message', id);
                  return next;
                })
              }
              onRetry={(id) => {
                setLocalMessages((prev) => {
                  const next = new Map(prev);
                  const msgs = next.get(activeConv.id) ?? [];
                  next.set(activeConv.id, msgs.map((m) =>
                    m.id === id
                      ? { ...m, status: 'sending' as const, statusDetail: { ...m.statusDetail, failedAt: null, failureReason: null, failureCode: null } }
                      : m,
                  ));
                  return next;
                });
              }}
              onReply={(msg) => setReplyToMessage(msg)}
              onForward={(msg) => {
                setForwardMessage(msg);
                openOverlay('modal', 'forward', { message: msg.id });
              }}
            />
            <ComposerShell
              responseWindow={activeConv.responseWindow}
              isSpam={effectiveIsSpam}
              isResolved={effectiveStatus === 'resolved'}
              replyToMessage={replyToMessage}
              onClearReplyTo={() => setReplyToMessage(null)}
              pendingInsert={pendingComposerInsert}
              onPendingInsertConsumed={() => setPendingComposerInsert('')}
              onSend={handleSend}
              onReopen={handleReopen}
              onChooseTemplate={() => openOverlay('drawer', 'template-picker')}
              onChooseQuickReply={() => openOverlay('popover', 'quick-replies')}
              onChooseAttachment={() => openOverlay('drawer', 'attachments')}
            />
          </>
        )}
      </div>

      {/* ====== RIGHT: customer context ====== */}
      <div className="crm-inbox-workspace__context">
        {activeConv ? (
          <CustomerContextShell
            conversation={activeConv}
            onSaveCustomer={() => openOverlay('drawer', 'save-customer')}
            onViewFullProfile={(contactId) => {
              window.location.href = scopedHref(`/contacts/${contactId}`);
            }}
            onViewOrders={(contactId) => navigate(`/catalogue-orders?sourceModule=inbox&contactId=${contactId}&returnTo=/inbox`)}
          />
        ) : (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: '100%', color: 'var(--crm-text-muted)', fontSize: 12,
            padding: 24, textAlign: 'center',
          }}>
            Customer details appear here when a conversation is selected.
          </div>
        )}
      </div>

      {/* ====== OVERLAYS ====== */}

      {/* Filter drawer */}
      <InboxFilterDrawer
        open={activeDrawer === 'filters'}
        onClose={() => closeOverlay('drawer')}
        current={filters}
        onApply={applyFilters}
      />

      {/* Template picker drawer — INB-S11 */}
      <TemplatePicker
        open={activeDrawer === 'template-picker'}
        onClose={() => closeOverlay('drawer')}
        currentNumberId={activeConv?.whatsappNumberId ?? ''}
        onSend={handleTemplateSend}
      />

      {/* Attachment picker drawer — INB-S13 */}
      <AttachmentPicker
        open={activeDrawer === 'attachments'}
        onClose={() => closeOverlay('drawer')}
        onSend={handleAttachmentSend}
        contactId={activeConv?.contactId}
        conversationId={activeConv?.id}
      />

      {/* Customer context drawer (tablet/mobile) */}
      <Drawer
        open={activeDrawer === 'customer' && !!activeConv}
        title="Customer Context"
        onClose={() => closeOverlay('drawer')}
      >
        {activeConv && (
          <CustomerContextShell
            conversation={activeConv}
            onSaveCustomer={() => {
              closeOverlay('drawer');
              openOverlay('drawer', 'save-customer');
            }}
            onViewFullProfile={(contactId) => {
              window.location.href = scopedHref(`/contacts/${contactId}`);
            }}
            onViewOrders={(contactId) => navigate(`/catalogue-orders?sourceModule=inbox&contactId=${contactId}&returnTo=/inbox`)}
          />
        )}
      </Drawer>

      {/* Quick replies popover — INB-S12 */}
      <QuickRepliesPopover
        open={activePopover === 'quick-replies'}
        onClose={() => closeOverlay('popover')}
        contactName={
          activeConv?.contactId
            ? contacts.find((c) => c.id === activeConv.contactId)?.name
            : undefined
        }
        onInsert={(text) => {
          setPendingComposerInsert(text);
          closeOverlay('popover');
        }}
      />

      {/* Message status popover — INB-S22 */}
      <MessageStatusPopover
        open={activePopover === 'message-status'}
        message={popoverMessage}
        onClose={() => closeOverlay('popover')}
      />

      {/* Message failure popover — INB-S23 */}
      <MessageFailurePopover
        open={activePopover === 'message-failure'}
        message={popoverMessage}
        onClose={() => closeOverlay('popover')}
        onRetry={(id) => {
          closeOverlay('popover');
          if (activeConv) {
            setLocalMessages((prev) => {
              const next = new Map(prev);
              const msgs = next.get(activeConv.id) ?? [];
              next.set(activeConv.id, msgs.map((m) =>
                m.id === id
                  ? { ...m, status: 'sending' as const }
                  : m,
              ));
              return next;
            });
          }
        }}
      />

      {/* Forward message modal — INB-S17 */}
      <ForwardMessage
        open={activeModal === 'forward'}
        message={forwardMessage}
        currentConvId={activeConvId ?? ''}
        onClose={() => {
          closeOverlay('modal');
          setForwardMessage(null);
        }}
        onForward={handleForwardConfirm}
      />

      {/* Assign popover — INB-S05 */}
      <AssignPopover
        open={activePopover === 'assign'}
        currentAssigneeId={effectiveAssignee.userId}
        currentTeamId={effectiveAssignee.teamId}
        conversationNumberId={activeConv?.whatsappNumberId ?? ''}
        onClose={() => closeOverlay('popover')}
        onAssign={(userId, teamId) => {
          handleAssign(userId, teamId);
          closeOverlay('popover');
        }}
      />

      {/* Status popover — INB-S06 */}
      <StatusPopover
        open={activePopover === 'status'}
        currentStatus={effectiveStatus}
        onClose={() => closeOverlay('popover')}
        onChangeStatus={(status) => {
          handleChangeStatus(status);
        }}
        onScheduleFollowUp={(_date, _ownerId, _note) => {
          // Prototype: follow-up scheduling noted but not persisted
        }}
      />

      {/* Labels popover — INB-S07 */}
      <LabelsPopover
        open={activePopover === 'labels'}
        currentLabelIds={effectiveLabels}
        conversationId={activeConvId ?? ''}
        onClose={() => closeOverlay('popover')}
        onApply={(labelIds) => {
          handleApplyLabels(labelIds);
        }}
      />

      {/* Activity drawer — INB-S14 */}
      <ActivityDrawer
        open={activeDrawer === 'activity'}
        events={activeConvId ? findActivityEvents(activeConvId) : []}
        onClose={() => closeOverlay('drawer')}
      />

      {/* Save Customer drawer — INB-S09 */}
      <SaveCustomerDrawer
        open={activeDrawer === 'save-customer'}
        conversation={activeConv ?? null}
        onClose={() => closeOverlay('drawer')}
        onSaved={(_contactId) => {
          closeOverlay('drawer');
        }}
      />

      {/* New Chat modal — INB-S10 */}
      <NewChatModal
        open={activeModal === 'new-chat'}
        currentNumberId={activeConv?.whatsappNumberId ?? whatsappNumberId}
        onClose={() => closeOverlay('modal')}
        onOpenConversation={(convId) => {
          closeOverlay('modal');
          if (convId) setConversation(convId);
        }}
        onOpenTemplateForContact={(_contact) => {
          closeOverlay('modal');
          openOverlay('drawer', 'template-picker');
        }}
        onCreateContact={() => {
          closeOverlay('modal');
          openOverlay('drawer', 'save-customer');
        }}
      />

      {/* Spam modal — INB-S16 */}
      <SpamModal
        open={activeModal === 'spam'}
        mode={effectiveIsSpam ? 'remove' : 'mark'}
        onClose={() => closeOverlay('modal')}
        onConfirm={() => {
          handleToggleSpam(!effectiveIsSpam);
          closeOverlay('modal');
        }}
      />

      {/* Bot/Human Handoff modal — INB-S18 */}
      <HandoffModal
        open={activeModal === 'handoff'}
        onClose={() => closeOverlay('modal')}
        onConfirm={(userId, teamId, _reason, _note) => {
          handleAssign(userId, teamId);
          closeOverlay('modal');
        }}
      />

      {/* AI Tasks drawer — INB-S19 */}
      <AiTasksDrawer
        open={activeDrawer === 'ai-tasks'}
        tasks={activeAiTasks}
        onClose={() => closeOverlay('drawer')}
        onApprove={handleApproveTask}
        onReject={handleRejectTask}
        onScrollToMessage={(msgId) => {
          closeOverlay('drawer');
          if (activeConvId) {
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              next.set('focusMessage', msgId);
              return next;
            });
          }
        }}
      />
      </div>
    </div>
  );
}
