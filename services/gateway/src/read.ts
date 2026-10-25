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

type PartRow = { part_key: string; data: unknown };
type Profile = { name: string | null; klass: string | null; no: string | null };
type RosterRow = { class: string | null; class_number: number | null; full_name: string | null; student_emails?: unknown };

const str = (v: unknown): string | null => (typeof v === 'string' || typeof v === 'number') && String(v).trim() ? String(v).trim().slice(0, 128) : null;
const field = (o: Record<string, unknown>, ...keys: string[]) => {
  for (const k of keys) {
    const v = str(o[k]);
    if (v) return v;
  }
  return null;
};

/** Name / class / number as the exercise web reported them (nested "info" part, or the flat "_meta" part). */
export function profileFrom(parts: PartRow[]): { name: string | null; klass: string | null; no: string | null } {
  const obj = (key: string) => {
    const d = parts.find((p) => p.part_key === key)?.data;
    return d && typeof d === 'object' && !Array.isArray(d) ? (d as Record<string, unknown>) : {};
  };
  const info = obj('info');
  const meta = obj('_meta');
  const first = field(info, 'fname', 'firstName');
  const last = field(info, 'lname', 'lastName');
  return {
    name: [first, last].filter(Boolean).join(' ') || field(info, 'name', 'Name') || field(meta, 'Name', 'name'),
    klass: field(info, 'klass', 'class', 'Class') ?? field(meta, 'Class', 'klass', 'class'),
    no: field(info, 'no', 'No') ?? field(meta, 'No', 'no'),
  };
}

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

  // One row per student: their newest submission with name/class/number and all scores, plus the roster
  // students who have not submitted. Name/class/number come from the roster (students + student_emails)
  // when the email matches, otherwise from what the exercise web reported.
  app.get('/v1/teacher/overview', async (c) => {
    requireTeacher(c);
    const ex = safe(c.req.query('exercise_id'));
    const [rows, rosterRows] = await Promise.all([
      selectRows<{
        id: string;
        user_email: string;
        exercise_id: string | null;
        created_at: string;
        submission_parts: PartRow[];
        part_scores: Array<{ part_key: string; path: string; criterion: string; score: number }>;
      }>(
        c.env,
        'raw_submissions',
        `select=id,user_email,exercise_id,created_at,submission_parts(part_key,data),part_scores(part_key,path,criterion,score)&submission_parts.part_key=in.(info,_meta)${ex ? `&exercise_id=eq.${ex}` : ''}&order=created_at.desc&limit=${limitOf(c, 1000, 2000)}`,
      ),
      selectRows<RosterRow>(c.env, 'students', 'select=class,class_number,full_name,student_emails(email)&limit=1000'),
    ]);

    const roster = new Map<string, Profile>(); // lower-cased email -> roster profile
    const everyone: Array<{ key: string; profile: Profile }> = [];
    for (const r of rosterRows) {
      const emails = ([] as Array<{ email?: string }>).concat((r.student_emails as never) ?? []);
      const profile: Profile = { name: str(r.full_name), klass: str(r.class), no: str(r.class_number) };
      const key = (emails[0]?.email ?? `${profile.klass}/${profile.no}`).toLowerCase();
      everyone.push({ key, profile });
      for (const e of emails) if (e?.email) roster.set(e.email.toLowerCase(), profile);
    }

    const seen = new Set<string>();
    const items = [];
    for (const r of rows) {
      const key = r.user_email.toLowerCase();
      if (seen.has(key)) continue; // newest first, so the first one wins
      seen.add(key);
      const reported = profileFrom(r.submission_parts ?? []);
      items.push({
        id: r.id,
        user_email: r.user_email,
        exercise_id: r.exercise_id,
        created_at: r.created_at,
        profile: roster.get(key) ?? reported,
        in_roster: roster.has(key),
        scores: r.part_scores ?? [],
      });
    }
    const missing = everyone.filter((e) => !seen.has(e.key)).map((e) => e.profile);
    return c.json({ ok: true, items, missing });
  });
}
