import type { QRDesignSettings, ColorConfig } from '@/types';

/** Margin is stored in pixels at this reference size and scaled to whatever size is rendered. */
export const MARGIN_REFERENCE = 1024;

function parseHex(hex: string): [number, number, number] | null {
  const m = hex.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function relativeLuminance(hex: string): number | null {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb.map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number | null {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  if (la === null || lb === null) return null;
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** The colour used for contrast checks: a gradient is judged by its lightest stop (worst case on a light background is its darkest, so both are checked). */
function colorsOf(config: ColorConfig): string[] {
  if (config.type === 'gradient' && config.gradient) return config.gradient.colorStops.map(s => s.color);
  return [config.color];
}

export interface ScanCheck {
  level: 'ok' | 'warning' | 'error';
  message: string;
}

/**
 * Practical checks for "will this code scan?". These are guidelines, not a guarantee: always test
 * with a real phone before printing.
 */
export function checkScannability(design: QRDesignSettings): ScanCheck[] {
  const checks: ScanCheck[] = [];

  const bgTransparent = design.background.color === 'transparent' && design.background.type === 'solid';
  const bg = bgTransparent ? null : design.background.color;

  if (bg) {
    const fgColors = [...colorsOf(design.foreground), ...colorsOf(design.cornerSquareColor), ...colorsOf(design.cornerDotColor)];
    let worst = Infinity;
    let inverted = false;
    const lbg = relativeLuminance(bg);
    for (const c of fgColors) {
      const ratio = contrastRatio(c, bg);
      if (ratio !== null) worst = Math.min(worst, ratio);
      const lc = relativeLuminance(c);
      if (lc !== null && lbg !== null && lc > lbg) inverted = true;
    }
    if (worst !== Infinity) {
      if (worst < 3) {
        checks.push({ level: 'error', message: `Contrast is ${worst.toFixed(1)}:1. Scanners need at least 3:1, and 4.5:1 or more is safer.` });
      } else if (worst < 4.5) {
        checks.push({ level: 'warning', message: `Contrast is ${worst.toFixed(1)}:1. It should scan, but 4.5:1 or more is safer for printing.` });
      }
    }
    if (inverted) {
      checks.push({ level: 'warning', message: 'Light modules on a dark background (inverted). Phone cameras read these, but many older or dedicated scanners do not.' });
    }
  } else {
    checks.push({ level: 'warning', message: 'Transparent background: contrast depends on whatever the code is placed on. Use dark modules on a light surface.' });
  }

  const marginRatio = design.margin / MARGIN_REFERENCE;
  if (marginRatio < 0.05) {
    checks.push({ level: 'warning', message: 'The quiet zone (margin) is small. Scanners need about 4 modules of empty space around the code.' });
  }

  if (design.logo.enabled && design.logo.src) {
    if (design.logo.size > 0.3) {
      checks.push({ level: 'warning', message: `The logo covers a large part of the code (${Math.round(design.logo.size * 100)}% of its width). Keep it at 30% or less.` });
    }
    if (design.errorCorrection === 'L' || design.errorCorrection === 'M') {
      checks.push({ level: 'warning', message: 'A logo hides modules. Use error correction Q or H so the code can still be recovered.' });
    }
  }

  if (checks.length === 0) {
    checks.push({ level: 'ok', message: 'Contrast and margin look fine for scanning.' });
  }
  return checks;
}
