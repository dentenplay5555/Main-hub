import { useEffect, useRef, useState } from 'react';
import type { QRDesignSettings } from '@/types';
import { renderQRCanvas } from '@/lib/qr/render';
import { ZoomIn, ZoomOut, RotateCcw, Grid3X3 } from 'lucide-react';

interface QRPreviewProps {
  payload: string;
  design: QRDesignSettings;
  valid: boolean;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

const PREVIEW_SIZE = 280;

export function QRPreview({ payload, design, valid }: QRPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderId = useRef(0);
  const [zoom, setZoom] = useState(1);
  const [showCheckerboard, setShowCheckerboard] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Typing and dragging sliders fire many updates; render only once things settle.
  const debouncedPayload = useDebounce(payload, 250);
  const debouncedDesign = useDebounce(design, 120);

  useEffect(() => {
    const id = ++renderId.current;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    renderQRCanvas(debouncedPayload, debouncedDesign, Math.round(PREVIEW_SIZE * dpr), { includeFrame: true })
      .then(source => {
        // A newer render started while this one was running: drop the stale result.
        if (id !== renderId.current) return;
        const target = canvasRef.current;
        if (!target) return;
        target.width = source.width;
        target.height = source.height;
        target.style.width = `${source.width / dpr}px`;
        target.style.height = `${source.height / dpr}px`;
        target.getContext('2d')?.drawImage(source, 0, 0);
        setError(null);
      })
      .catch(err => {
        if (id === renderId.current) setError(err instanceof Error ? err.message : 'Could not render the QR code.');
      });
  }, [debouncedPayload, debouncedDesign]);

  const handleZoomIn = () => setZoom(z => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.25, 0.5));
  const handleReset = () => setZoom(1);

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-md">
      <div
        className={`relative rounded-panel overflow-auto max-w-full max-h-[70vh] border border-studio-border ${showCheckerboard ? 'checkerboard' : 'bg-studio-panel'}`}
        style={{ padding: '24px' }}
      >
        <div style={{ transform: `scale(${zoom})`, transformOrigin: 'center', transition: 'transform 0.15s ease' }}>
          <canvas ref={canvasRef} role="img" aria-label="QR code preview" data-testid="qr-preview" />
        </div>

        {!valid && (
          <div className="absolute inset-0 flex items-center justify-center bg-studio-bg/70 rounded-panel">
            <span className="text-sm text-studio-muted px-4 text-center">Enter content to generate a QR code</span>
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-studio-error">{error}</p>
      )}

      <div className="flex items-center gap-2">
        <button className="studio-btn-ghost p-2" onClick={handleZoomOut} aria-label="Zoom out" title="Zoom out">
          <ZoomOut size={16} />
        </button>
        <span className="text-xs text-studio-muted w-12 text-center" aria-live="polite">{Math.round(zoom * 100)}%</span>
        <button className="studio-btn-ghost p-2" onClick={handleZoomIn} aria-label="Zoom in" title="Zoom in">
          <ZoomIn size={16} />
        </button>
        <button className="studio-btn-ghost p-2" onClick={handleReset} aria-label="Reset zoom" title="Reset zoom">
          <RotateCcw size={16} />
        </button>
        <div className="w-px h-5 bg-studio-border mx-1" />
        <button
          className={`studio-btn-ghost p-2 ${showCheckerboard ? 'text-studio-accent' : ''}`}
          onClick={() => setShowCheckerboard(v => !v)}
          aria-label="Toggle checkerboard background"
          title="Checkerboard (transparency)"
          aria-pressed={showCheckerboard}
        >
          <Grid3X3 size={16} />
        </button>
      </div>

      <p className="text-xs text-studio-muted">Default export size: {design.width} x {design.height}px</p>
    </div>
  );
}
