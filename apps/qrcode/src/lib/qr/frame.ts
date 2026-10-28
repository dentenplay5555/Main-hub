import type { FrameConfig } from '@/types';

/** Frame sizes (padding, font size) are authored against a 300px QR and scaled to the rendered size. */
export const FRAME_REFERENCE = 300;

export interface FrameLayout {
  width: number;
  height: number;
  qrX: number;
  qrY: number;
  qrSize: number;
  /** Text band below the QR. Zero height when there is no frame. */
  bandY: number;
  bandH: number;
  pad: number;
  radius: number;
  fontSize: number;
}

export function computeFrameLayout(size: number, frame: FrameConfig | null): FrameLayout {
  if (!frame || !frame.enabled) {
    return { width: size, height: size, qrX: 0, qrY: 0, qrSize: size, bandY: size, bandH: 0, pad: 0, radius: 0, fontSize: 0 };
  }
  const scale = size / FRAME_REFERENCE;
  const pad = Math.round(frame.padding * scale);
  const fontSize = Math.max(8, Math.round(frame.fontSize * scale));
  const bandH = Math.round(fontSize * 2.4);
  const radius = frame.style === 'simple' ? 0 : Math.round(16 * scale);
  return {
    width: size + pad * 2,
    height: size + pad * 2 + bandH,
    qrX: pad,
    qrY: pad,
    qrSize: size,
    bandY: pad + size + pad,
    bandH,
    pad,
    radius,
    fontSize,
  };
}

export function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c] as string));
}

export const FRAME_FONT = 'Inter, "Noto Sans Thai", system-ui, -apple-system, "Segoe UI", sans-serif';
