import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify, type JWTPayload } from 'jose';
import type { Env } from './env.ts';

// The Authorization header is the ONE thing the gateway is strict about.
// Everything else in a request is accepted leniently (see normalize.ts).

export interface AuthUser {
  id: string;
  email: string;
  claims: JWTPayload;
}

export class AuthError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 401) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export function bearerToken(header: string | null | undefined): string | null {
  if (!header) return null;
  const m = header.match(/^Bearer\s+(\S+)\s*$/i);
  return m ? m[1] : null;
}

function allowedDomains(env: Env): string[] {
  return (env.ALLOWED_EMAIL_DOMAINS ?? '')
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

export async function verifyUser(authorization: string | null | undefined, env: Env): Promise<AuthUser> {
  if (!authorization) {
    throw new AuthError('missing_token', 'Authorization header is required: "Authorization: Bearer <token>".');
  }
  const token = bearerToken(authorization);
  if (!token) {
    throw new AuthError('malformed_authorization', 'Authorization header must look like "Bearer <token>".');
  }
  if (!env.SUPABASE_URL) {
    throw new AuthError('auth_not_configured', 'Gateway is missing SUPABASE_URL.', 500);
  }

  const base = env.SUPABASE_URL.replace(/\/$/, '');
  const options = { issuer: `${base}/auth/v1`, audience: 'authenticated' };

  let payload: JWTPayload;
  try {
    const alg = decodeProtectedHeader(token).alg;
    if (alg === 'HS256') {
      if (!env.SUPABASE_JWT_SECRET) {
        throw new AuthError('auth_not_configured', 'Token is HS256 but SUPABASE_JWT_SECRET is not set.', 500);
      }
      ({ payload } = await jwtVerify(token, new TextEncoder().encode(env.SUPABASE_JWT_SECRET), {
        ...options,
        algorithms: ['HS256'],
      }));
    } else {
      let jwks = jwksCache.get(base);
      if (!jwks) {
        jwks = createRemoteJWKSet(new URL(`${base}/auth/v1/.well-known/jwks.json`));
        jwksCache.set(base, jwks);
      }
      ({ payload } = await jwtVerify(token, jwks, options));
    }
  } catch (e) {
    if (e instanceof AuthError) throw e;
    throw new AuthError('invalid_token', 'Token is invalid or expired.');
  }

  const id = typeof payload.sub === 'string' ? payload.sub : '';
  const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : '';
  if (!UUID.test(id) || !email) {
    throw new AuthError('invalid_token', 'Token has no user identity.');
  }

  const domains = allowedDomains(env);
  if (domains.length > 0 && !domains.includes(email.split('@')[1] ?? '')) {
    throw new AuthError('domain_not_allowed', 'This account is not in an allowed school domain.', 403);
  }

  return { id, email, claims: payload };
}
