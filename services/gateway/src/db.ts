import type { Env } from './env.ts';

export interface SubmissionRow {
  user_id: string;
  user_email: string;
  exercise_id: string | null;
  part: string | null;
  cycle: string | null;
  score: number | null;
  max_score: number | null;
  answers: unknown;
  raw: { body: unknown };
  warnings: string[];
  client_ts: string | null;
  idempotency_key: string | null;
  user_agent: string | null;
}

export class DbError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.status = status;
  }
}

function headers(env: Env): Record<string, string> {
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
}

/** Insert via Supabase's REST API with the service-role key (the gateway is the only holder of that key). */
export async function insertSubmission(
  env: Env,
  row: SubmissionRow,
): Promise<{ id: string | null; duplicate: boolean }> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new DbError('gateway database is not configured');
  }
  const base = env.SUPABASE_URL.replace(/\/$/, '');

  let res: Response;
  try {
    res = await fetch(`${base}/rest/v1/submissions?on_conflict=user_id,idempotency_key`, {
      method: 'POST',
      headers: { ...headers(env), Prefer: 'resolution=ignore-duplicates,return=representation' },
      body: JSON.stringify(row),
    });
  } catch {
    throw new DbError('database unreachable');
  }
  if (!res.ok) throw new DbError(`database insert failed (${res.status})`, res.status);

  const inserted = (await res.json().catch(() => [])) as Array<{ id?: string }>;
  if (Array.isArray(inserted) && inserted.length > 0) return { id: inserted[0].id ?? null, duplicate: false };

  // Nothing returned = the same idempotency key was already stored. Hand back the original id.
  if (row.idempotency_key) {
    const q = `select=id&user_id=eq.${encodeURIComponent(row.user_id)}&idempotency_key=eq.${encodeURIComponent(row.idempotency_key)}&limit=1`;
    try {
      const existing = await fetch(`${base}/rest/v1/submissions?${q}`, { headers: headers(env) });
      if (existing.ok) {
        const rows = (await existing.json()) as Array<{ id?: string }>;
        return { id: rows[0]?.id ?? null, duplicate: true };
      }
    } catch {
      /* fall through */
    }
  }
  return { id: null, duplicate: true };
}
