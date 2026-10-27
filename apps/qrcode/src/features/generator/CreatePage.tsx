import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { ContentTypeSelector } from '@/components/forms/ContentTypeSelector';
import { ContentForm } from '@/components/forms/ContentForm';
import { QRPreview } from '@/components/qr/QRPreview';
import { DesignPanel } from '@/components/qr/DesignPanel';
import { ExportPanel } from '@/components/export/ExportPanel';
import { generatePayload } from '@/lib/qr/payload';
import { validateContent } from '@/lib/validation';
import { defaultDesign } from '@/lib/defaults';
import type { QRContent, QRDesignSettings } from '@/types';
import { Code, AlertTriangle } from 'lucide-react';

const defaultContent: QRContent = { type: 'url', url: '' };

export default function CreatePage() {
  const [content, setContent] = useState<QRContent>(defaultContent);
  const [design, setDesign] = useState<QRDesignSettings>({ ...defaultDesign });
  const [showPayload, setShowPayload] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'design' | 'export'>('content');

  const payload = useMemo(() => generatePayload(content), [content]);
  const validation = useMemo(() => validateContent(content), [content]);

  const handleContentTypeChange = useCallback((type: QRContent['type']) => {
    setContent(prev => {
      // Preserve compatible fields when switching types
      const base = { type } as QRContent;
      switch (type) {
        case 'url': return { ...base, type: 'url', url: '' };
        case 'text': return { ...base, type: 'text', text: '' };
        case 'wifi': return { ...base, type: 'wifi', ssid: '', password: '', encryption: 'WPA' as const, hidden: false };
        case 'vcard': return { ...base, type: 'vcard', firstName: '', lastName: '', organization: '', title: '', phone: (prev as { phone?: string }).phone || '', email: (prev as { email?: string }).email || '', website: '', address: '', note: '' };
        case 'email': return { ...base, type: 'email', address: (prev as { email?: string }).email || '', subject: '', body: '' };
        case 'sms': return { ...base, type: 'sms', phone: (prev as { phone?: string }).phone || '', message: '' };
        case 'phone': return { ...base, type: 'phone', phone: (prev as { phone?: string }).phone || '' };
        case 'geo': return { ...base, type: 'geo', latitude: '', longitude: '', query: '' };
        case 'calendar': return { ...base, type: 'calendar', title: '', description: '', location: '', startDate: '', startTime: '', endDate: '', endTime: '', allDay: false };
        case 'whatsapp': return { ...base, type: 'whatsapp', phone: (prev as { phone?: string }).phone || '', message: '' };
        case 'social': return { ...base, type: 'social', platform: 'other' as const, url: '' };
        case 'custom': return { ...base, type: 'custom', payload: '' };
        default: return prev;
      }
    });
  }, []);

  return (
    <div className="h-full flex flex-col lg:flex-row">
      {/* Left panel: content + design controls */}
      <div className="lg:w-[420px] xl:w-[480px] flex-shrink-0 border-r border-studio-border overflow-y-auto">
        {/* Tabs */}
        <div className="flex border-b border-studio-border px-4 sticky top-0 bg-studio-bg z-10">
          {(['content', 'design', 'export'] as const).map(tab => (
            <button
              key={tab}
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

              {/* Validation messages */}
              {(validation.errors.length > 0 || validation.warnings.length > 0) && (
                <div className="space-y-2">
                  {validation.errors.map((err, i) => (
                    <div key={`e-${i}`} className="flex items-start gap-2 text-sm text-studio-error bg-studio-error/10 px-3 py-2 rounded-lg">
                      <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                      <span>{err}</span>
                    </div>
                  ))}
                  {validation.warnings.map((warn, i) => (
                    <div key={`w-${i}`} className="flex items-start gap-2 text-sm text-studio-warning bg-studio-warning/10 px-3 py-2 rounded-lg">
                      <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                      <span>{warn}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Raw payload preview */}
              <div>
                <button
                  className="studio-btn-ghost text-xs gap-1"
                  onClick={() => setShowPayload(v => !v)}
                  aria-expanded={showPayload}
                >
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

          {activeTab === 'design' && (
            <DesignPanel design={design} onChange={setDesign} />
          )}

          {activeTab === 'export' && (
            <ExportPanel design={design} payload={payload} valid={validation.valid} />
          )}
        </div>
      </div>

      {/* Right panel: live preview */}
      <div className="flex-1 flex items-center justify-center p-6 bg-studio-bg min-h-[400px]">
        <QRPreview payload={payload} design={design} valid={validation.valid && payload.length > 0} />
      </div>
    </div>
  );
}
