import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getSessionSecret,
  resolveRole,
  allowedClasses,
  parseTeacherClasses,
  safeEqual,
  isUuid
} from './access.ts';
import { signSession, verifySession, parseCookies } from './auth.ts';

const SECRET = 'x'.repeat(40);
const ENV = {
  DEV_EMAILS: 'Admin@nssc.ac.th',
  TEACHER_EMAILS: 'teacher1@nssc.ac.th, teacher2@nssc.ac.th'
};
const ALL = ['ม.3/1', 'ม.3/2', 'ม.3/3'];

test('secret: missing or short secret is rejected (fail closed)', () => {
  assert.equal(getSessionSecret({}), null);
  assert.equal(getSessionSecret({ SESSION_SECRET: 'short' }), null);
  assert.equal(getSessionSecret({ SESSION_SECRET: SECRET }), SECRET);
});

test('role: explicit lists only, no substring guessing, no defaults', () => {
  assert.equal(resolveRole('admin@nssc.ac.th', ENV), 'dev');
  assert.equal(resolveRole('teacher1@nssc.ac.th', ENV), 'teacher');
  assert.equal(resolveRole('52335.benten@student.nssc.ac.th', ENV), 'student');
  // looks like a teacher/dev but is not listed
  assert.equal(resolveRole('teacher@student.nssc.ac.th', ENV), 'student');
  assert.equal(resolveRole('dev@student.nssc.ac.th', ENV), 'student');
  // unlisted staff domain => not allowed
  assert.equal(resolveRole('someone@nssc.ac.th', ENV), null);
  // outside domains and look-alikes
  assert.equal(resolveRole('admin@gmail.com', ENV), null);
  assert.equal(resolveRole('admin@evil-nssc.ac.th', ENV), null);
  assert.equal(resolveRole('admin@nssc.ac.th.evil.com', ENV), null);
  // no lists configured => nobody is staff
  assert.equal(resolveRole('admin@nssc.ac.th', {}), null);
});

test('classes: dev all, teacher by mapping, student none', () => {
  const dev = { email: 'admin@nssc.ac.th', role: 'dev' as const };
  const t = { email: 'teacher1@nssc.ac.th', role: 'teacher' as const };
  const s = { email: 'a@student.nssc.ac.th', role: 'student' as const };
  assert.deepEqual(allowedClasses(dev, ALL, ENV), ALL);
  assert.deepEqual(allowedClasses(s, ALL, ENV), []);
  // no mapping configured => whitelisted teachers see all
  assert.deepEqual(allowedClasses(t, ALL, ENV), ALL);
  // mapping configured
  const env2 = { ...ENV, TEACHER_CLASSES: JSON.stringify({ 'Teacher1@nssc.ac.th': ['ม.3/2', 'ม.3/9'] }) };
  assert.deepEqual(allowedClasses(t, ALL, env2), ['ม.3/2']);
  // teacher missing from a configured mapping => none
  assert.deepEqual(allowedClasses({ email: 'teacher2@nssc.ac.th', role: 'teacher' }, ALL, env2), []);
  // broken JSON => fail closed (nobody mapped)
  assert.deepEqual(allowedClasses(t, ALL, { ...ENV, TEACHER_CLASSES: '{oops' }), []);
  assert.equal(parseTeacherClasses(undefined), null);
});

test('session: valid, tampered, wrong secret, expired', async () => {
  const user = { id: 'u1', email: 'a@student.nssc.ac.th', name: 'A', role: 'student' as const };
  const tok = await signSession(user, SECRET);
  assert.equal((await verifySession(tok, SECRET))?.role, 'student');
  assert.equal(await verifySession(tok, 'y'.repeat(40)), null);

  // forge: swap payload role to dev but keep old signature
  const [h, p, sig] = tok.split('.');
  const payload = JSON.parse(Buffer.from(p.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
  payload.role = 'dev';
  const forgedP = Buffer.from(JSON.stringify(payload)).toString('base64url');
  assert.equal(await verifySession(`${h}.${forgedP}.${sig}`, SECRET), null);

  // the old unsigned format (base64 JSON) must not work
  const old = Buffer.from(JSON.stringify({ id: 'x', role: 'dev' })).toString('base64');
  assert.equal(await verifySession(old, SECRET), null);

  // expired
  const expired = await signSession(user, SECRET, -10);
  assert.equal(await verifySession(expired, SECRET), null);
});

test('cookies: values containing = and malformed escapes do not throw', () => {
  const c = parseCookies('a=b=c==; bad=%E0%A4%A; ok=1');
  assert.equal(c.a, 'b=c==');
  assert.equal(c.ok, '1');
  assert.equal(typeof c.bad, 'string');
});

test('helpers', () => {
  assert.equal(safeEqual('abc', 'abc'), true);
  assert.equal(safeEqual('abc', 'abd'), false);
  assert.equal(safeEqual('abc', 'abcd'), false);
  assert.equal(isUuid('3f2b8a52-8d0e-4c6e-9b1a-1c2d3e4f5a6b'), true);
  assert.equal(isUuid('1'), false);
  assert.equal(isUuid("1' or '1'='1"), false);
});
