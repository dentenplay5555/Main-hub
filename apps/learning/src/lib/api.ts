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
export interface Assessment {
  id: string;
  created_at: string;
  scores: Array<{ criterion: string; score: number }>;
  imported: { level: string | null; flag: string | null };
}
export interface StudentItem {
  email: string | null;
  profile: Profile;
  /** Real results from the database. Independent of submission. */
  assessment: Assessment | null;
  /** Whether the practice exercise was submitted. Independent of assessment. */
  submission: { submitted: boolean; count: number; last_at: string | null };
}

const ex = EXERCISE_ID ? `exercise_id=${encodeURIComponent(EXERCISE_ID)}` : '';

export const api = {
  me: (s: Session) => get<Me & { ok: true }>(s, '/v1/me'),
  /** The signed-in student's real result (matched by email to the roster). */
  myAssessment: (s: Session) => get<{ in_roster: boolean; profile: Profile | null; assessment: Assessment | null }>(s, '/v1/my/assessment'),
  /** Whether this student has submitted the practice exercise. Separate from the assessment above. */
  async mySubmission(s: Session): Promise<{ submitted: boolean; last_at: string | null }> {
    const list = await get<{ items: Array<{ created_at: string }> }>(s, `/v1/my/submissions?limit=1${ex ? `&${ex}` : ''}`);
    return { submitted: list.items.length > 0, last_at: list.items[0]?.created_at ?? null };
  },
  /** Teacher: the whole roster with assessment + submission status. */
  teacherStudents: (s: Session) => get<{ items: StudentItem[] }>(s, `/v1/teacher/students${ex ? `?${ex}` : ''}`).then((r) => r.items),
};
