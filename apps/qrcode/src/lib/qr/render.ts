import QRCodeStyling, { type Options as QROptions } from 'qr-code-styling';
import type { QRDesignSettings, ColorConfig, ExportFormat, ExportOptions } from '@/types';
import { MARGIN_REFERENCE } from './scannability';
import { computeFrameLayout, escapeXml, FRAME_FONT, type FrameLayout } from './frame';

export const MAX_EXPORT_SIZE = 4096;
export const MIN_EXPORT_SIZE = 64;
const PLACEHOLDER = 'https://example.com';

function colorOption(config: ColorConfig) {
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

/** Options for qr-code-styling. `size` is the pixel size of the QR itself (without any frame). */
export function buildQROptions(payload: string, design: QRDesignSettings, size: number): QROptions {
  const hasLogo = design.logo.enabled && !!design.logo.src;
  const transparent = design.background.type === 'solid' && design.background.color === 'transparent';
  const options: QROptions = {
    width: size,
    height: size,
    type: 'canvas',
    data: payload || PLACEHOLDER,
    margin: Math.round((design.margin / MARGIN_REFERENCE) * size),
    qrOptions: { errorCorrectionLevel: design.errorCorrection },
    dotsOptions: { type: design.dotType, ...colorOption(design.foreground) },
    cornersSquareOptions: { type: design.cornerSquareType, ...colorOption(design.cornerSquareColor) },
    cornersDotOptions: { type: design.cornerDotType, ...colorOption(design.cornerDotColor) },
    backgroundOptions: transparent ? { color: 'transparent' } : colorOption(design.background),
  };
  // qr-code-styling throws if these keys exist with an undefined value, so only add them with a logo.
  if (hasLogo) {
    options.image = design.logo.src;
    options.imageOptions = {
      hideBackgroundDots: design.logo.hideBackgroundDots,
      imageSize: design.logo.size,
      margin: design.logo.padding,
      crossOrigin: 'anonymous',
    };
  }
  return options;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** The light card behind the QR inside a simple/rounded frame. */
function cardGeometry(layout: FrameLayout) {
  return {
    x: layout.pad / 2,
    y: layout.pad / 2,
    w: layout.width - layout.pad,
    h: layout.bandY - layout.pad,
    r: layout.radius ? layout.radius * 0.6 : 0,
  };
}

function frameActive(design: QRDesignSettings, includeFrame: boolean): boolean {
  return includeFrame && design.frame.enabled && design.frame.text.trim().length > 0;
}

function layoutFor(design: QRDesignSettings, size: number, includeFrame: boolean): FrameLayout {
  return computeFrameLayout(size, frameActive(design, includeFrame) ? design.frame : null);
}

/**
 * Renders the QR (and frame, when enabled) to a canvas.
 * `fill` paints a solid colour behind everything first (needed for JPG, which has no alpha).
 */
export async function renderQRCanvas(
  payload: string,
  design: QRDesignSettings,
  size: number,
  opts: { includeFrame?: boolean; fill?: string | null } = {},
): Promise<HTMLCanvasElement> {
  const includeFrame = opts.includeFrame ?? true;
  const layout = layoutFor(design, size, includeFrame);
  const qr = new QRCodeStyling(buildQROptions(payload, design, layout.qrSize));
  const blob = (await qr.getRawData('png')) as Blob | null;
  if (!blob) throw new Error('Could not render the QR code.');
  const bitmap = await createImageBitmap(blob);

  const canvas = document.createElement('canvas');
  canvas.width = layout.width;
  canvas.height = layout.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available in this browser.');

  if (opts.fill) {
    ctx.fillStyle = opts.fill;
    ctx.fillRect(0, 0, layout.width, layout.height);
  }

  if (!frameActive(design, includeFrame)) {
    ctx.drawImage(bitmap, 0, 0, layout.qrSize, layout.qrSize);
    bitmap.close();
    return canvas;
  }

  const f = design.frame;
  const transparentBg = design.background.type === 'solid' && design.background.color === 'transparent';
  const cardColor = transparentBg ? null : design.background.color;
  const card = cardGeometry(layout);
  ctx.save();
  roundRect(ctx, 0, 0, layout.width, layout.height, layout.radius);
  ctx.clip();

  if (f.style === 'banner') {
    if (cardColor) {
      ctx.fillStyle = cardColor;
      ctx.fillRect(0, 0, layout.width, layout.bandY);
    }
  } else {
    ctx.fillStyle = f.frameColor;
    ctx.fillRect(0, 0, layout.width, layout.height);
    if (cardColor) {
      ctx.fillStyle = cardColor;
      roundRect(ctx, card.x, card.y, card.w, card.h, card.r);
      ctx.fill();
    } else {
      ctx.globalCompositeOperation = 'destination-out';
      roundRect(ctx, card.x, card.y, card.w, card.h, card.r);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
  }
  ctx.drawImage(bitmap, layout.qrX, layout.qrY, layout.qrSize, layout.qrSize);
  bitmap.close();

  // Text band
  ctx.fillStyle = f.frameColor;
  if (f.style === 'banner') ctx.fillRect(0, layout.bandY, layout.width, layout.bandH);
  ctx.fillStyle = f.textColor;
  ctx.font = `${f.fontWeight === 'bold' ? 700 : 400} ${layout.fontSize}px ${FRAME_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(f.text, layout.width / 2, layout.bandY + layout.bandH / 2, layout.width - layout.pad * 2);
  ctx.restore();
  return canvas;
}

async function renderSvg(payload: string, design: QRDesignSettings, size: number, includeFrame: boolean): Promise<string> {
  const layout = layoutFor(design, size, includeFrame);
  const qr = new QRCodeStyling({ ...buildQROptions(payload, design, layout.qrSize), type: 'svg' });
  const raw = (await qr.getRawData('svg')) as Blob | null;
  if (!raw) throw new Error('Could not render the QR code.');
  const svgText = await raw.text();
  if (!frameActive(design, includeFrame)) return svgText;

  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const inner = doc.documentElement;
  inner.setAttribute('x', String(layout.qrX));
  inner.setAttribute('y', String(layout.qrY));
  inner.setAttribute('width', String(layout.qrSize));
  inner.setAttribute('height', String(layout.qrSize));
  const innerStr = new XMLSerializer().serializeToString(inner);

  const f = design.frame;
  const transparentBg = design.background.type === 'solid' && design.background.color === 'transparent';
  const card_ = transparentBg ? 'none' : design.background.color;
  const r = layout.radius;
  const c = cardGeometry(layout);
  const clipId = 'qr-frame-clip';
  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}">`);
  parts.push(`<defs><clipPath id="${clipId}"><rect width="${layout.width}" height="${layout.height}" rx="${r}" ry="${r}"/></clipPath></defs>`);
  parts.push(`<g clip-path="url(#${clipId})">`);
  if (f.style === 'banner') {
    if (card_ !== 'none') parts.push(`<rect width="${layout.width}" height="${layout.bandY}" fill="${card_}"/>`);
    parts.push(`<rect y="${layout.bandY}" width="${layout.width}" height="${layout.bandH}" fill="${f.frameColor}"/>`);
  } else if (card_ === 'none') {
    // Transparent card: even-odd path so the card area stays see-through.
    const { x, y, w, h, r: cr } = c;
    parts.push(
      `<path fill-rule="evenodd" fill="${f.frameColor}" d="M0 0H${layout.width}V${layout.height}H0Z M${x + cr} ${y}H${x + w - cr}Q${x + w} ${y} ${x + w} ${y + cr}V${y + h - cr}Q${x + w} ${y + h} ${x + w - cr} ${y + h}H${x + cr}Q${x} ${y + h} ${x} ${y + h - cr}V${y + cr}Q${x} ${y} ${x + cr} ${y}Z"/>`,
    );
  } else {
    parts.push(`<rect width="${layout.width}" height="${layout.height}" fill="${f.frameColor}"/>`);
    parts.push(`<rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" rx="${c.r}" ry="${c.r}" fill="${card_}"/>`);
  }
  parts.push(innerStr);
  parts.push(
    `<text x="${layout.width / 2}" y="${layout.bandY + layout.bandH / 2}" fill="${f.textColor}" font-family='${FRAME_FONT.replace(/"/g, '')}' font-size="${layout.fontSize}" font-weight="${f.fontWeight === 'bold' ? 700 : 400}" text-anchor="middle" dominant-baseline="central">${escapeXml(f.text)}</text>`,
  );
  parts.push('</g></svg>');
  return parts.join('');
}

export function clampSize(n: number): number {
  if (!Number.isFinite(n)) return 1024;
  return Math.min(MAX_EXPORT_SIZE, Math.max(MIN_EXPORT_SIZE, Math.round(n)));
}

export async function exportQR(payload: string, design: QRDesignSettings, opts: ExportOptions): Promise<Blob> {
  const size = clampSize(opts.width);
  const { format } = opts;

  if (format === 'svg') {
    const svg = await renderSvg(payload, design, size, opts.includeFrame);
    return new Blob([svg], { type: 'image/svg+xml' });
  }

  const wantsFill = format === 'jpg' || format === 'pdf';
  const canvas = await renderQRCanvas(payload, design, size, {
    includeFrame: opts.includeFrame,
    fill: wantsFill ? opts.backgroundColor : null,
  });

  if (format === 'pdf') {
    const { jsPDF } = await import('jspdf');
    const pageW = 210;
    const pageH = 297;
    const target = Math.min(120, pageW - 40);
    const w = target;
    const h = (canvas.height / canvas.width) * target;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    doc.addImage(canvas.toDataURL('image/png'), 'PNG', (pageW - w) / 2, Math.min(40, (pageH - h) / 2), w, h);
    return doc.output('blob');
  }

  const mime = format === 'jpg' ? 'image/jpeg' : 'image/png';
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Could not encode the image.'))), mime, format === 'jpg' ? opts.quality : undefined);
  });
}

export const FORMAT_EXTENSION: Record<ExportFormat, string> = { png: 'png', svg: 'svg', jpg: 'jpg', pdf: 'pdf' };

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
