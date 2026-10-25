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
}
