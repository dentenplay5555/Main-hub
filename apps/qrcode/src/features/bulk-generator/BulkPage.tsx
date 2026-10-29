import { useMemo, useRef, useState } from 'react';
import { Download, Loader2, Upload, X } from 'lucide-react';
import type { ExportFormat, QRDesignSettings } from '@/types';
import { buildBulkRows, MAX_BULK_ROWS, rawRowsFromCSV, rawRowsFromLines, type BulkMode } from '@/lib/qr/bulk';
import { clampSize, downloadBlob, exportQR, FORMAT_EXTENSION } from '@/lib/qr/render';
import { csvEscape } from '@/lib/csv';

interface BulkPageProps { design: QRDesignSettings }

type InputKind = 'lines' | 'csv';

export default function BulkPage({ design }: BulkPageProps) {
  const [mode, setMode] = useState<BulkMode>('url');
  const [kind, setKind] = useState<InputKind>('lines');
  const [text, setText] = useState('');
  const [format, setFormat] = useState<ExportFormat>('png');
  const [size, setSize] = useState(Math.min(design.width, 2048));
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const cancelRef = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const raw = useMemo(() => (kind === 'csv' ? rawRowsFromCSV(text) : rawRowsFromLines(text)), [kind, text]);
  const tooMany = raw.length > MAX_BULK_ROWS;
  const rows = useMemo(() => buildBulkRows(raw.slice(0, MAX_BULK_ROWS), mode, design.errorCorrection), [raw, mode, design.errorCorrection]);
  const valid = rows.filter(r => !r.error);
  const invalid = rows.filter(r => r.error);

  const loadFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setMessage({ kind: 'error', text: 'That file is over 2 MB. Split it into smaller lists.' }); return; }
    setText(await file.text());
    if (/\.csv$/i.test(file.name)) setKind('csv');
    setMessage(null);
  };

  const generate = async () => {
    if (valid.length === 0 || running) return;
    setRunning(true);
    cancelRef.current = false;
    setProgress(0);
    setMessage(null);
    try {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      const px = clampSize(size);
      const bg = design.background.type === 'solid' ? design.background.color : '#ffffff';
      const failed: string[] = [];
      let done = 0;
      for (const row of valid) {
        if (cancelRef.current) break;
        try {
          const blob = await exportQR(row.payload, design, { format, width: px, height: px, quality: 0.92, backgroundColor: bg, includeFrame: true });
          zip.file(`${row.name}.${FORMAT_EXTENSION[format]}`, blob);
        } catch {
          failed.push(row.name);
        }
        done++;
        setProgress(done);
        await new Promise(r => setTimeout(r, 0));
      }
      if (cancelRef.current) { setMessage({ kind: 'error', text: `Cancelled after ${done} of ${valid.length}. Nothing was downloaded.` }); return; }
      const manifest = ['file,content', ...valid.filter(r => !failed.includes(r.name)).map(r => `${csvEscape(`${r.name}.${FORMAT_EXTENSION[format]}`)},${csvEscape(r.payload)}`)].join('\r\n');
      zip.file('manifest.csv', manifest);
      const out = await zip.generateAsync({ type: 'blob' });
      downloadBlob(out, 'qr-codes.zip');
      const skipped = invalid.length + failed.length;
      setMessage({ kind: 'ok', text: `Downloaded ${valid.length - failed.length} codes in qr-codes.zip.${skipped ? ` ${skipped} row${skipped === 1 ? ' was' : 's were'} skipped.` : ''}` });
    } catch (e) {
      setMessage({ kind: 'error', text: e instanceof Error ? e.message : 'Could not create the ZIP file.' });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-6 p-4 lg:grid-cols-2 lg:p-6">
      <section className="studio-panel space-y-4 p-4" aria-label="Bulk input">
        <h2 className="text-base font-semibold text-studio-text">Your list</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1 text-sm text-studio-muted">Content is
            <select className="studio-select" value={mode} onChange={e => setMode(e.target.value as BulkMode)}>
              <option value="url">Links (http and https)</option>
              <option value="text">Plain text</option>
            </select>
          </label>
          <label className="space-y-1 text-sm text-studio-muted">Input format
            <select className="studio-select" value={kind} onChange={e => setKind(e.target.value as InputKind)}>
              <option value="lines">One item per line</option>
              <option value="csv">CSV</option>
            </select>
          </label>
        </div>
        <label className="block space-y-1 text-sm text-studio-muted">
          {kind === 'csv' ? 'Paste CSV. A header with content/url and name columns is picked up.' : 'Paste one item per line.'}
          <textarea
            className="studio-input min-h-48 font-mono text-sm"
            value={text}
            onChange={e => setText(e.target.value)}
            spellCheck={false}
            placeholder={kind === 'csv' ? 'name,url\nhome,example.com\ndocs,example.com/docs' : 'example.com\nexample.com/docs'}
          />
        </label>
        <input ref={fileRef} type="file" accept=".csv,.txt,text/csv,text/plain" className="sr-only" aria-label="Load a CSV or text file" onChange={e => { void loadFile(e.target.files?.[0]); e.target.value = ''; }} />
        <button type="button" className="studio-btn-secondary" onClick={() => fileRef.current?.click()}><Upload size={15} /> Load a .csv or .txt file</button>
        <p className="text-xs text-studio-muted">Up to {MAX_BULK_ROWS} codes per run. They use the design from the Create page, including colors, logo and frame.</p>
      </section>

      <div className="space-y-4">
        <section className="studio-panel space-y-4 p-4" aria-label="Bulk output">
          <h2 className="text-base font-semibold text-studio-text">Output</h2>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 text-sm text-studio-muted">File type
              <select className="studio-select" value={format} onChange={e => setFormat(e.target.value as ExportFormat)}>
                <option value="png">PNG</option><option value="svg">SVG</option><option value="jpg">JPG</option><option value="pdf">PDF</option>
              </select>
            </label>
            <label className="space-y-1 text-sm text-studio-muted">Size (px)
              <input type="number" className="studio-input" min={64} max={4096} value={size} onChange={e => setSize(Number(e.target.value))} onBlur={() => setSize(s => clampSize(s))} />
            </label>
          </div>
          {format === 'pdf' && <p className="text-xs text-studio-muted">PDF files are large. For hundreds of codes, PNG or SVG keeps the ZIP smaller.</p>}

          <p className="text-sm text-studio-text" aria-live="polite">
            {raw.length === 0 ? 'Nothing to generate yet.' : `${valid.length} ready${invalid.length ? `, ${invalid.length} with problems` : ''}.`}
          </p>
          {tooMany && <p role="alert" className="text-sm text-studio-warning">Only the first {MAX_BULK_ROWS} of {raw.length} rows will be used.</p>}

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="studio-btn-primary" disabled={valid.length === 0 || running} onClick={generate}>
              {running ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} {running ? `Generating ${progress} of ${valid.length}` : 'Generate ZIP'}
            </button>
            {running && <button type="button" className="studio-btn-secondary" onClick={() => { cancelRef.current = true; }}><X size={15} /> Cancel</button>}
          </div>
          {running && <progress className="h-2 w-full" max={valid.length} value={progress} aria-label="Generation progress" />}
          {message && <p role={message.kind === 'error' ? 'alert' : 'status'} className={`text-sm ${message.kind === 'error' ? 'text-studio-error' : 'text-studio-success'}`}>{message.text}</p>}
        </section>

        {invalid.length > 0 && (
          <section className="studio-panel p-4" aria-label="Rows with problems">
            <h2 className="mb-2 text-base font-semibold text-studio-text">Rows to fix</h2>
            <p className="mb-2 text-xs text-studio-muted">These are left out of the ZIP.</p>
            <ul className="max-h-60 space-y-1.5 overflow-y-auto text-sm">
              {invalid.map(r => (
                <li key={r.index} className="rounded-lg border border-studio-border px-3 py-2">
                  <span className="font-medium text-studio-text">Row {r.index}</span>
                  <span className="text-studio-error"> · {r.error}</span>
                  {r.payload && <div className="truncate text-xs text-studio-muted">{r.payload}</div>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
