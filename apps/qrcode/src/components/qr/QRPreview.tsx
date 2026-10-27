import { useEffect, useRef, useState, useMemo } from 'react';
import QRCodeStyling from 'qr-code-styling';
import type { QRDesignSettings, ColorConfig } from '@/types';
import { ZoomIn, ZoomOut, RotateCcw, Grid3X3 } from 'lucide-react';

interface QRPreviewProps {
  payload: string;
  design: QRDesignSettings;
  valid: boolean;
}

function buildColorOption(config: ColorConfig) {
  if (config.type === 'gradient' && config.gradient) {
    return {
      gradient: {
        type: config.gradient.type,
        rotation: config.gradient.rotation * (Math.PI / 180),
        colorStops: config.gradient.colorStops,
      },
    };
  }
  return { color: config.color };
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function QRPreview({ payload, design, valid }: QRPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<QRCodeStyling | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showCheckerboard, setShowCheckerboard] = useState(false);

  // Debounce payload to avoid thrashing the renderer on every keystroke
  const debouncedPayload = useDebounce(payload, 300);

  const previewSize = 280;

  const qrOptions = useMemo(() => ({
    width: previewSize,
    height: previewSize,
    data: debouncedPayload || 'https://example.com',
    margin: Math.round((design.margin / design.width) * previewSize),
    qrOptions: {
      errorCorrectionLevel: design.errorCorrection,
    },
    dotsOptions: {
      type: design.dotType,
      ...buildColorOption(design.foreground),
    },
    cornersSquareOptions: {
      type: design.cornerSquareType,
      ...buildColorOption(design.cornerSquareColor),
    },
    cornersDotOptions: {
      type: design.cornerDotType,
      ...buildColorOption(design.cornerDotColor),
    },
    backgroundOptions: design.background.color === 'transparent'
      ? { color: 'transparent' }
      : buildColorOption(design.background),
    imageOptions: design.logo.enabled && design.logo.src
      ? {
          hideBackgroundDots: design.logo.hideBackgroundDots,
          imageSize: design.logo.size,
          margin: design.logo.padding,
        }
      : undefined,
    image: design.logo.enabled && design.logo.src ? design.logo.src : undefined,
  }), [debouncedPayload, design, previewSize]);

  useEffect(() => {
    if (!containerRef.current) return;

    if (!qrRef.current) {
      qrRef.current = new QRCodeStyling(qrOptions as Parameters<typeof QRCodeStyling>[0]);
      containerRef.current.innerHTML = '';
      qrRef.current.append(containerRef.current);
    } else {
      qrRef.current.update(qrOptions as Parameters<typeof QRCodeStyling>[0]);
    }
  }, [qrOptions]);

  const handleZoomIn = () => setZoom(z => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.25, 0.5));
  const handleReset = () => setZoom(1);

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-md">
      {/* Preview area */}
      <div
        className={`
          relative rounded-panel overflow-hidden border border-studio-border
          ${showCheckerboard ? 'checkerboard' : 'bg-studio-panel'}
        `}
        style={{ padding: '24px' }}
      >
        <div
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center', transition: 'transform 0.15s ease' }}
        >
          <div ref={containerRef} className="flex items-center justify-center" />
        </div>

        {!valid && (
          <div className="absolute inset-0 flex items-center justify-center bg-studio-bg/60 rounded-panel">
            <span className="text-sm text-studio-muted">Enter content to generate QR code</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <button className="studio-btn-ghost p-2" onClick={handleZoomOut} aria-label="Zoom out" title="Zoom out">
          <ZoomOut size={16} />
        </button>
        <span className="text-xs text-studio-muted w-12 text-center">{Math.round(zoom * 100)}%</span>
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

      {/* Dimensions indicator */}
      <p className="text-xs text-studio-muted">
        Export: {design.width} x {design.height}px
      </p>
    </div>
  );
}
