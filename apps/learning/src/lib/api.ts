import { createClient, type Session } from '@supabase/supabase-js';
import { EXERCISE_ID, GATEWAY_URL, SUPABASE_KEY, SUPABASE_URL } from './config.ts';
import type { ScoreRow } from './diagnose.ts';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function get<T>(session: Session, path: string): Promise<T> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 20000);
  let res: Response;
  try {
    res = await fetch(GATEWAY_URL + path, { headers: { Authorization: `Bearer ${session.access_token}` }, signal: ctl.signal });
  } catch {
    throw new ApiError(0, 'network', 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ลองใหม่อีกครั้ง');
  } finally {
    clearTimeout(timer);
  }
  const body = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
  if (!res.ok) throw new ApiError(res.status, body?.error?.code ?? 'error', body?.error?.message ?? `เกิดข้อผิดพลาด (${res.status})`);
  return body as T;
}

export interface Me { email: string; role: 'teacher' | 'student' }
export interface Profile { name: string | null; klass: string | null; no: string | null }
export interface OverviewItem { id: string; user_email: string; exercise_id: string | null; created_at: string; profile: Profile; scores: ScoreRow[] }

const ex = EXERCISE_ID ? `exercise_id=${encodeURIComponent(EXERCISE_ID)}` : '';

export const api = {
  me: (s: Session) => get<Me & { ok: true }>(s, '/v1/me'),
  /** Newest submission of the signed-in student with all of its scores, or null if they have not submitted. */
  async mine(s: Session): Promise<{ created_at: string; scores: ScoreRow[] } | null> {
    const list = await get<{ items: Array<{ id: string }> }>(s, `/v1/my/submissions?limit=1${ex ? `&${ex}` : ''}`);
    const id = list.items[0]?.id;
    if (!id) return null;
    const d = await get<{ item: { created_at: string; scores: ScoreRow[] } }>(s, `/v1/my/submissions/${id}`);
    return d.item;
  },
  overview: (s: Session) => get<{ items: OverviewItem[] }>(s, `/v1/teacher/overview${ex ? `?${ex}` : ''}`).then((r) => r.items),
};
