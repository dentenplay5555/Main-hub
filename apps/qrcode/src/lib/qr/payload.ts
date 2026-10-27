import type { QRContent, WiFiContent, VCardContent, EmailContent, CalendarContent } from '@/types';

/**
 * Escape special characters in Wi-Fi SSID/password fields per Wi-Fi QR spec.
 * Characters that need escaping: \ ; , " :
 */
function escapeWiFiField(value: string): string {
  return value.replace(/([\\;,":])/, '\\$1');
}

function formatWiFiPayload(content: WiFiContent): string {
  const parts: string[] = ['WIFI:'];
  parts.push(`T:${content.encryption};`);
  parts.push(`S:${escapeWiFiField(content.ssid)};`);
  if (content.encryption !== 'nopass' && content.password) {
    parts.push(`P:${escapeWiFiField(content.password)};`);
  }
  if (content.hidden) {
    parts.push('H:true;');
  }
  parts.push(';');
  return parts.join('');
}

function formatVCardPayload(content: VCardContent): string {
  const lines: string[] = [
    'BEGIN:VCARD',
    'VERSION:3.0',
  ];

  const fullName = [content.firstName, content.lastName].filter(Boolean).join(' ');
  if (fullName) {
    lines.push(`FN:${fullName}`);
    lines.push(`N:${content.lastName || ''};${content.firstName || ''};;;`);
  }

  if (content.organization) lines.push(`ORG:${content.organization}`);
  if (content.title) lines.push(`TITLE:${content.title}`);
  if (content.phone) lines.push(`TEL:${content.phone}`);
  if (content.email) lines.push(`EMAIL:${content.email}`);
  if (content.website) lines.push(`URL:${content.website}`);
  if (content.address) lines.push(`ADR:;;${content.address};;;;`);
  if (content.note) lines.push(`NOTE:${content.note}`);

  lines.push('END:VCARD');
  return lines.join('\r\n');
}

function formatEmailPayload(content: EmailContent): string {
  let uri = `mailto:${encodeURIComponent(content.address)}`;
  const params: string[] = [];
  if (content.subject) params.push(`subject=${encodeURIComponent(content.subject)}`);
  if (content.body) params.push(`body=${encodeURIComponent(content.body)}`);
  if (params.length > 0) uri += `?${params.join('&')}`;
  return uri;
}

function padDatePart(value: string, time: string): string {
  // Convert YYYY-MM-DD + HH:MM to YYYYMMDDTHHmmSS format
  const d = value.replace(/-/g, '');
  const t = time.replace(/:/g, '') + '00';
  return `${d}T${t}`;
}

function formatCalendarPayload(content: CalendarContent): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
  ];

  if (content.title) lines.push(`SUMMARY:${content.title}`);
  if (content.description) lines.push(`DESCRIPTION:${content.description}`);
  if (content.location) lines.push(`LOCATION:${content.location}`);

  if (content.startDate) {
    if (content.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${content.startDate.replace(/-/g, '')}`);
    } else {
      lines.push(`DTSTART:${padDatePart(content.startDate, content.startTime || '00:00')}`);
    }
  }
  if (content.endDate) {
    if (content.allDay) {
      lines.push(`DTEND;VALUE=DATE:${content.endDate.replace(/-/g, '')}`);
    } else {
      lines.push(`DTEND:${padDatePart(content.endDate, content.endTime || '00:00')}`);
    }
  }

  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Generate the raw QR payload string from structured content.
 * This is separated from rendering so it can be tested and previewed independently.
 */
export function generatePayload(content: QRContent): string {
  switch (content.type) {
    case 'url':
      return content.url;
    case 'text':
      return content.text;
    case 'wifi':
      return formatWiFiPayload(content);
    case 'vcard':
      return formatVCardPayload(content);
    case 'email':
      return formatEmailPayload(content);
    case 'sms': {
      let uri = `smsto:${content.phone}`;
      if (content.message) uri += `:${content.message}`;
      return uri;
    }
    case 'phone':
      return `tel:${content.phone}`;
    case 'geo': {
      if (content.query) return `geo:0,0?q=${encodeURIComponent(content.query)}`;
      return `geo:${content.latitude},${content.longitude}`;
    }
    case 'calendar':
      return formatCalendarPayload(content);
    case 'whatsapp': {
      const phone = content.phone.replace(/[^0-9]/g, '');
      let url = `https://wa.me/${phone}`;
      if (content.message) url += `?text=${encodeURIComponent(content.message)}`;
      return url;
    }
    case 'social':
      return content.url;
    case 'custom':
      return content.payload;
    default:
      return '';
  }
}

/**
 * Determine the QR content type from a decoded string.
 */
export function detectContentType(text: string): QRContent['type'] | 'unknown' {
  const lower = text.toLowerCase();
  if (lower.startsWith('wifi:')) return 'wifi';
  if (lower.startsWith('begin:vcard')) return 'vcard';
  if (lower.startsWith('mailto:')) return 'email';
  if (lower.startsWith('smsto:') || lower.startsWith('sms:')) return 'sms';
  if (lower.startsWith('tel:')) return 'phone';
  if (lower.startsWith('geo:')) return 'geo';
  if (lower.startsWith('begin:vcalendar')) return 'calendar';
  if (lower.startsWith('https://wa.me/') || lower.startsWith('http://wa.me/')) return 'whatsapp';
  if (/^https?:\/\//i.test(text)) return 'url';
  return 'unknown';
}
