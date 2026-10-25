import type { Env } from './env.ts';
import type { Part, PartScore } from './normalize.ts';

export interface SubmissionRow {
  user_id: string;
  user_email: string;
  exercise_id: string | null;
  cycle: string | null;
  score: number | null;
  max_score: number | null;
  raw: { body: unknown };
  warnings: string[];
  client_ts: string | null;
  idempotency_key: string | null;
  user_agent: string | null;
  parts: Part[];
  scores: PartScore[];
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

/** One atomic call to the database function ingest_submission (see db/migrations/0003): raw row + parts + scores. */
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
    res = await fetch(`${base}/rest/v1/rpc/ingest_submission`, {
      method: 'POST',
      headers: headers(env),
      body: JSON.stringify({ p: row }),
    });
  } catch {
    throw new DbError('database unreachable');
  }
  if (!res.ok) throw new DbError(`database insert failed (${res.status})`, res.status);

  const out = (await res.json().catch(() => null)) as { id?: string | null; duplicate?: boolean } | null;
  return { id: out?.id ?? null, duplicate: out?.duplicate === true };
}
