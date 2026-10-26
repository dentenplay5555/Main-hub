import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { SignJWT } from 'jose';
import app from './index.ts';
import { toAssessment } from './read.ts';
import type { Env } from './env.ts';

const SECRET = 'test-secret-test-secret-test-secret-123456';
const URL_ = 'https://proj.supabase.co';
const ENV: Env = {
  SUPABASE_URL: URL_,
  SUPABASE_SERVICE_ROLE_KEY: 'service-key',
  SUPABASE_JWT_SECRET: SECRET,
  ALLOWED_EMAIL_DOMAINS: 'student.nssc.ac.th,nssc.ac.th',
  TEACHER_EMAILS: 'Teacher@nssc.ac.th',
};
const STUDENT = '11111111-2222-4333-8444-555555555555';
const TEACHER = '99999999-2222-4333-8444-555555555555';
const SUB = 'aaaaaaaa-2222-4333-8444-555555555555';

async function token(email: string, sub: string) {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sub)
    .setIssuer(`${URL_}/auth/v1`)
    .setAudience('authenticated')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(SECRET));
}
const get = async (path: string, email: string, sub: string) =>
  app.request(path, { headers: { Authorization: `Bearer ${await token(email, sub)}` } }, ENV);

let urls: string[] = [];
const realFetch = globalThis.fetch;
beforeEach(() => {
  urls = [];
  globalThis.fetch = (async (u: string | URL | Request) => {
    const s = String(u);
    urls.push(s);
    if (s.includes('/raw_submissions?')) return Response.json([{ id: SUB, user_email: 'a.student@student.nssc.ac.th' }]);
    return Response.json([{ part_key: 'drafts' }]);
  }) as typeof fetch;
});

test('/v1/me reports role from TEACHER_EMAILS (case-insensitive)', async () => {
  const s = (await (await get('/v1/me', 'a.student@student.nssc.ac.th', STUDENT)).json()) as any;
  assert.equal(s.role, 'student');
  const t = (await (await get('/v1/me', 'teacher@nssc.ac.th', TEACHER)).json()) as any;
  assert.equal(t.role, 'teacher');
});

test('student list is always filtered to the token user, whatever the query says', async () => {
  const res = await get(`/v1/my/submissions?user_id=eq.${TEACHER}&exercise_id=ex1`, 'a.student@student.nssc.ac.th', STUDENT);
  assert.equal(res.status, 200);
  assert.ok(urls[0].includes(`user_id=eq.${STUDENT}`));
  assert.ok(!urls[0].includes(TEACHER));
});

test('student detail is scoped to the owner; bad ids are 404 without touching the DB', async () => {
  const ok = await get(`/v1/my/submissions/${SUB}`, 'a.student@student.nssc.ac.th', STUDENT);
  assert.equal(ok.status, 200);
  assert.ok(urls[0].includes(`id=eq.${SUB}`) && urls[0].includes(`user_id=eq.${STUDENT}`));
  urls = [];
  const bad = await get('/v1/my/submissions/not-a-uuid', 'a.student@student.nssc.ac.th', STUDENT);
  assert.equal(bad.status, 404);
  assert.equal(urls.length, 0);
});

test('teacher endpoints: 403 for students, nothing read', async () => {
  for (const p of ['/v1/teacher/submissions', `/v1/teacher/submissions/${SUB}`, '/v1/teacher/scores']) {
    const res = await get(p, 'a.student@student.nssc.ac.th', STUDENT);
    assert.equal(res.status, 403, p);
    assert.equal(((await res.json()) as any).error.code, 'forbidden');
  }
  assert.equal(urls.length, 0);
});

test('teacher can list, filter and open a submission with its parts', async () => {
  const list = await get('/v1/teacher/submissions?exercise_id=ex1&limit=5', 'teacher@nssc.ac.th', TEACHER);
  assert.equal(list.status, 200);
  assert.ok(urls[0].includes('exercise_id=eq.ex1') && urls[0].includes('limit=5'));
  const one = (await (await get(`/v1/teacher/submissions/${SUB}`, 'teacher@nssc.ac.th', TEACHER)).json()) as any;
  assert.equal(one.item.id, SUB);
  assert.ok(Array.isArray(one.item.parts) && Array.isArray(one.item.scores));
});

test('filter values cannot smuggle extra PostgREST filters', async () => {
  const res = await get('/v1/teacher/submissions?exercise_id=a%26user_id%3Dneq.0', 'teacher@nssc.ac.th', TEACHER);
  assert.equal(res.status, 200);
  assert.ok(!urls[0].includes('&user_id=neq'));
});

test('limit is clamped', async () => {
  await get('/v1/my/submissions?limit=999999', 'a.student@student.nssc.ac.th', STUDENT);
  assert.ok(urls[0].endsWith('limit=200'));
});

test('toAssessment maps criterion codes, tolerates object/array embeds and junk rows', () => {
  const a = toAssessment({
    id: 'a1', created_at: 't', mastery_level: 'Mastery', guess_tag: null,
    writing_assessment_scores: [
      { score: '4', rubric_criteria: { code: 'TR' } },
      { score: 3, rubric_criteria: [{ code: 'CC' }] },
      { score: 'x', rubric_criteria: { code: 'LR' } },
      { score: 2, rubric_criteria: null },
    ],
  })!;
  assert.deepEqual(a.scores, [{ criterion: 'TR', score: 4 }, { criterion: 'CC', score: 3 }]);
  assert.deepEqual(a.imported, { level: 'Mastery', flag: null });
  assert.equal(toAssessment(undefined), null);
});

test('/v1/my/assessment: matched by the token email; not in roster -> in_roster false, no read of scores', async () => {
  globalThis.fetch = (async (u: string | URL | Request) => {
    const s = String(u);
    urls.push(s);
    if (s.includes('/student_emails?')) return Response.json(s.includes('known%40') ? [{ student_id: 'st1', students: { class: 'ม.3/1', class_number: 4, full_name: 'ชื่อ จริง' } }] : []);
    return Response.json([{ id: 'w1', created_at: 't', mastery_level: 'Beginner', guess_tag: 'OK', writing_assessment_scores: [{ score: 2, rubric_criteria: { code: 'TR' } }] }]);
  }) as typeof fetch;
  const ok = (await (await get('/v1/my/assessment', 'Known@student.nssc.ac.th', STUDENT)).json()) as any;
  assert.equal(ok.in_roster, true);
  assert.deepEqual(ok.profile, { name: 'ชื่อ จริง', klass: 'ม.3/1', no: '4' });
  assert.equal(ok.assessment.scores[0].criterion, 'TR');
  assert.ok(urls.some((x) => x.includes('student_id=eq.st1')));
  urls = [];
  const no = (await (await get('/v1/my/assessment', 'other@student.nssc.ac.th', STUDENT)).json()) as any;
  assert.equal(no.in_roster, false);
  assert.equal(no.assessment, null);
  assert.ok(!urls.some((x) => x.includes('writing_assessments')));
});

test('/v1/teacher/students: 403 for students; assessments and submission status stay independent', async () => {
  assert.equal((await get('/v1/teacher/students', 'a.student@student.nssc.ac.th', STUDENT)).status, 403);
  globalThis.fetch = (async (u: string | URL | Request) => {
    const s = String(u);
    urls.push(s);
    if (s.includes('/rest/v1/students?')) {
      return Response.json([
        { class: 'ม.3/1', class_number: 1, full_name: 'ส่งแล้ว', student_emails: { email: 'S1@student.nssc.ac.th' }, writing_assessments: [{ id: 'w1', created_at: 't', mastery_level: 'Mastery', guess_tag: 'OK', writing_assessment_scores: [{ score: 5, rubric_criteria: { code: 'TR' } }] }] },
        { class: 'ม.3/1', class_number: 2, full_name: 'ยังไม่ส่ง', student_emails: [{ email: 's2@student.nssc.ac.th' }], writing_assessments: [{ id: 'w2', created_at: 't', mastery_level: 'Beginner', guess_tag: 'OK', writing_assessment_scores: [] }] },
        { class: 'ม.3/2', class_number: 3, full_name: 'ไม่มีผลประเมิน', student_emails: null, writing_assessments: [] },
      ]);
    }
    return Response.json([
      { user_email: 's1@student.nssc.ac.th', created_at: '2026-10-25' },
      { user_email: 'S1@student.nssc.ac.th', created_at: '2026-10-24' },
      { user_email: 'stranger@student.nssc.ac.th', created_at: '2026-10-23' },
    ]);
  }) as typeof fetch;
  const res = (await (await get('/v1/teacher/students?exercise_id=e', 'teacher@nssc.ac.th', TEACHER)).json()) as any;
  assert.equal(res.items.length, 3); // the roster is the list; strangers who submitted are not added
  const [a, b, c2] = res.items;
  assert.deepEqual(a.submission, { submitted: true, count: 2, last_at: '2026-10-25' });
  assert.equal(a.assessment.scores[0].score, 5);
  assert.equal(b.submission.submitted, false);
  assert.equal(b.assessment.id, 'w2'); // assessed even though not submitted
  assert.equal(c2.assessment, null);
  assert.equal(c2.submission.submitted, false);
  assert.ok(urls.some((x) => x.includes('exercise_id=eq.e')));
});

test.after(() => {
  globalThis.fetch = realFetch;
});
