import { describe, it, expect } from 'vitest';
import { generatePayload, normalizeURL } from '@/lib/qr/payload';
import { validateContent, sanitizeFilename } from '@/lib/validation';
import { parseDecoded, linkWarnings } from '@/lib/qr/parse';
import { parseCSV, csvEscape } from '@/lib/csv';
import { rawRowsFromCSV, rawRowsFromLines, buildBulkRows } from '@/lib/qr/bulk';
import { checkCapacity } from '@/lib/qr/capacity';
import { checkScannability, contrastRatio } from '@/lib/qr/scannability';
import { computeFrameLayout } from '@/lib/qr/frame';
import { toUtf8Binary } from '@/lib/qr/render';
import { defaultDesign } from '@/lib/defaults';
import type { QRContent } from '@/types';

describe('payload', () => {
  it('adds https:// to scheme-less URLs and keeps real schemes', () => {
    expect(normalizeURL('example.com/a')).toBe('https://example.com/a');
    expect(normalizeURL('http://x.org')).toBe('http://x.org');
    expect(normalizeURL('  ')).toBe('');
  });

  it('escapes every special character in Wi-Fi fields, not just the first', () => {
    const p = generatePayload({ type: 'wifi', ssid: 'a;b;c', password: 'p:w,"d', encryption: 'WPA', hidden: false });
    expect(p).toBe('WIFI:T:WPA;S:a\\;b\\;c;P:p\\:w\\,\\"d;;');
  });

  it('escapes vCard text and keeps one field per line', () => {
    const p = generatePayload({ type: 'vcard', firstName: 'A', lastName: 'B;C', organization: 'X, Y', title: '', phone: '123', email: '', website: '', address: '', note: 'l1\nl2' });
    expect(p).toContain('N:B\\;C;A;;;');
    expect(p).toContain('ORG:X\\, Y');
    expect(p).toContain('NOTE:l1\\nl2');
    expect(p.split('\r\n').filter(l => l.startsWith('NOTE')).length).toBe(1);
  });

  it('does not percent-encode the @ in mailto', () => {
    expect(generatePayload({ type: 'email', address: 'a@b.co', subject: 'Hi there', body: '' })).toBe('mailto:a@b.co?subject=Hi%20there');
  });

  it('makes all-day iCalendar end dates exclusive', () => {
    const p = generatePayload({ type: 'calendar', title: 'T', description: '', location: '', startDate: '2026-02-27', startTime: '', endDate: '2026-02-28', endTime: '', allDay: true });
    expect(p).toContain('DTSTART;VALUE=DATE:20260227');
    expect(p).toContain('DTEND;VALUE=DATE:20260301');
  });

  it('strips spaces and dashes from phone numbers', () => {
    expect(generatePayload({ type: 'phone', phone: '+66 81-234 5678' })).toBe('tel:+66812345678');
  });
});

describe('validation', () => {
  it('warns about a missing protocol for both URL and social', () => {
    expect(validateContent({ type: 'url', url: 'example.com' }).warnings.length).toBe(1);
    const social = validateContent({ type: 'social', platform: 'github', url: 'github.com/x' });
    expect(social.valid).toBe(true);
    expect(social.warnings.length).toBe(1);
  });
  it('sanitizes file names', () => {
    expect(sanitizeFilename('a/b:c*?.png')).toBe('a_b_c_.png');
    expect(sanitizeFilename('...')).toBe('qr-code');
  });
});

describe('scanner parsing', () => {
  const roundTrips: [string, QRContent, [string, string][]][] = [
    ['wifi', { type: 'wifi', ssid: 'My;Net', password: 'p:w', encryption: 'WPA', hidden: true }, [['Network name', 'My;Net'], ['Password', 'p:w'], ['Hidden network', 'Yes']]],
    ['vcard', { type: 'vcard', firstName: 'Ann', lastName: 'Lee', organization: 'Acme, Inc', title: '', phone: '0812345678', email: 'a@b.co', website: '', address: '', note: 'x;y' }, [['Name', 'Ann Lee'], ['Organization', 'Acme, Inc'], ['Phone', '0812345678'], ['Email', 'a@b.co'], ['Note', 'x;y']]],
    ['email', { type: 'email', address: 'a@b.co', subject: 'Hello World', body: 'Line' }, [['To', 'a@b.co'], ['Subject', 'Hello World'], ['Message', 'Line']]],
    ['sms', { type: 'sms', phone: '0812345678', message: 'hi' }, [['To', '0812345678'], ['Message', 'hi']]],
    ['whatsapp', { type: 'whatsapp', phone: '+66 81 234 5678', message: 'สวัสดี' }, [['Phone', '66812345678'], ['Message', 'สวัสดี']]],
    ['geo', { type: 'geo', latitude: '13.75', longitude: '100.5', query: '' }, [['Latitude', '13.75'], ['Longitude', '100.5']]],
  ];
  for (const [name, content, expected] of roundTrips) {
    it(`parses what the generator writes: ${name}`, () => {
      const parsed = parseDecoded(generatePayload(content));
      expect(parsed.type).toBe(name);
      for (const [label, value] of expected) {
        expect(parsed.fields.find(f => f.label === label)?.value).toBe(value);
      }
    });
  }
  it('marks the Wi-Fi password secret', () => {
    expect(parseDecoded('WIFI:T:WPA;S:n;P:secret;;').fields.find(f => f.label === 'Password')?.secret).toBe(true);
  });
  it('only offers to open http(s) links', () => {
    expect(parseDecoded('https://example.com/x').openUrl).toBe('https://example.com/x');
    expect(parseDecoded('javascript:alert(1)').openUrl).toBeUndefined();
    expect(parseDecoded('ftp://example.com').openUrl).toBeUndefined();
  });
  it('flags look-alike and raw-IP hosts', () => {
    expect(linkWarnings('xn--e1afmkfd.com').length).toBe(1);
    expect(linkWarnings('192.168.1.1').length).toBe(1);
    expect(linkWarnings('example.com')).toEqual([]);
  });
});

describe('csv', () => {
  it('handles quotes, embedded commas and newlines, CRLF and BOM', () => {
    expect(parseCSV('﻿name,url\r\n"A, B","https://x.com/?a=1,2"\r\n"multi\nline",y\r\n')).toEqual([
      ['name', 'url'], ['A, B', 'https://x.com/?a=1,2'], ['multi\nline', 'y']]);
  });
  it('detects semicolon and tab delimiters', () => {
    expect(parseCSV('a;b\n1;2')).toEqual([['a', 'b'], ['1', '2']]);
    expect(parseCSV('a\tb\n1\t2')).toEqual([['a', 'b'], ['1', '2']]);
  });
  it('escapes output values', () => {
    expect(csvEscape('a"b,c')).toBe('"a""b,c"');
    expect(csvEscape('plain')).toBe('plain');
  });
});

describe('bulk', () => {
  it('reads a header CSV with name and url columns', () => {
    expect(rawRowsFromCSV('Name,URL\nhome,example.com\n,https://b.org')).toEqual([
      { name: 'home', content: 'example.com' }, { name: '', content: 'https://b.org' }]);
  });
  it('treats a headerless two-column CSV as name,content', () => {
    expect(rawRowsFromCSV('a,https://x.org\nb,https://y.org')[1]).toEqual({ name: 'b', content: 'https://y.org' });
  });
  it('builds unique safe names and flags bad rows', () => {
    const rows = buildBulkRows([
      { name: 'same', content: 'https://a.org' }, { name: 'Same', content: 'https://b.org' },
      { name: '', content: '' }, { name: '', content: 'not a url' }, { name: '', content: 'ftp://x.org' },
    ], 'url', 'M');
    expect(rows.map(r => r.name)).toEqual(['same', 'Same-2', 'qr-003', 'qr-004', 'qr-005']);
    expect(rows.map(r => !!r.error)).toEqual([false, false, true, true, true]);
    expect(rows[0].payload).toBe('https://a.org');
  });
  it('rejects content over the error-correction capacity', () => {
    const rows = buildBulkRows(rawRowsFromLines('x'.repeat(2400)), 'text', 'M');
    expect(rows[0].error).toMatch(/Too long/);
  });
});

describe('capacity, scannability and frame', () => {
  it('counts UTF-8 bytes, not characters', () => {
    expect(checkCapacity('สวัสดี', 'M').bytes).toBe(18);
    expect(checkCapacity('a'.repeat(1300), 'H').tooLong).toBe(true);
    expect(checkCapacity('a'.repeat(1300), 'L').tooLong).toBe(false);
  });
  it('encodes Thai as UTF-8 bytes for the QR library', () => {
    expect(toUtf8Binary('ส').length).toBe(3);
    expect(toUtf8Binary('abc')).toBe('abc');
  });
  it('contrast: black on white is 21:1', () => {
    expect(contrastRatio('#000', '#fff')).toBeCloseTo(21, 0);
  });
  it('the default design passes the scannability checks', () => {
    expect(checkScannability(defaultDesign).map(c => c.level)).toEqual(['ok']);
  });
  it('flags low contrast, inverted colours and a logo with weak error correction', () => {
    const bad = { ...defaultDesign, foreground: { type: 'solid' as const, color: '#cccccc' } };
    expect(checkScannability(bad).some(c => c.level === 'error')).toBe(true);
    const inv = { ...defaultDesign, foreground: { type: 'solid' as const, color: '#ffffff' }, background: { type: 'solid' as const, color: '#000000' } };
    expect(checkScannability(inv).some(c => /inverted/.test(c.message))).toBe(true);
    const logo = { ...defaultDesign, logo: { ...defaultDesign.logo, enabled: true, src: 'x', size: 0.4 } };
    expect(checkScannability(logo).length).toBeGreaterThanOrEqual(2);
  });
  it('frame layout grows around the QR and is a no-op when disabled', () => {
    expect(computeFrameLayout(300, null)).toMatchObject({ width: 300, height: 300, qrX: 0 });
    const l = computeFrameLayout(300, { ...defaultDesign.frame, enabled: true, padding: 16, fontSize: 16 });
    expect(l.width).toBe(332);
    expect(l.height).toBeGreaterThan(332);
    expect(l.bandY).toBe(332);
  });
});
