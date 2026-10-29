import { useCallback, useMemo, useState } from 'react';
import { ContentTypeSelector } from '@/components/forms/ContentTypeSelector';
import { ContentForm } from '@/components/forms/ContentForm';
import { QRPreview } from '@/components/qr/QRPreview';
import { DesignPanel } from '@/components/qr/DesignPanel';
import { ExportPanel } from '@/components/export/ExportPanel';
import { generatePayload } from '@/lib/qr/payload';
import { checkCapacity } from '@/lib/qr/capacity';
import { validateContent } from '@/lib/validation';
import { getProject, saveProject } from '@/lib/storage/db';
import { makeId } from '@/lib/id';
import type { Draft } from '@/state/draft';
import type { QRContent, QRDesignSettings, QRProject } from '@/types';
import { Code, AlertTriangle, Save, FilePlus2 } from 'lucide-react';

interface CreatePageProps {
  draft: Draft;
  onDraftChange: (draft: Draft) => void;
  onNew: () => void;
}

type Phone = { phone?: string; email?: string };

function contentFor(type: QRContent['type'], prev: QRContent): QRContent {
  const p = prev as Phone;
  switch (type) {
    case 'url': return { type, url: '' };
    case 'text': return { type, text: '' };
    case 'wifi': return { type, ssid: '', password: '', encryption: 'WPA', hidden: false };
    case 'vcard': return { type, firstName: '', lastName: '', organization: '', title: '', phone: p.phone || '', email: p.email || '', website: '', address: '', note: '' };
    case 'email': return { type, address: p.email || '', subject: '', body: '' };
    case 'sms': return { type, phone: p.phone || '', message: '' };
    case 'phone': return { type, phone: p.phone || '' };
    case 'geo': return { type, latitude: '', longitude: '', query: '' };
    case 'calendar': return { type, title: '', description: '', location: '', startDate: '', startTime: '', endDate: '', endTime: '', allDay: false };
    case 'whatsapp': return { type, phone: p.phone || '', message: '' };
    case 'social': return { type, platform: 'other', url: '' };
    case 'custom': return { type, payload: '' };
  }
}

export default function CreatePage({ draft, onDraftChange, onNew }: CreatePageProps) {
  const { content, design } = draft;
  const [showPayload, setShowPayload] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'design' | 'export'>('content');
  const [saveState, setSaveState] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const payload = useMemo(() => generatePayload(content), [content]);
  const validation = useMemo(() => validateContent(content), [content]);
  const capacity = useMemo(() => checkCapacity(payload, design.errorCorrection), [payload, design.errorCorrection]);

  const errors = [...validation.errors];
  const warnings = [...validation.warnings];
  if (capacity.tooLong) errors.push(`This is ${capacity.bytes} bytes, more than a QR code can hold at error correction ${design.errorCorrection} (${capacity.limit}). Shorten it or lower the error correction.`);
  else if (capacity.dense) warnings.push('A lot of data makes a dense code that phone cameras struggle with. Shorter content scans better.');
  const valid = validation.valid && !capacity.tooLong;

  const setContent = useCallback((c: QRContent) => onDraftChange({ ...draft, content: c }), [draft, onDraftChange]);
  const setDesign = useCallback((d: QRDesignSettings) => onDraftChange({ ...draft, design: d }), [draft, onDraftChange]);
  const handleContentTypeChange = useCallback(
    (type: QRContent['type']) => onDraftChange({ ...draft, content: contentFor(type, draft.content) }),
    [draft, onDraftChange],
  );

  const handleSave = async () => {
    const name = draft.name.trim() || 'Untitled QR';
    const now = Date.now();
    const id = draft.projectId ?? makeId('proj');
    let createdAt = now;
    if (draft.projectId) {
      createdAt = (await getProject(draft.projectId).catch(() => undefined))?.createdAt ?? now;
    }
    const project: QRProject = { id, name, content, design, createdAt, updatedAt: now };
    try {
      await saveProject(project);
      onDraftChange({ ...draft, projectId: id, name });
      setSaveState({ kind: 'ok', text: draft.projectId ? `Updated "${name}" in My Designs.` : `Saved "${name}" to My Designs.` });
    } catch {
      setSaveState({ kind: 'error', text: 'Could not save. Browser storage may be blocked or full.' });
    }
  };

  return (
    <div className="h-full flex flex-col lg:flex-row">
      <div className="lg:w-[420px] xl:w-[480px] flex-shrink-0 border-b lg:border-b-0 lg:border-r border-studio-border lg:overflow-y-auto">
        <div className="flex border-b border-studio-border px-4 sticky top-0 bg-studio-bg z-10" role="tablist" aria-label="Create steps">
          {(['content', 'design', 'export'] as const).map(tab => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              className={`studio-tab px-4 py-3 capitalize ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-4">
          {activeTab === 'content' && (
            <div className="space-y-4">
              <ContentTypeSelector value={content.type} onChange={handleContentTypeChange} />
              <ContentForm content={content} onChange={setContent} />

              {(errors.length > 0 || warnings.length > 0) && (
                <div className="space-y-2" aria-live="polite">
                  {errors.map((err, i) => (
                    <div key={`e-${i}`} className="flex items-start gap-2 text-sm text-studio-error bg-studio-error/10 px-3 py-2 rounded-lg">
                      <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                      <span>{err}</span>
                    </div>
                  ))}
                  {warnings.map((warn, i) => (
                    <div key={`w-${i}`} className="flex items-start gap-2 text-sm text-studio-warning bg-studio-warning/10 px-3 py-2 rounded-lg">
                      <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                      <span>{warn}</span>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <button className="studio-btn-ghost text-xs gap-1" onClick={() => setShowPayload(v => !v)} aria-expanded={showPayload}>
                  <Code size={14} />
                  {showPayload ? 'Hide' : 'Show'} raw payload
                </button>
                {showPayload && payload && (
                  <pre className="mt-2 p-3 bg-studio-surface border border-studio-border rounded-lg text-xs text-studio-muted whitespace-pre-wrap break-all font-mono max-h-48 overflow-y-auto">
                    {payload}
                  </pre>
                )}
              </div>
            </div>
          )}

          {activeTab === 'design' && <DesignPanel design={design} onChange={setDesign} />}
          {activeTab === 'export' && <ExportPanel design={design} payload={payload} valid={valid} />}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6 bg-studio-bg min-h-[400px]">
        <QRPreview payload={payload} design={design} valid={valid && payload.length > 0} />

        <div className="w-full max-w-md space-y-2">
          <label htmlFor="project-name" className="studio-label">Name</label>
          <div className="flex gap-2">
            <input
              id="project-name"
              className="studio-input"
              placeholder="Untitled QR"
              maxLength={80}
              value={draft.name}
              onChange={e => onDraftChange({ ...draft, name: e.target.value })}
              onKeyDown={e => { if (e.key === 'Enter' && valid) void handleSave(); }}
            />
            <button type="button" className="studio-btn-primary shrink-0" disabled={!valid} onClick={handleSave}>
              <Save size={16} /> {draft.projectId ? 'Update' : 'Save'}
            </button>
            <button type="button" className="studio-btn-secondary shrink-0" onClick={onNew} title="Start a new code">
              <FilePlus2 size={16} /> New
            </button>
          </div>
          <p role="status" aria-live="polite" className={`min-h-5 text-sm ${saveState?.kind === 'error' ? 'text-studio-error' : 'text-studio-success'}`}>
            {saveState?.text}
          </p>
        </div>
      </div>
    </div>
  );
}
