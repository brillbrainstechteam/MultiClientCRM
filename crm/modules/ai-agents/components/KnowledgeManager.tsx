import { useState } from 'react';
import { Eye, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useWorkspace } from '@crm/app/workspace-context';
import { Badge, Button, ConfirmDialog, Drawer, EmptyState, Input, Select, Textarea } from '@crm/design-system';
import { useAiAgentsStore, useKnowledgeSources } from '../ai-agents-store';
import { can } from '../permissions';
import { knowledgeStatusLabel, knowledgeStatusTone, knowledgeTypeLabel } from '../ai-agents-labels';
import type { KnowledgeSource, KnowledgeSourceType } from '../domain/types';

/** AIA-S02 Knowledge tab/step — source management (CODE_FIRST_ADAPTER.md §4 "Knowledge fixtures"). */
export function KnowledgeManager({ agentId }: { agentId: string }) {
  const { role, currentUser } = useWorkspace();
  const { dispatch, state } = useAiAgentsStore();
  const sources = useKnowledgeSources(agentId);
  const canManage = can(role, 'ai_agent.manage_knowledge');

  const [drawerMode, setDrawerMode] = useState<'add' | 'replace' | 'preview' | null>(null);
  const [activeSource, setActiveSource] = useState<KnowledgeSource | null>(null);
  const [removeTarget, setRemoveTarget] = useState<KnowledgeSource | null>(null);
  const [form, setForm] = useState({ name: '', type: 'faq' as KnowledgeSourceType, preview: '' });

  const openAdd = () => {
    setForm({ name: '', type: 'faq', preview: '' });
    setDrawerMode('add');
  };
  const openReplace = (source: KnowledgeSource) => {
    setActiveSource(source);
    setForm({ name: source.name, type: source.type, preview: source.preview });
    setDrawerMode('replace');
  };
  const openPreview = (source: KnowledgeSource) => {
    setActiveSource(source);
    setDrawerMode('preview');
  };
  const closeDrawer = () => {
    setDrawerMode(null);
    setActiveSource(null);
  };

  const submit = () => {
    const instantlyReady = form.type === 'faq';
    if (drawerMode === 'add') {
      const newSource: KnowledgeSource = {
        id: `ks_gen_${state.nextSeq}`,
        agentId,
        type: form.type,
        name: form.name || 'Untitled source',
        status: instantlyReady ? 'ready' : 'processing',
        updatedAt: new Date().toISOString(),
        allowedAgentIds: [agentId],
        preview: form.preview,
      };
      dispatch({ type: 'ADD_KNOWLEDGE_SOURCE', source: newSource, actorId: currentUser.id });
    } else if (drawerMode === 'replace' && activeSource) {
      dispatch({
        type: 'REPLACE_KNOWLEDGE_SOURCE',
        sourceId: activeSource.id,
        updates: { name: form.name, type: form.type, preview: form.preview, status: instantlyReady ? 'ready' : 'processing', updatedAt: new Date().toISOString(), failureReason: undefined },
        actorId: currentUser.id,
      });
    }
    closeDrawer();
  };

  const markProcessed = (source: KnowledgeSource) => {
    const willFail = source.type === 'website';
    dispatch({
      type: 'REPLACE_KNOWLEDGE_SOURCE',
      sourceId: source.id,
      updates: willFail
        ? { status: 'failed', failureReason: 'Page could not be crawled — check the URL is publicly reachable.' }
        : { status: 'ready', failureReason: undefined },
      actorId: currentUser.id,
    });
  };

  return (
    <div className="crm-aia__section">
      <div className="crm-aia__toolbar">
        <div>
          <h3 className="crm-aia__section-title">Knowledge sources</h3>
          <p className="crm-aia__section-hint">FAQ entries, documents, spreadsheets and approved website pages this agent may use.</p>
        </div>
        {canManage ? (
          <Button variant="secondary" size="sm" iconLeft={<Plus />} onClick={openAdd}>Add source</Button>
        ) : null}
      </div>

      {sources.length === 0 ? (
        <EmptyState
          title="No knowledge sources yet"
          description="Add at least one approved source before this agent can be tested or activated."
          actions={canManage ? <Button variant="primary" size="sm" iconLeft={<Plus />} onClick={openAdd}>Add source</Button> : undefined}
        />
      ) : (
        <div className="crm-aia__picker-list">
          {sources.map((source) => (
            <div key={source.id} className="crm-aia__source-row">
              <div className="crm-aia__source-main">
                <span className="crm-aia__source-name">{source.name}</span>
                <span className="crm-aia__source-meta">
                  {knowledgeTypeLabel[source.type]} · Updated {new Date(source.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
                {source.status === 'failed' && source.failureReason ? <span className="crm-aia__source-meta">{source.failureReason}</span> : null}
              </div>
              <div className="crm-aia__badge-row">
                <Badge tone={knowledgeStatusTone[source.status]}>{knowledgeStatusLabel[source.status]}</Badge>
                <div className="crm-aia__source-actions">
                  <Button variant="ghost" size="sm" iconLeft={<Eye />} onClick={() => openPreview(source)}>Preview</Button>
                  {canManage && source.status === 'processing' ? (
                    <Button variant="ghost" size="sm" iconLeft={<RefreshCw />} onClick={() => markProcessed(source)}>Check status</Button>
                  ) : null}
                  {canManage ? (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => openReplace(source)}>Replace</Button>
                      <Button variant="ghost" size="sm" iconLeft={<Trash2 />} onClick={() => setRemoveTarget(source)}>Remove</Button>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Drawer
        open={drawerMode === 'add' || drawerMode === 'replace'}
        title={drawerMode === 'replace' ? 'Replace knowledge source' : 'Add knowledge source'}
        onClose={closeDrawer}
        footer={
          <>
            <Button variant="secondary" onClick={closeDrawer}>Cancel</Button>
            <Button variant="primary" onClick={submit} disabled={!form.name.trim()}>
              {drawerMode === 'replace' ? 'Replace source' : 'Add source'}
            </Button>
          </>
        }
      >
        <div className="crm-aia__form-grid">
          <div className="crm-aia__form-grid--full">
            <Input label="Source name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="crm-aia__form-grid--full">
            <Select
              label="Type"
              options={Object.entries(knowledgeTypeLabel).map(([value, label]) => ({ value, label }))}
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as KnowledgeSourceType })}
            />
          </div>
          <div className="crm-aia__form-grid--full">
            <Textarea
              label="Content / preview"
              hint={form.type === 'faq' ? 'FAQ entries are ready immediately.' : 'Documents, spreadsheets and website pages simulate processing before they are ready.'}
              rows={4}
              value={form.preview}
              onChange={(e) => setForm({ ...form, preview: e.target.value })}
            />
          </div>
        </div>
      </Drawer>

      <Drawer open={drawerMode === 'preview'} title={activeSource?.name ?? 'Source preview'} onClose={closeDrawer}>
        {activeSource ? (
          <div className="crm-aia__section" style={{ paddingTop: 0, borderTop: 'none' }}>
            <p className="crm-aia__section-hint">{knowledgeTypeLabel[activeSource.type]} · {knowledgeStatusLabel[activeSource.status]}</p>
            <p>{activeSource.preview || 'No preview content available yet.'}</p>
          </div>
        ) : null}
      </Drawer>

      <ConfirmDialog
        open={removeTarget !== null}
        title="Remove knowledge source"
        message={`Remove "${removeTarget?.name}"? The agent will no longer be able to use it.`}
        confirmLabel="Remove source"
        tone="danger"
        onCancel={() => setRemoveTarget(null)}
        onConfirm={() => {
          if (removeTarget) dispatch({ type: 'REMOVE_KNOWLEDGE_SOURCE', sourceId: removeTarget.id, agentId, actorId: currentUser.id });
          setRemoveTarget(null);
        }}
      />
    </div>
  );
}
