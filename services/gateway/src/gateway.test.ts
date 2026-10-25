import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { SignJWT } from 'jose';
import app from './index.ts';
import type { Env } from './env.ts';

const SECRET = 'test-secret-test-secret-test-secret-123456';
const SUPABASE_URL = 'https://proj.supabase.co';
const ENV: Env = {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: 'service-key',
  SUPABASE_JWT_SECRET: SECRET,
  ALLOWED_EMAIL_DOMAINS: 'student.nssc.ac.th,nssc.ac.th',
  MAX_BODY_BYTES: '2048',
};
const USER_ID = '11111111-2222-4333-8444-555555555555';

async function token(over: { email?: string; secret?: string; aud?: string; expired?: boolean } = {}) {
  const jwt = new SignJWT({ email: over.email ?? 'a.student@student.nssc.ac.th' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(USER_ID)
    .setIssuer(`${SUPABASE_URL}/auth/v1`)
    .setAudience(over.aud ?? 'authenticated')
    .setIssuedAt();
  jwt.setExpirationTime(over.expired ? Math.floor(Date.now() / 1000) - 60 : '1h');
  return jwt.sign(new TextEncoder().encode(over.secret ?? SECRET));
}

let calls: Array<{ url: string; init?: RequestInit }> = [];
let dbMode: 'ok' | 'duplicate' | 'down' | 'error500' = 'ok';
const realFetch = globalThis.fetch;

beforeEach(() => {
  calls = [];
  dbMode = 'ok';
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url);
    calls.push({ url: u, init });
    if (dbMode === 'down') throw new TypeError('network down');
    if (dbMode === 'error500') return new Response('boom', { status: 500 });
    if (init?.method === 'POST') {
      return Response.json(dbMode === 'duplicate' ? { id: 'original-id', duplicate: true } : { id: 'new-id', duplicate: false });
    }
    return Response.json({});
  }) as typeof fetch;
});

async function post(body: BodyInit | null, headers: Record<string, string> = {}, auth: string | null = 'ok') {
  const h: Record<string, string> = { ...headers };
  if (auth === 'ok') h.Authorization = `Bearer ${await token()}`;
  else if (auth) h.Authorization = auth;
  return app.request('/v1/submissions', { method: 'POST', body, headers: h }, ENV);
}

test('health needs no auth', async () => {
  const res = await app.request('/health', {}, ENV);
  assert.equal(res.status, 200);
});

test('missing Authorization -> 401 JSON', async () => {
  const res = await post('{}', {}, null);
  assert.equal(res.status, 401);
  assert.equal((await res.json() as any).error.code, 'missing_token');
  assert.equal(calls.length, 0);
});

test('malformed Authorization -> 401', async () => {
  const res = await post('{}', {}, 'Token abc');
  assert.equal(res.status, 401);
  assert.equal((await res.json() as any).error.code, 'malformed_authorization');
});

test('bad signature / wrong audience / expired -> 401', async () => {
  for (const t of [
    await token({ secret: 'another-secret-another-secret-another-secret' }),
    await token({ aud: 'anon' }),
    await token({ expired: true }),
  ]) {
    const res = await post('{}', {}, `Bearer ${t}`);
    assert.equal(res.status, 401);
    assert.equal((await res.json() as any).error.code, 'invalid_token');
  }
});

test('email outside school domain -> 403', async () => {
  const res = await post('{}', {}, `Bearer ${await token({ email: 'someone@gmail.com' })}`);
  assert.equal(res.status, 403);
  assert.equal((await res.json() as any).error.code, 'domain_not_allowed');
});

test('well-formed submission is stored with typed columns', async () => {
  const res = await post(JSON.stringify({ exerciseId: 'ex1', score: '8', answers: { q1: 'b' } }), {
    'Content-Type': 'application/json',
  });
  assert.equal(res.status, 201);
  const out = (await res.json()) as any;
  assert.equal(out.ok, true);
  assert.equal(out.id, 'new-id');
  assert.ok(calls[0].url.endsWith('/rest/v1/rpc/ingest_submission'));
  const sent = JSON.parse(String(calls[0].init?.body)).p;
  assert.equal(sent.user_id, USER_ID);
  assert.equal(sent.exercise_id, 'ex1');
  assert.equal(sent.score, 8);
  assert.equal((calls[0].init?.headers as Record<string, string>).apikey, 'service-key');
});

test('not-JSON body, wrong content-type: still accepted, kept as text', async () => {
  const res = await post('hello {{ not json', { 'Content-Type': 'text/plain' });
  assert.equal(res.status, 201);
  const out = (await res.json()) as any;
  assert.ok(out.warnings.includes('body_not_json'));
  assert.deepEqual(JSON.parse(String(calls[0].init?.body)).p.raw.body, { text: 'hello {{ not json' });
});

test('weird shapes never error', async () => {
  for (const b of ['', 'null', '42', '[]', '[1,2,3]', '"str"', '{"a":{"b":{"c":[1,{"d":null}]}}}', '{"score":"abc"}']) {
    const res = await post(b);
    assert.equal(res.status, 201, `body ${b}`);
  }
});

const SAMPLE = {
  sheet: 'Submissions',
  info: { fname: 'Sample', lname: 'Student', klass: 'ม.3/1', no: '15', email: 'someone.else@student.nssc.ac.th', state: 'Beginner' },
  outline: { out_T: 'x', out_C: 'y' },
  drafts: {
    d1: { text: 'a b c', feedback: 'f', TR: 5, CC: 4, LR: 3, GRA: 2, ME: 1 },
    d2: { text: 'q', TR: '4', fbTotal: 2 },
  },
  journey: {},
  mission: {},
  part1Scores: {},
  part1Final: { pct: 0, avatar: '' },
  submittedAt: '2026-09-11T14:20:05.379Z',
};

test('multi-part exercise: every part stored, identity comes from the token, not the body', async () => {
  const res = await post(JSON.stringify(SAMPLE), { 'Content-Type': 'text/plain;charset=utf-8' });
  assert.equal(res.status, 201);
  const sent = JSON.parse(String(calls[0].init?.body)).p;
  assert.equal(sent.user_email, 'a.student@student.nssc.ac.th'); // not someone.else@... from the body
  const keys = sent.parts.map((x: any) => x.key).sort();
  assert.deepEqual(keys, ['_meta', 'drafts', 'info', 'journey', 'mission', 'outline', 'part1Final', 'part1Scores']);
  const empty = sent.parts.filter((x: any) => x.is_empty).map((x: any) => x.key).sort();
  assert.deepEqual(empty, ['journey', 'mission', 'part1Scores']);
  const d1tr = sent.scores.find((x: any) => x.part_key === 'drafts' && x.path === 'd1' && x.criterion === 'TR');
  assert.equal(d1tr.score, 5);
  assert.equal(sent.scores.find((x: any) => x.path === 'd2' && x.criterion === 'TR').score, 4); // "4" -> 4
  assert.equal(sent.client_ts, '2026-09-11T14:20:05.379Z');
});

test('exercise id from the URL (path or query) is stored and beats the body', async () => {
  const mk = async (path: string, body: string) =>
    app.request(path, { method: 'POST', body, headers: { Authorization: `Bearer ${await token()}` } }, ENV);
  let res = await mk('/v1/submissions/writing-1', JSON.stringify({ drafts: {} }));
  assert.equal(res.status, 201);
  let sent = JSON.parse(String(calls[calls.length - 1].init?.body)).p;
  assert.equal(sent.exercise_id, 'writing-1');
  assert.ok(!sent.warnings.includes('missing_exercise_id'));
  res = await mk('/v1/submissions?exercise=writing-2', JSON.stringify({ exerciseId: 'from-body' }));
  sent = JSON.parse(String(calls[calls.length - 1].init?.body)).p;
  assert.equal(sent.exercise_id, 'writing-2');
  res = await mk('/v1/submissions', JSON.stringify({ drafts: {} }));
  sent = JSON.parse(String(calls[calls.length - 1].init?.body)).p;
  assert.equal(sent.exercise_id, null);
  assert.ok(sent.warnings.includes('missing_exercise_id'));
});

test('oversized body -> 413 JSON, nothing stored', async () => {
  const res = await post('x'.repeat(5000));
  assert.equal(res.status, 413);
  assert.equal((await res.json() as any).error.code, 'payload_too_large');
  assert.equal(calls.length, 0);
});

test('duplicate Idempotency-Key returns the original id', async () => {
  dbMode = 'duplicate';
  const res = await post('{"exerciseId":"ex1"}', { 'Idempotency-Key': 'abc-123' });
  assert.equal(res.status, 200);
  const out = (await res.json()) as any;
  assert.equal(out.duplicate, true);
  assert.equal(out.id, 'original-id');
});

test('database down / failing -> 502 JSON', async () => {
  for (const mode of ['down', 'error500'] as const) {
    dbMode = mode;
    const res = await post('{}');
    assert.equal(res.status, 502);
    assert.equal((await res.json() as any).error.code, 'db_unavailable');
  }
});

test('CORS preflight works without auth', async () => {
  const res = await app.request(
    '/v1/submissions',
    { method: 'OPTIONS', headers: { Origin: 'https://example.com', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization,content-type' } },
    ENV,
  );
  assert.equal(res.status, 204);
  assert.ok(res.headers.get('access-control-allow-headers')?.toLowerCase().includes('authorization'));
});

test('unknown route -> JSON 404', async () => {
  const res = await app.request('/nope', {}, ENV);
  assert.equal(res.status, 404);
  assert.equal((await res.json() as any).error.code, 'not_found');
});

test.after(() => {
  globalThis.fetch = realFetch;
});
