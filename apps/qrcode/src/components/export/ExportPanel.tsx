import { useId, useState } from 'react';
import { Check, Copy, Download, Loader2 } from 'lucide-react';
import type { ExportFormat, QRDesignSettings } from '@/types';
import { clampSize, downloadBlob, exportQR, FORMAT_EXTENSION, MAX_EXPORT_SIZE, MIN_EXPORT_SIZE } from '@/lib/qr/render';
import { sanitizeFilename } from '@/lib/validation';
import { ColorInput } from '@/components/ui/ColorInput';

interface ExportPanelProps {
  design: QRDesignSettings;
  payload: string;
  valid: boolean;
}

const formats: { id: ExportFormat; label: string; hint: string }[] = [
  { id: 'png', label: 'PNG', hint: 'Sharp raster image. Keeps transparency.' },
  { id: 'svg', label: 'SVG', hint: 'Vector. Scales to any print size.' },
  { id: 'jpg', label: 'JPG', hint: 'Smaller file, no transparency.' },
  { id: 'pdf', label: 'PDF', hint: 'A4 page with the code centred near the top.' },
];
const sizePresets = [256, 512, 1024, 2048, 4096];

export function ExportPanel({ design, payload, valid }: ExportPanelProps) {
  const nameId = useId();
  const sizeId = useId();
  const [format, setFormat] = useState<ExportFormat>('png');
  const [size, setSize] = useState(clampSize(design.width));
  const [quality, setQuality] = useState(0.92);
  const [bg, setBg] = useState('#ffffff');
  const [includeFrame, setIncludeFrame] = useState(true);
  const [filename, setFilename] = useState('qr-code');
  const [busy, setBusy] = useState<'download' | 'copy' | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const canCopy = typeof navigator !== 'undefined' && !!navigator.clipboard && typeof ClipboardItem !== 'undefined';
  const needsBg = format === 'jpg' || format === 'pdf';
  const ready = valid && payload.length > 0;

  const run = async (mode: 'download' | 'copy') => {
    if (!ready || busy) return;
    setBusy(mode);
    setMessage(null);
    try {
      const f: ExportFormat = mode === 'copy' ? 'png' : format;
      const blob = await exportQR(payload, design, { format: f, width: size, height: size, quality, backgroundColor: bg, includeFrame });
      if (mode === 'copy') {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setMessage({ kind: 'ok', text: 'Copied the PNG to the clipboard.' });
      } else {
        downloadBlob(blob, `${sanitizeFilename(filename)}.${FORMAT_EXTENSION[f]}`);
        setMessage({ kind: 'ok', text: `Downloaded ${sanitizeFilename(filename)}.${FORMAT_EXTENSION[f]}` });
      }
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof Error ? err.message : 'Export failed.' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <span className="studio-label">Format</span>
        <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Export format">
          {formats.map(f => (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={format === f.id}
              onClick={() => setFormat(f.id)}
              className={`rounded-lg border py-2 text-sm font-semibold ${format === f.id ? 'border-studio-accent/40 bg-studio-accent/15 text-studio-accent' : 'border-studio-border text-studio-muted hover:text-studio-text hover:bg-studio-surface'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-studio-muted">{formats.find(f => f.id === format)?.hint}</p>
      </div>

      <div>
        <label htmlFor={sizeId} className="studio-label">Size (px, square)</label>
        <input
          id={sizeId}
          type="number"
          className="studio-input"
          min={MIN_EXPORT_SIZE}
          max={MAX_EXPORT_SIZE}
          value={size}
          onChange={e => setSize(Number(e.target.value))}
          onBlur={() => setSize(clampSize(size))}
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {sizePresets.map(p => (
            <button key={p} type="button" aria-pressed={size === p} onClick={() => setSize(p)} className={`rounded-md border px-2 py-1 text-xs ${size === p ? 'border-studio-accent/40 bg-studio-accent/15 text-studio-accent' : 'border-studio-border text-studio-muted hover:text-studio-text'}`}>
              {p}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-studio-muted">Between {MIN_EXPORT_SIZE} and {MAX_EXPORT_SIZE}. SVG ignores pixels and scales freely. With a frame, the file is a little larger than this size.</p>
      </div>

      {format === 'jpg' && (
        <div>
          <label className="studio-label" htmlFor="jpg-quality">JPG quality: {Math.round(quality * 100)}%</label>
          <input id="jpg-quality" type="range" min={0.5} max={1} step={0.01} value={quality} className="w-full accent-studio-accent" onChange={e => setQuality(Number(e.target.value))} />
        </div>
      )}

      {needsBg && <ColorInput label="Page background" value={bg} onChange={setBg} />}

      {design.frame.enabled && (
        <label className="flex items-center justify-between gap-3 cursor-pointer rounded-lg border border-studio-border px-3 py-2.5">
          <span className="text-sm text-studio-text">Include the frame</span>
          <input type="checkbox" role="switch" className="h-5 w-5 accent-studio-accent" checked={includeFrame} onChange={e => setIncludeFrame(e.target.checked)} />
        </label>
      )}

      <div>
        <label htmlFor={nameId} className="studio-label">File name</label>
        <input id={nameId} className="studio-input" value={filename} maxLength={80} onChange={e => setFilename(e.target.value)} />
      </div>

      {!ready && <p className="text-sm text-studio-muted">Fill in the content first. The export buttons turn on once the code is valid.</p>}

      <div className="flex gap-2">
        <button type="button" className="studio-btn-primary flex-1" disabled={!ready || !!busy} onClick={() => run('download')}>
          {busy === 'download' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          Download {format.toUpperCase()}
        </button>
        {canCopy && (
          <button type="button" className="studio-btn-secondary" disabled={!ready || !!busy} onClick={() => run('copy')} title="Copy as PNG">
            {busy === 'copy' ? <Loader2 size={16} className="animate-spin" /> : <Copy size={16} />}
            Copy
          </button>
        )}
      </div>

      <p role="status" aria-live="polite" className={`min-h-5 text-sm ${message?.kind === 'error' ? 'text-studio-error' : 'text-studio-success'}`}>
        {message && (message.kind === 'ok' ? <span className="inline-flex items-center gap-1.5"><Check size={14} />{message.text}</span> : message.text)}
      </p>
    </div>
  );
}
