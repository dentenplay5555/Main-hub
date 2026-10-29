import type { QRContentType } from '@/types';
import { detectContentType } from './payload';

export interface ParsedField {
  label: string;
  value: string;
  /** Hidden until the user asks to see it (Wi-Fi passwords). */
  secret?: boolean;
}

export interface ParsedQR {
  type: QRContentType | 'unknown';
  fields: ParsedField[];
  /** Set only for http(s) links, the one thing the scanner offers to open. */
  openUrl?: string;
  /** Hostname of openUrl, shown prominently so look-alike domains are easier to spot. */
  host?: string;
}

function safeDecode(s: string): string {
  try { return decodeURIComponent(s); } catch { return s; }
}

/** Splits on `sep` unless it is preceded by a backslash. */
function splitUnescaped(s: string, sep: string): string[] {
  const out: string[] = [];
  let cur = '';
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '\\' && i + 1 < s.length) { cur += s[i] + s[i + 1]; i++; }
    else if (s[i] === sep) { out.push(cur); cur = ''; }
    else cur += s[i];
  }
  out.push(cur);
  return out;
}

function unescapeBackslash(s: string): string {
  return s.replace(/\\([\;,":])/g, '$1');
}

function unescapeText(s: string): string {
  return s.replace(/\\n/gi, '\n').replace(/\\([\;,])/g, '$1');
}

function add(fields: ParsedField[], label: string, value: string | undefined, secret = false) {
  if (value && value.trim()) fields.push({ label, value, ...(secret ? { secret } : {}) });
}

function parseWifi(text: string): ParsedField[] {
  const fields: ParsedField[] = [];
  const map: Record<string, string> = {};
  for (const part of splitUnescaped(text.slice(5), ';')) {
    const idx = part.indexOf(':');
    if (idx > 0) map[part.slice(0, idx).toUpperCase()] = unescapeBackslash(part.slice(idx + 1));
  }
  add(fields, 'Network name', map.S);
  add(fields, 'Security', map.T === 'nopass' || !map.T ? 'None (open network)' : map.T);
  add(fields, 'Password', map.P, true);
  if (map.H?.toLowerCase() === 'true') add(fields, 'Hidden network', 'Yes');
  return fields;
}

function unfold(text: string): string[] {
  return text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
}

function parseVCard(text: string): ParsedField[] {
  const fields: ParsedField[] = [];
  const phones: string[] = [];
  const emails: string[] = [];
  for (const line of unfold(text)) {
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const key = line.slice(0, idx).split(';')[0].toUpperCase();
    const val = line.slice(idx + 1);
    switch (key) {
      case 'FN': add(fields, 'Name', unescapeText(val)); break;
      case 'ORG': add(fields, 'Organization', unescapeText(val).replace(/;/g, ' ')); break;
      case 'TITLE': add(fields, 'Title', unescapeText(val)); break;
      case 'TEL': phones.push(unescapeText(val)); break;
      case 'EMAIL': emails.push(unescapeText(val)); break;
      case 'URL': add(fields, 'Website', val); break;
      case 'ADR': add(fields, 'Address', splitUnescaped(val, ';').map(unescapeText).filter(Boolean).join(', ')); break;
      case 'NOTE': add(fields, 'Note', unescapeText(val)); break;
    }
  }
  phones.forEach(p => add(fields, 'Phone', p));
  emails.forEach(e => add(fields, 'Email', e));
  return fields;
}

function parseCalendar(text: string): ParsedField[] {
  const fields: ParsedField[] = [];
  for (const line of unfold(text)) {
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const key = line.slice(0, idx).split(';')[0].toUpperCase();
    const val = line.slice(idx + 1);
    const fmt = (v: string) => {
      const m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?/);
      return m ? `${m[1]}-${m[2]}-${m[3]}${m[4] ? ` ${m[4]}:${m[5]}` : ''}` : v;
    };
    if (key === 'SUMMARY') add(fields, 'Title', unescapeText(val));
    if (key === 'DTSTART') add(fields, 'Starts', fmt(val));
    if (key === 'DTEND') add(fields, 'Ends', fmt(val));
    if (key === 'LOCATION') add(fields, 'Location', unescapeText(val));
    if (key === 'DESCRIPTION') add(fields, 'Description', unescapeText(val));
  }
  return fields;
}

export function parseDecoded(text: string): ParsedQR {
  const type = detectContentType(text);
  const fields: ParsedField[] = [];
  let openUrl: string | undefined;
  let host: string | undefined;

  switch (type) {
    case 'wifi':
      return { type, fields: parseWifi(text) };
    case 'vcard':
      return { type, fields: parseVCard(text) };
    case 'calendar':
      return { type, fields: parseCalendar(text) };
    case 'email': {
      const rest = text.slice(7);
      const [addr, query = ''] = rest.split('?');
      add(fields, 'To', safeDecode(addr));
      const params = new URLSearchParams(query);
      add(fields, 'Subject', params.get('subject') ?? undefined);
      add(fields, 'Message', params.get('body') ?? undefined);
      return { type, fields };
    }
    case 'sms': {
      const lower = text.toLowerCase();
      if (lower.startsWith('smsto:')) {
        const rest = text.slice(6);
        const i = rest.indexOf(':');
        add(fields, 'To', i < 0 ? rest : rest.slice(0, i));
        add(fields, 'Message', i < 0 ? undefined : rest.slice(i + 1));
      } else {
        const rest = text.slice(4);
        const [num, query = ''] = rest.split('?');
        add(fields, 'To', safeDecode(num));
        add(fields, 'Message', new URLSearchParams(query).get('body') ?? undefined);
      }
      return { type, fields };
    }
    case 'phone':
      add(fields, 'Phone', text.slice(4));
      return { type, fields };
    case 'geo': {
      const [coords, query = ''] = text.slice(4).split('?');
      const q = new URLSearchParams(query).get('q');
      if (q) add(fields, 'Search', q);
      if (coords && coords !== '0,0') {
        const [lat, lng] = coords.split(',');
        add(fields, 'Latitude', lat);
        add(fields, 'Longitude', lng);
      }
      return { type, fields };
    }
    case 'whatsapp': {
      try {
        const u = new URL(text);
        add(fields, 'Phone', u.pathname.replace(/\//g, ''));
        add(fields, 'Message', u.searchParams.get('text') ?? undefined);
      } catch { add(fields, 'Link', text); }
      return { type, fields };
    }
    case 'url': {
      try {
        const u = new URL(text);
        if (u.protocol === 'http:' || u.protocol === 'https:') { openUrl = u.href; host = u.hostname; }
      } catch { /* fall through to plain text */ }
      add(fields, 'Link', text);
      return { type, fields, openUrl, host };
    }
    default:
      add(fields, 'Text', text);
      return { type: 'unknown', fields };
  }
}

/** Warnings about a link worth showing before the user opens it. */
export function linkWarnings(host: string | undefined): string[] {
  if (!host) return [];
  const out: string[] = [];
  if (/^xn--|\.xn--/i.test(host) || /[^\x00-\x7F]/.test(host)) out.push('The address uses non-Latin characters, which can imitate a familiar site.');
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) out.push('The address is a raw IP number, not a named site.');
  return out;
}
