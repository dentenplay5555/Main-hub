// Secure Session & OAuth State Management using Web Crypto API (HMAC-SHA256)
// Works across Cloudflare Workers, Pages Functions, and standard Web environments.

export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'teacher' | 'dev';
  classes?: string[];
  iat?: number;
  exp?: number;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let str = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getCryptoKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

// Sign session into tamper-proof token: <header>.<payload>.<signature>
export async function signSession(
  user: Omit<UserSession, 'iat' | 'exp'>,
  secret: string,
  ttlSeconds: number = 86400 * 7
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: UserSession = {
    ...user,
    iat: now,
    exp: now + ttlSeconds
  };

  const enc = new TextEncoder();
  const headerB64 = base64UrlEncode(enc.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const payloadB64 = base64UrlEncode(enc.encode(JSON.stringify(payload)));
  const dataToSign = enc.encode(`${headerB64}.${payloadB64}`);

  const key = await getCryptoKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, dataToSign);
  const sigB64 = base64UrlEncode(new Uint8Array(signature));

  return `${headerB64}.${payloadB64}.${sigB64}`;
}

// Verify session signature and expiry
export async function verifySession(token: string, secret: string): Promise<UserSession | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, sigB64] = parts;
    const enc = new TextEncoder();
    const dataToSign = enc.encode(`${headerB64}.${payloadB64}`);
    const sigBytes = base64UrlDecode(sigB64);

    const key = await getCryptoKey(secret);
    const isValid = await crypto.subtle.verify('HMAC', key, sigBytes as BufferSource, dataToSign);
    if (!isValid) return null;

    const dec = new TextDecoder();
    const payload = JSON.parse(dec.decode(base64UrlDecode(payloadB64))) as UserSession;

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== 'number' || payload.exp < now) {
      return null;
    }
    if (!payload.id || !payload.email || !['student', 'teacher', 'dev'].includes(payload.role)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

// Generate cryptographically secure OAuth CSRF state
export function generateOAuthState(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

// Helper to parse cookies safely handling '=' in values
export function parseCookies(cookieHeader: string | null): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  for (const item of cookieHeader.split(';')) {
    const idx = item.indexOf('=');
    if (idx !== -1) {
      const k = item.slice(0, idx).trim();
      const v = item.slice(idx + 1).trim();
      if (k) {
        try {
          cookies[k] = decodeURIComponent(v);
        } catch {
          cookies[k] = v;
        }
      }
    }
  }
  return cookies;
}
