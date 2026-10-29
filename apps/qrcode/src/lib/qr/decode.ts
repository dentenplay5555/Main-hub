type Source = HTMLVideoElement | HTMLImageElement | ImageBitmap | HTMLCanvasElement;

interface BarcodeDetectorLike {
  detect(source: Source): Promise<{ rawValue: string }[]>;
}

let detectorPromise: Promise<BarcodeDetectorLike | null> | null = null;

/** The browser's own detector (fast, handles blur and tilt well) when it supports QR codes. */
function getNativeDetector(): Promise<BarcodeDetectorLike | null> {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      const BD = (globalThis as unknown as { BarcodeDetector?: { new (o: { formats: string[] }): BarcodeDetectorLike; getSupportedFormats?: () => Promise<string[]> } }).BarcodeDetector;
      if (!BD) return null;
      try {
        const formats = (await BD.getSupportedFormats?.()) ?? ['qr_code'];
        return formats.includes('qr_code') ? new BD({ formats: ['qr_code'] }) : null;
      } catch {
        return null;
      }
    })();
  }
  return detectorPromise;
}

function sizeOf(src: Source): { w: number; h: number } {
  if (src instanceof HTMLVideoElement) return { w: src.videoWidth, h: src.videoHeight };
  if (src instanceof HTMLImageElement) return { w: src.naturalWidth, h: src.naturalHeight };
  return { w: src.width, h: src.height };
}

async function jsqrDecode(src: Source, maxDim: number): Promise<string | null> {
  const { w, h } = sizeOf(src);
  if (!w || !h) return null;
  const scale = Math.min(1, maxDim / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(src, 0, 0, cw, ch);
  const { default: jsQR } = await import('jsqr');
  const result = jsQR(ctx.getImageData(0, 0, cw, ch).data, cw, ch, { inversionAttempts: 'attemptBoth' });
  return result?.data ?? null;
}

/**
 * Reads one QR code from a video frame, image or canvas. `thorough` retries at several sizes, which
 * suits a still photo; live video uses one cheap pass per frame.
 */
export async function decodeQR(src: Source, opts: { thorough?: boolean } = {}): Promise<string | null> {
  const native = await getNativeDetector();
  if (native) {
    try {
      const found = await native.detect(src);
      if (found.length > 0 && found[0].rawValue) return found[0].rawValue;
    } catch {
      // fall through to the JavaScript decoder
    }
  }
  if (!opts.thorough) return jsqrDecode(src, 640);
  for (const dim of [1000, 1600, 2400]) {
    const text = await jsqrDecode(src, dim);
    if (text !== null) return text;
  }
  return null;
}

export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

export async function decodeFile(file: File): Promise<string | null> {
  if (!file.type.startsWith('image/')) throw new Error('That file is not an image.');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('The image is larger than 15 MB.');
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    try {
      await img.decode();
    } catch {
      throw new Error('That image could not be opened.');
    }
    return await decodeQR(img, { thorough: true });
  } finally {
    URL.revokeObjectURL(url);
  }
}
