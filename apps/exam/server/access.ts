// Access-control helpers (pure functions, no I/O) so they can be unit-tested.
// Principle: FAIL CLOSED. Missing/short secrets or empty allow-lists never grant access.

export interface AccessEnv {
  SESSION_SECRET?: string;
  DEV_EMAILS?: string;
  TEACHER_EMAILS?: string;
  /** Optional JSON: {"teacher@nssc.ac.th": ["ม.3/1","ม.3/2"]}. If unset, teachers see all classes. */
  TEACHER_CLASSES?: string;
}

export type Role = 'student' | 'teacher' | 'dev';

export const MIN_SECRET_LENGTH = 32;

const STUDENT_DOMAIN = '@student.nssc.ac.th';
const STAFF_DOMAIN = '@nssc.ac.th';

/** Returns the secret only if it is configured and long enough; otherwise null (caller must refuse to serve). */
export function getSessionSecret(env: AccessEnv): string | null {
  const s = (env.SESSION_SECRET || '').trim();
  return s.length >= MIN_SECRET_LENGTH ? s : null;
}

export function parseEmailList(value?: string): string[] {
  return (value || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Decide the role for a Google-verified email.
 * - dev / teacher: only if explicitly listed in DEV_EMAILS / TEACHER_EMAILS (exact match, no defaults).
 * - student: only @student.nssc.ac.th
 * - anything else (including unlisted @nssc.ac.th staff): null = not allowed.
 */
export function resolveRole(email: string, env: AccessEnv): Role | null {
  const e = email.trim().toLowerCase();
  if (!e.endsWith(STUDENT_DOMAIN) && !e.endsWith(STAFF_DOMAIN)) return null;
  if (parseEmailList(env.DEV_EMAILS).includes(e)) return 'dev';
  if (parseEmailList(env.TEACHER_EMAILS).includes(e)) return 'teacher';
  if (e.endsWith(STUDENT_DOMAIN)) return 'student';
  return null;
}

/** Parses TEACHER_CLASSES. Returns null when unset; returns {} (nobody mapped) when set but invalid. */
export function parseTeacherClasses(value?: string): Record<string, string[]> | null {
  if (value === undefined || value.trim() === '') return null;
  try {
    const raw = JSON.parse(value) as unknown;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const out: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (Array.isArray(v)) out[k.trim().toLowerCase()] = v.filter((x): x is string => typeof x === 'string');
    }
    return out;
  } catch {
    return {};
  }
}

/** Classes a user may read. Students: none (they only read their own row). */
export function allowedClasses(user: { email: string; role: Role }, allClasses: string[], env: AccessEnv): string[] {
  if (user.role === 'dev') return allClasses;
  if (user.role !== 'teacher') return [];
  const map = parseTeacherClasses(env.TEACHER_CLASSES);
  if (map === null) return allClasses; // no mapping configured: whitelisted teachers see every class
  const mine = map[user.email.trim().toLowerCase()] || [];
  return allClasses.filter(c => mine.includes(c));
}

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  const n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(s: string): boolean {
  return UUID_RE.test(s);
}
