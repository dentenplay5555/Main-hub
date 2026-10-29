import type { ErrorCorrectionLevel } from '@/types';
import { parseCSV } from '@/lib/csv';
import { sanitizeFilename } from '@/lib/validation';
import { normalizeURL } from './payload';
import { checkCapacity } from './capacity';

export const MAX_BULK_ROWS = 500;

export type BulkMode = 'url' | 'text';

export interface BulkRow {
  /** 1-based position in the input, for error messages. */
  index: number;
  /** File name without extension. */
  name: string;
  /** What goes into the QR code. */
  payload: string;
  error?: string;
}

const CONTENT_HEADERS = ['content', 'url', 'text', 'data', 'link'];
const NAME_HEADERS = ['name', 'filename', 'file', 'label', 'title'];

function pad(n: number, width: number) {
  return String(n).padStart(width, '0');
}

interface RawRow { content: string; name: string }

export function rawRowsFromLines(text: string): RawRow[] {
  return text.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(content => ({ content, name: '' }));
}

/**
 * Reads a CSV with an optional header row. With a header, the content column is the one called
 * content/url/text/data/link and the name column is name/filename/label/title. Without one, a single
 * column is content, and with two or more the first is the file name and the second the content.
 */
export function rawRowsFromCSV(text: string): RawRow[] {
  const rows = parseCSV(text);
  if (rows.length === 0) return [];
  const header = rows[0].map(c => c.trim().toLowerCase());
  const contentCol = header.findIndex(h => CONTENT_HEADERS.includes(h));
  if (contentCol >= 0) {
    const nameCol = header.findIndex(h => NAME_HEADERS.includes(h));
    return rows.slice(1).map(r => ({ content: (r[contentCol] ?? '').trim(), name: nameCol >= 0 ? (r[nameCol] ?? '').trim() : '' }));
  }
  if (rows[0].length === 1) return rows.map(r => ({ content: r[0].trim(), name: '' }));
  return rows.map(r => ({ name: r[0].trim(), content: (r[1] ?? '').trim() }));
}

/** Turns raw rows into validated rows with unique, filesystem-safe names. */
export function buildBulkRows(raw: RawRow[], mode: BulkMode, ec: ErrorCorrectionLevel): BulkRow[] {
  const width = Math.max(3, String(raw.length).length);
  const used = new Set<string>();
  return raw.map((r, i) => {
    const index = i + 1;
    let base = r.name ? sanitizeFilename(r.name) : `qr-${pad(index, width)}`;
    if (base === 'qr-code' && !r.name) base = `qr-${pad(index, width)}`;
    let name = base;
    for (let n = 2; used.has(name.toLowerCase()); n++) name = `${base}-${n}`;
    used.add(name.toLowerCase());

    const content = r.content.trim();
    if (!content) return { index, name, payload: '', error: 'Empty content.' };
    const payload = mode === 'url' ? normalizeURL(content) : content;
    if (mode === 'url') {
      try {
        const u = new URL(payload);
        if (!['http:', 'https:'].includes(u.protocol)) return { index, name, payload, error: 'Only http and https links are allowed in URL mode.' };
      } catch {
        return { index, name, payload, error: 'Not a valid URL.' };
      }
    }
    const cap = checkCapacity(payload, ec);
    if (cap.tooLong) return { index, name, payload, error: `Too long for error correction ${ec} (${cap.bytes} of ${cap.limit} bytes).` };
    return { index, name, payload };
  });
}
