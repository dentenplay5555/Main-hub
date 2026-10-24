import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { AuthError, verifyUser, type AuthUser } from './auth.ts';
import { DbError, insertSubmission } from './db.ts';
import type { Env } from './env.ts';
import { normalizeSubmission } from './normalize.ts';

type AppEnv = { Bindings: Env; Variables: { user: AuthUser } };

const DEFAULT_MAX_BODY = 256 * 1024;

function errorBody(code: string, message: string) {
  return { ok: false, error: { code, message } };
}

function maxBytes(env: Env): number {
  const n = Number(env.MAX_BODY_BYTES);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_BODY;
}

/** Reads the body without ever buffering more than `limit` bytes. */
async function readBodyLimited(req: Request, limit: number): Promise<{ text: string; tooLarge: boolean }> {
  const declared = Number(req.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > limit) return { text: '', tooLarge: true };
  if (!req.body) return { text: '', tooLarge: false };

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel().catch(() => {});
      return { text: '', tooLarge: true };
    }
    chunks.push(value);
  }
  const all = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    all.set(c, offset);
    offset += c.byteLength;
  }
  return { text: new TextDecoder().decode(all), tooLarge: false };
}

const app = new Hono<AppEnv>();

app.use(
  '*',
  cors({
    origin: (origin, c) => {
      const allowed = String((c.env as Env).ALLOWED_ORIGINS ?? '')
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean);
      if (allowed.length === 0) return '*';
      return allowed.includes(origin) ? origin : null;
    },
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Authorization', 'Content-Type', 'Idempotency-Key'],
    maxAge: 86400,
  }),
);

app.get('/health', (c) => c.json({ ok: true, service: 'dentenplay-gateway' }));

// Strict part: identity. Everything under /v1 needs a valid Bearer token.
app.use('/v1/*', async (c, next) => {
  c.set('user', await verifyUser(c.req.header('Authorization'), c.env));
  await next();
});

// Lenient part: the body. Any shape, any content-type — it is stored, never rejected for its shape.
app.post('/v1/submissions', async (c) => {
  const user = c.get('user');

  const body = await readBodyLimited(c.req.raw, maxBytes(c.env));
  if (body.tooLarge) {
    return c.json(errorBody('payload_too_large', `Body is larger than ${maxBytes(c.env)} bytes.`), 413);
  }

  const warnings: string[] = [];
  let payload: unknown;
  if (body.text.trim() === '') {
    payload = null;
    warnings.push('empty_body');
  } else {
    try {
      payload = JSON.parse(body.text);
    } catch {
      payload = { text: body.text };
      warnings.push('body_not_json');
    }
  }

  const n = normalizeSubmission(payload);
  const idemRaw = c.req.header('Idempotency-Key')?.trim().slice(0, 128);

  const result = await insertSubmission(c.env, {
    user_id: user.id,
    user_email: user.email,
    exercise_id: n.exerciseId,
    part: n.part,
    cycle: n.cycle,
    score: n.score,
    max_score: n.maxScore,
    answers: n.answers,
    raw: { body: payload },
    warnings: [...warnings, ...n.warnings],
    client_ts: n.clientTs,
    idempotency_key: idemRaw || null,
    user_agent: c.req.header('User-Agent')?.slice(0, 256) ?? null,
  });

  return c.json(
    { ok: true, id: result.id, duplicate: result.duplicate, warnings: [...warnings, ...n.warnings] },
    result.duplicate ? 200 : 201,
  );
});

app.notFound((c) => c.json(errorBody('not_found', 'No such route.'), 404));

// Whatever goes wrong, the caller gets JSON — never an HTML error page or a stack trace.
app.onError((err, c) => {
  if (err instanceof AuthError) return c.json(errorBody(err.code, err.message), err.status as ContentfulStatusCode);
  if (err instanceof DbError) return c.json(errorBody('db_unavailable', 'Could not save right now. Please retry.'), 502);
  if (err instanceof HTTPException) return c.json(errorBody('http_error', err.message), err.status);
  console.error('unhandled', err);
  return c.json(errorBody('internal_error', 'Something went wrong on our side.'), 500);
});

export default app;
