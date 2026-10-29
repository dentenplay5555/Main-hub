import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Copy, ExternalLink, Eye, EyeOff, ImageUp, Loader2, RefreshCw, Trash2, Download, AlertTriangle } from 'lucide-react';
import type { ScanResult } from '@/types';
import { decodeFile, decodeQR } from '@/lib/qr/decode';
import { linkWarnings, parseDecoded } from '@/lib/qr/parse';
import { clearScanHistory, deleteScanResult, getScanHistory, saveScanResult } from '@/lib/storage/db';
import { downloadBlob } from '@/lib/qr/render';
import { makeId } from '@/lib/id';
import { useSettings } from '@/state/settings';

type CameraState = 'off' | 'starting' | 'on' | 'error';

const TYPE_LABEL: Record<string, string> = {
  url: 'Link', text: 'Text', wifi: 'Wi-Fi', vcard: 'Contact', email: 'Email', sms: 'SMS', phone: 'Phone',
  geo: 'Location', calendar: 'Event', whatsapp: 'WhatsApp', social: 'Social', custom: 'Custom', unknown: 'Text',
};

function cameraMessage(err: unknown): string {
  const name = err instanceof DOMException ? err.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'Camera permission was denied. Allow camera access for this site in the browser settings, then try again.';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'No camera was found on this device. You can scan from an image instead.';
  if (name === 'NotReadableError') return 'The camera is in use by another app. Close it and try again.';
  return 'The camera could not be started.';
}

export default function ScanPage() {
  const { settings } = useSettings();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const loopRef = useRef<number | null>(null);
  const lastRef = useRef<{ text: string; at: number }>({ text: '', at: 0 });
  const fileRef = useRef<HTMLInputElement>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const [camera, setCamera] = useState<CameraState>('off');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [hasMultiple, setHasMultiple] = useState(false);
  const [current, setCurrent] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<ScanResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const refreshHistory = useCallback(() => getScanHistory().then(setHistory).catch(() => setHistory([])), []);
  useEffect(() => { void refreshHistory(); }, [refreshHistory]);

  const stopCamera = useCallback(() => {
    if (loopRef.current !== null) { clearTimeout(loopRef.current); loopRef.current = null; }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCamera('off');
  }, []);
  useEffect(() => stopCamera, [stopCamera]);

  const record = useCallback(async (text: string, source: ScanResult['source']) => {
    const result: ScanResult = { id: makeId('scan'), text, contentType: parseDecoded(text).type, timestamp: Date.now(), source };
    setCurrent(result);
    setRevealed(false);
    if (settingsRef.current.scannerHistoryEnabled) {
      await saveScanResult(result).catch(() => {});
      void refreshHistory();
    }
  }, [refreshHistory]);

  const startCamera = useCallback(async (mode: 'environment' | 'user') => {
    setCameraError(null);
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setCamera('error');
      setCameraError('The camera needs a secure page (https or localhost). Open this site over https, or scan from an image instead.');
      return;
    }
    stopCamera();
    setCamera('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: mode }, width: { ideal: 1280 } }, audio: false });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) { stream.getTracks().forEach(t => t.stop()); return; }
      video.srcObject = stream;
      await video.play();
      setCamera('on');
      navigator.mediaDevices.enumerateDevices().then(d => setHasMultiple(d.filter(x => x.kind === 'videoinput').length > 1)).catch(() => {});

      const tick = async () => {
        const v = videoRef.current;
        if (!v || !streamRef.current) return;
        let text: string | null = null;
        if (v.readyState >= 2) text = await decodeQR(v).catch(() => null);
        if (!streamRef.current) return;
        if (text) {
          const now = Date.now();
          const same = lastRef.current.text === text && now - lastRef.current.at < 3000;
          lastRef.current = { text, at: now };
          if (!same) {
            await record(text, 'camera');
            if (!settingsRef.current.continuousScanning) { stopCamera(); return; }
          }
        }
        loopRef.current = window.setTimeout(tick, 150);
      };
      loopRef.current = window.setTimeout(tick, 150);
    } catch (err) {
      stopCamera();
      setCamera('error');
      setCameraError(cameraMessage(err));
    }
  }, [record, stopCamera]);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setImageError(null);
    setBusy(true);
    try {
      const text = await decodeFile(file);
      if (text) await record(text, 'image');
      else setImageError('No QR code was found in that image. Try a sharper photo with the whole code in view.');
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'That image could not be read.');
    } finally {
      setBusy(false);
    }
  };

  const flash = (msg: string) => { setNotice(msg); window.setTimeout(() => setNotice(n => (n === msg ? null : n)), 2500); };

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      flash(`${what} copied.`);
    } catch {
      flash('Copying is blocked here. Select the text and copy it manually.');
    }
  };

  const parsed = current ? parseDecoded(current.text) : null;
  const warnings = parsed ? linkWarnings(parsed.host) : [];
  const password = parsed?.fields.find(f => f.secret)?.value;

  return (
    <div className="mx-auto grid max-w-6xl gap-6 p-4 lg:grid-cols-2 lg:p-6">
      <div className="space-y-4">
        <section className="studio-panel space-y-4 p-4" aria-label="Scan with camera">
          <h2 className="text-base font-semibold text-studio-text">Camera</h2>
          <div className="relative aspect-square max-h-[60vh] w-full overflow-hidden rounded-lg border border-studio-border bg-black">
            <video ref={videoRef} playsInline muted className={`h-full w-full object-cover ${camera === 'on' ? '' : 'invisible'}`} aria-label="Camera preview" />
            {camera === 'on' && (
              <div className="pointer-events-none absolute inset-[18%] rounded-2xl border-2 border-white/80 shadow-[0_0_0_999px_rgba(0,0,0,0.35)]" aria-hidden="true" />
            )}
            {camera !== 'on' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-sm text-studio-muted">
                {camera === 'starting' ? <Loader2 className="animate-spin" size={28} /> : camera === 'error' ? <CameraOff size={28} /> : <Camera size={28} />}
                <p>{camera === 'starting' ? 'Starting the camera' : camera === 'error' ? cameraError : 'Point the camera at a QR code. Nothing leaves your device.'}</p>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {camera === 'on' ? (
              <button type="button" className="studio-btn-secondary" onClick={stopCamera}><CameraOff size={16} /> Stop camera</button>
            ) : (
              <button type="button" className="studio-btn-primary" disabled={camera === 'starting'} onClick={() => startCamera(facing)}>
                <Camera size={16} /> {camera === 'error' ? 'Try again' : 'Start camera'}
              </button>
            )}
            {hasMultiple && camera === 'on' && (
              <button type="button" className="studio-btn-secondary" onClick={() => { const next = facing === 'environment' ? 'user' : 'environment'; setFacing(next); void startCamera(next); }}>
                <RefreshCw size={16} /> Switch camera
              </button>
            )}
          </div>
          <p className="text-xs text-studio-muted">
            {settings.continuousScanning ? 'Continuous scanning is on: the camera keeps running after each code.' : 'The camera stops after the first code. Turn on continuous scanning in Settings to keep it running.'}
          </p>
        </section>

        <section
          className={`studio-panel space-y-3 p-4 transition-colors ${dragging ? 'border-studio-accent bg-studio-accent/10' : ''}`}
          aria-label="Scan from an image"
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); void handleFile(e.dataTransfer.files[0]); }}
        >
          <h2 className="text-base font-semibold text-studio-text">Image</h2>
          <input ref={fileRef} type="file" accept="image/*" className="sr-only" aria-label="Choose an image to scan" onChange={e => { void handleFile(e.target.files?.[0]); e.target.value = ''; }} />
          <button type="button" className="studio-btn-secondary w-full" disabled={busy} onClick={() => fileRef.current?.click()}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <ImageUp size={16} />} Choose an image
          </button>
          <p className="text-xs text-studio-muted">Or drop a screenshot or photo here. PNG, JPG, WebP and SVG work, up to 15 MB.</p>
          {imageError && <p role="alert" className="text-sm text-studio-error">{imageError}</p>}
        </section>
      </div>

      <div className="space-y-4">
        <section className="studio-panel space-y-3 p-4" aria-label="Scan result" aria-live="polite">
          <h2 className="text-base font-semibold text-studio-text">Result</h2>
          {!current || !parsed ? (
            <p className="text-sm text-studio-muted">Scanned codes show up here, with what is inside them.</p>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-studio-accent/15 px-2 py-0.5 text-xs font-semibold text-studio-accent">{TYPE_LABEL[parsed.type]}</span>
                <span className="text-xs text-studio-muted">{current.source === 'camera' ? 'Camera' : 'Image'} · {new Date(current.timestamp).toLocaleTimeString()}</span>
              </div>

              {parsed.host && (
                <p className="text-sm text-studio-muted">Goes to <strong className="break-all text-studio-text">{parsed.host}</strong></p>
              )}
              {warnings.map((w, i) => (
                <p key={i} className="flex items-start gap-2 rounded-lg bg-studio-warning/10 px-3 py-2 text-sm text-studio-warning"><AlertTriangle size={14} className="mt-0.5 shrink-0" />{w}</p>
              ))}

              <dl className="space-y-2">
                {parsed.fields.map((f, i) => (
                  <div key={i} className="rounded-lg border border-studio-border px-3 py-2">
                    <dt className="text-xs text-studio-muted">{f.label}</dt>
                    <dd className="flex items-start justify-between gap-2">
                      <span className="max-h-40 min-w-0 flex-1 overflow-y-auto whitespace-pre-wrap break-all text-sm text-studio-text">
                        {f.secret && !revealed ? '••••••••' : f.value}
                      </span>
                      {f.secret && (
                        <button type="button" className="studio-btn-ghost p-1.5" aria-label={revealed ? 'Hide password' : 'Show password'} onClick={() => setRevealed(v => !v)}>
                          {revealed ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="flex flex-wrap gap-2">
                <button type="button" className="studio-btn-secondary" onClick={() => copy(current.text, 'Text')}><Copy size={15} /> Copy all</button>
                {password && <button type="button" className="studio-btn-secondary" onClick={() => copy(password, 'Password')}><Copy size={15} /> Copy password</button>}
                {parsed.openUrl && (
                  <a className="studio-btn-primary" href={parsed.openUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} /> Open link</a>
                )}
                {parsed.type === 'phone' && <a className="studio-btn-primary" href={current.text}>Call</a>}
                {parsed.type === 'email' && <a className="studio-btn-primary" href={current.text}>Write email</a>}
                {parsed.type === 'vcard' && (
                  <button type="button" className="studio-btn-secondary" onClick={() => downloadBlob(new Blob([current.text], { type: 'text/vcard' }), 'contact.vcf')}><Download size={15} /> Save contact (.vcf)</button>
                )}
                {parsed.type === 'calendar' && (
                  <button type="button" className="studio-btn-secondary" onClick={() => downloadBlob(new Blob([current.text], { type: 'text/calendar' }), 'event.ics')}><Download size={15} /> Save event (.ics)</button>
                )}
              </div>
              {parsed.openUrl && <p className="text-xs text-studio-muted">Links never open on their own. Check the address above before you open it.</p>}
            </>
          )}
          <p role="status" className="min-h-5 text-sm text-studio-success">{notice}</p>
        </section>

        <section className="studio-panel p-4" aria-label="Scan history">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-studio-text">History</h2>
            {history.length > 0 && (
              <button type="button" className="studio-btn-ghost text-xs" onClick={async () => { if (confirm('Delete the whole scan history?')) { await clearScanHistory().catch(() => {}); void refreshHistory(); } }}>
                <Trash2 size={14} /> Clear
              </button>
            )}
          </div>
          {!settings.scannerHistoryEnabled && <p className="mb-2 text-xs text-studio-muted">History is off in Settings, so new scans are not saved.</p>}
          {history.length === 0 ? (
            <p className="text-sm text-studio-muted">Nothing saved yet.</p>
          ) : (
            <ul className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
              {history.map(h => (
                <li key={h.id} className="flex items-center gap-2">
                  <button type="button" className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-studio-border px-3 py-2 text-left hover:bg-studio-surface" onClick={() => { setCurrent(h); setRevealed(false); }}>
                    <span className="shrink-0 rounded bg-studio-panel px-1.5 py-0.5 text-[10px] font-semibold text-studio-muted">{TYPE_LABEL[h.contentType] ?? 'Text'}</span>
                    <span className="min-w-0 flex-1 truncate text-sm text-studio-text">{h.text.replace(/\s+/g, ' ')}</span>
                    <span className="shrink-0 text-[11px] text-studio-muted">{new Date(h.timestamp).toLocaleDateString()}</span>
                  </button>
                  <button type="button" className="studio-btn-ghost p-2" aria-label="Delete this entry" onClick={async () => { await deleteScanResult(h.id).catch(() => {}); void refreshHistory(); }}>
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
