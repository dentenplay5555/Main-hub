import type { Context, Hono } from 'hono';
import { AuthError, type AuthUser } from './auth.ts';
import { selectRows } from './db.ts';
import type { Env } from './env.ts';

// Read endpoints. Students see only their own rows (always filtered by the verified token's user id).
// The teacher (emails listed in TEACHER_EMAILS) can read everything. Nothing here is writable.

type C = Context<{ Bindings: Env; Variables: { user: AuthUser } }>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SUMMARY = 'id,user_email,exercise_id,cycle,score,max_score,client_ts,created_at';

export function roleOf(user: AuthUser, env: Env): 'teacher' | 'student' {
  const list = String(env.TEACHER_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(user.email.toLowerCase()) ? 'teacher' : 'student';
}

function requireTeacher(c: C): AuthUser {
  const user = c.get('user');
  if (roleOf(user, c.env) !== 'teacher') throw new AuthError('forbidden', 'Teacher access only.', 403);
  return user;
}

function limitOf(c: C, def = 50, max = 200): number {
  const n = Math.floor(Number(c.req.query('limit')));
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : def;
}

/** PostgREST filter values: keep only safe characters so a query string can't inject extra filters. */
function safe(v: string | undefined): string | null {
  const t = (v ?? '').trim();
  return t && /^[\w@.+\-:/ ]{1,128}$/.test(t) ? encodeURIComponent(t) : null;
}

async function detail(env: Env, id: string, ownerId?: string) {
  const owner = ownerId ? `&user_id=eq.${encodeURIComponent(ownerId)}` : '';
  const [sub] = await selectRows(env, 'raw_submissions', `select=${SUMMARY},warnings&id=eq.${id}${owner}&limit=1`);
  if (!sub) return null;
  const [parts, scores] = await Promise.all([
    selectRows(env, 'submission_parts', `select=part_key,data,is_empty&submission_id=eq.${id}&order=part_key`),
    selectRows(env, 'part_scores', `select=part_key,path,criterion,score&submission_id=eq.${id}&order=part_key,path`),
  ]);
  return { ...sub, parts, scores };
}

type Profile = { name: string | null; klass: string | null; no: string | null };

const str = (v: unknown): string | null =>
  (typeof v === 'string' || typeof v === 'number') && String(v).trim() ? String(v).trim().slice(0, 128) : null;

// ---- Assessments: the real results live in Supabase (writing_assessments + scores), not in submissions ----
type RawAssessment = {
  id: string;
  created_at: string;
  mastery_level?: string | null;
  guess_tag?: string | null;
  writing_assessment_scores?: Array<{ score: number | string; rubric_criteria?: { code?: string } | Array<{ code?: string }> | null }>;
};
export interface Assessment {
  id: string;
  created_at: string;
  scores: Array<{ criterion: string; score: number }>;
  /** What the original PRISM import recorded; shown to the teacher only as a data-quality hint. */
  imported: { level: string | null; flag: string | null };
}

export function toAssessment(a: RawAssessment | undefined | null): Assessment | null {
  if (!a) return null;
  const scores: Assessment['scores'] = [];
  for (const row of a.writing_assessment_scores ?? []) {
    const rc = Array.isArray(row.rubric_criteria) ? row.rubric_criteria[0] : row.rubric_criteria;
    const score = Number(row.score);
    if (rc?.code && Number.isFinite(score)) scores.push({ criterion: rc.code, score });
  }
  return { id: a.id, created_at: a.created_at, scores, imported: { level: a.mastery_level ?? null, flag: a.guess_tag ?? null } };
}

const ASSESSMENT_SELECT = 'id,created_at,mastery_level,guess_tag,writing_assessment_scores(score,rubric_criteria(code))';
type RosterRow = {
  class: string | null;
  class_number: number | null;
  full_name: string | null;
  student_emails?: unknown;
  writing_assessments?: RawAssessment[];
};
const emailsOf = (r: RosterRow) =>
  ([] as Array<{ email?: string }>).concat((r.student_emails as never) ?? []).map((e) => e?.email?.toLowerCase()).filter(Boolean) as string[];
const profileOf = (r: RosterRow): Profile => ({ name: str(r.full_name), klass: str(r.class), no: str(r.class_number) });

export function registerReadRoutes(app: Hono<{ Bindings: Env; Variables: { user: AuthUser } }>) {
  app.get('/v1/me', (c) => {
    const user = c.get('user');
    return c.json({ ok: true, id: user.id, email: user.email, role: roleOf(user, c.env) });
  });

  app.get('/v1/my/submissions', async (c) => {
    const user = c.get('user');
    const ex = safe(c.req.query('exercise_id'));
    const rows = await selectRows(
      c.env,
      'raw_submissions',
      `select=${SUMMARY}&user_id=eq.${encodeURIComponent(user.id)}${ex ? `&exercise_id=eq.${ex}` : ''}&order=created_at.desc&limit=${limitOf(c)}`,
    );
    return c.json({ ok: true, items: rows });
  });

  app.get('/v1/my/submissions/:id', async (c) => {
    const id = c.req.param('id');
    const out = UUID.test(id) ? await detail(c.env, id, c.get('user').id) : null;
    if (!out) return c.json({ ok: false, error: { code: 'not_found', message: 'No such submission.' } }, 404);
    return c.json({ ok: true, item: out });
  });

  app.get('/v1/teacher/submissions', async (c) => {
    requireTeacher(c);
    const ex = safe(c.req.query('exercise_id'));
    const who = safe(c.req.query('email'));
    const rows = await selectRows(
      c.env,
      'raw_submissions',
      `select=${SUMMARY}${ex ? `&exercise_id=eq.${ex}` : ''}${who ? `&user_email=eq.${who.toLowerCase()}` : ''}&order=created_at.desc&limit=${limitOf(c)}`,
    );
    return c.json({ ok: true, items: rows });
  });

  app.get('/v1/teacher/submissions/:id', async (c) => {
    requireTeacher(c);
    const id = c.req.param('id');
    const out = UUID.test(id) ? await detail(c.env, id) : null;
    if (!out) return c.json({ ok: false, error: { code: 'not_found', message: 'No such submission.' } }, 404);
    return c.json({ ok: true, item: out });
  });

  // All recognised scores, newest first, with who/when — the raw material for per-class reports.
  app.get('/v1/teacher/scores', async (c) => {
    requireTeacher(c);
    const ex = safe(c.req.query('exercise_id'));
    const rows = await selectRows(
      c.env,
      'part_scores',
      `select=part_key,path,criterion,score,raw_submissions!inner(id,user_email,exercise_id,created_at)${ex ? `&raw_submissions.exercise_id=eq.${ex}` : ''}&order=id.desc&limit=${limitOf(c, 2000, 5000)}`,
    );
    return c.json({ ok: true, items: rows });
  });

  // The signed-in student's own result from the real database. Matched by the token's email -> roster.
  app.get('/v1/my/assessment', async (c) => {
    const email = c.get('user').email.toLowerCase();
    const [link] = await selectRows<{ students?: RosterRow | RosterRow[] | null; student_id: string }>(
      c.env,
      'student_emails',
      `select=student_id,students(class,class_number,full_name)&email=eq.${encodeURIComponent(email)}&limit=1`,
    );
    if (!link) return c.json({ ok: true, in_roster: false, profile: null, assessment: null });
    const st = Array.isArray(link.students) ? link.students[0] : link.students;
    const [a] = await selectRows<RawAssessment>(
      c.env,
      'writing_assessments',
      `select=${ASSESSMENT_SELECT}&student_id=eq.${encodeURIComponent(link.student_id)}&order=created_at.desc&limit=1`,
    );
    return c.json({ ok: true, in_roster: true, profile: st ? profileOf(st) : null, assessment: toAssessment(a) });
  });

  // Teacher: every roster student with their latest assessment (real DB) and, SEPARATELY, whether they
  // have submitted the practice exercise (raw_submissions). The two never influence each other.
  app.get('/v1/teacher/students', async (c) => {
    requireTeacher(c);
    const ex = safe(c.req.query('exercise_id'));
    const [roster, subs] = await Promise.all([
      selectRows<RosterRow>(
        c.env,
        'students',
        `select=class,class_number,full_name,student_emails(email),writing_assessments(${ASSESSMENT_SELECT})&writing_assessments.order=created_at.desc&limit=1000`,
      ),
      selectRows<{ user_email: string; created_at: string }>(
        c.env,
        'raw_submissions',
        `select=user_email,created_at${ex ? `&exercise_id=eq.${ex}` : ''}&order=created_at.desc&limit=5000`,
      ),
    ]);
    const bySender = new Map<string, { count: number; last_at: string }>();
    for (const r of subs) {
      const k = r.user_email.toLowerCase();
      const cur = bySender.get(k);
      if (cur) cur.count++;
      else bySender.set(k, { count: 1, last_at: r.created_at }); // newest first
    }
    const items = roster.map((r) => {
      const emails = emailsOf(r);
      const hit = emails.map((e) => bySender.get(e)).find(Boolean);
      return {
        email: emails[0] ?? null,
        profile: profileOf(r),
        assessment: toAssessment(r.writing_assessments?.[0]),
        submission: { submitted: !!hit, count: hit?.count ?? 0, last_at: hit?.last_at ?? null },
      };
    });
    return c.json({ ok: true, items });
  });
}
