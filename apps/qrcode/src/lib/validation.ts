import type { QRContent } from '@/types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function isValidURL(str: string): boolean {
  try {
    const url = new URL(str);
    return ['http:', 'https:', 'ftp:'].includes(url.protocol);
  } catch {
    return false;
  }
}

export function validateContent(content: QRContent): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  switch (content.type) {
    case 'url':
      if (!content.url.trim()) {
        errors.push('URL is required.');
      } else if (!isValidURL(content.url)) {
        // Try with https:// prefix
        if (isValidURL(`https://${content.url}`)) {
          warnings.push('URL does not include a protocol. "https://" will be assumed.');
        } else {
          errors.push('Please enter a valid URL (e.g. https://example.com).');
        }
      }
      break;

    case 'text':
      if (!content.text.trim()) {
        errors.push('Text content is required.');
      }
      if (content.text.length > 4000) {
        warnings.push('Very long text may produce a dense QR code that is difficult to scan.');
      }
      break;

    case 'wifi':
      if (!content.ssid.trim()) {
        errors.push('Network name (SSID) is required.');
      }
      if (content.encryption !== 'nopass' && !content.password.trim()) {
        errors.push('Password is required for encrypted networks.');
      }
      break;

    case 'vcard':
      if (!content.firstName.trim() && !content.lastName.trim()) {
        errors.push('At least a first or last name is required.');
      }
      if (content.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(content.email)) {
        warnings.push('Email address format looks incorrect.');
      }
      break;

    case 'email':
      if (!content.address.trim()) {
        errors.push('Email address is required.');
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(content.address)) {
        errors.push('Please enter a valid email address.');
      }
      break;

    case 'sms':
      if (!content.phone.trim()) {
        errors.push('Phone number is required.');
      }
      break;

    case 'phone':
      if (!content.phone.trim()) {
        errors.push('Phone number is required.');
      }
      break;

    case 'geo':
      if (!content.query.trim()) {
        if (!content.latitude.trim() || !content.longitude.trim()) {
          errors.push('Enter coordinates or a search query.');
        } else {
          const lat = parseFloat(content.latitude);
          const lng = parseFloat(content.longitude);
          if (isNaN(lat) || lat < -90 || lat > 90) errors.push('Latitude must be between -90 and 90.');
          if (isNaN(lng) || lng < -180 || lng > 180) errors.push('Longitude must be between -180 and 180.');
        }
      }
      break;

    case 'calendar':
      if (!content.title.trim()) {
        errors.push('Event title is required.');
      }
      if (!content.startDate) {
        errors.push('Start date is required.');
      }
      if (content.startDate && content.endDate && content.startDate > content.endDate) {
        errors.push('End date must be after start date.');
      }
      break;

    case 'whatsapp':
      if (!content.phone.trim()) {
        errors.push('Phone number is required.');
      }
      break;

    case 'social':
      if (!content.url.trim()) {
        errors.push('Profile URL is required.');
      } else if (!isValidURL(content.url)) {
        if (isValidURL(`https://${content.url.trim()}`)) {
          warnings.push('URL does not include a protocol. "https://" will be assumed.');
        } else {
          errors.push('Please enter a valid URL.');
        }
      }
      break;

    case 'custom':
      if (!content.payload.trim()) {
        errors.push('Payload content is required.');
      }
      break;
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Check if a decoded URL uses a safe protocol.
 */
export function isSafeURL(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:', 'mailto:', 'tel:', 'sms:', 'smsto:', 'geo:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Sanitize a filename for safe use in file system paths.
 */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[._]+/, '')
    .slice(0, 200) || 'qr-code';
}
