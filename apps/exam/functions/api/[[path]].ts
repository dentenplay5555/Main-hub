// Cloudflare Pages Functions - Hub API Router
// Server-side only. Principles:
//   * FAIL CLOSED: no secret / no OAuth config / no allow-list => refuse, never grant.
//   * NO FAKE DATA: anything not backed by the database returns 501/404/502, never invented values.
//   * Students can only read their own row; teachers only their allowed classes.
//   * Supabase service_role key is used on the server only.

import {
  deriveBinaryItemsFromRubric,
  countBinaryTotal,
  evaluateKnowledgeState,
  evaluateFlag,
  evaluateLevel,
  getKnowledgeStateTips,
  getSkillFeedback,
  evaluateBadges,
  type SkillScores,
  type BinaryItemMap
} from '../../server/cbkst';
import {
  signSession,
  verifySession,
  generateOAuthState,
  parseCookies,
  type UserSession
} from '../../server/auth';
import {
  getSessionSecret,
  resolveRole,
  allowedClasses,
  parseEmailList,
  parseTeacherClasses,
  safeEqual,
  isUuid,
  type AccessEnv
} from '../../server/access';
import type {
  KnowledgeStateType,
  FlagType,
  StudentResultPayload,
  TeacherReportPayload,
  TeacherSubmissionStatus,
  StudentExerciseItem
} from '../../src/types';

export interface Env extends AccessEnv {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  /** Optional: public URL of the pretest exercise site (shown as the "ทำต่อ" link). */
  EXERCISE_URL_PRETEST?: string;
}

const EXERCISE_ID = 'prism-fanboys-pretest';
const EXERCISE_NAME = 'PRISM · FANBOYS · Pretest';

// Columns we read from the view public.writing_assessment_final (never select *)
const FINAL_COLUMNS = [
  'assessment_id', 'student_id', 'class', 'class_number', 'full_name',
  'tr', 'me', 'lr', 'gra', 'cc', 'total_score',
  'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9',
  'binary_total', 'ks', 'flag', 'created_at'
].join(',');

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------
function jsonResponse(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers
    }
  });
}

function errorResponse(code: string, message: string, status = 400, headers: HeadersInit = {}): Response {
  return jsonResponse({ error: { code, message }, code, message }, status, headers);
}

function upstreamError(status: number): Response {
  console.error('Supabase query failed, status', status);
  return errorResponse('UPSTREAM_ERROR', 'ไม่สามารถอ่านข้อมูลจากฐานข้อมูลได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง', 502);
}

// ---------------------------------------------------------------------------
// Supabase (service_role, server side only)
// ---------------------------------------------------------------------------
type SbResult = { ok: true; rows: any[] } | { ok: false; status: number };

async function sb(env: Env, endpoint: string): Promise<SbResult> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return { ok: false, status: 500 };
  try {
    const res = await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${endpoint}`, {
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
      }
    });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, rows: (await res.json()) as any[] };
  } catch {
    return { ok: false, status: 502 };
  }
}

const eq = (v: string) => `eq.${encodeURIComponent(v)}`;

async function listClasses(env: Env): Promise<{ ok: true; classes: string[] } | { ok: false; status: number }> {
  const r = await sb(env, 'students?select=class');
  if (!r.ok) return r;
  const set = new Set<string>();
  for (const row of r.rows) if (row.class) set.add(String(row.class));
  const classes = [...set].sort((a, b) => (parseInt(a.replace(/\D+/g, ''), 10) || 0) - (parseInt(b.replace(/\D+/g, ''), 10) || 0) || a.localeCompare(b));
  return { ok: true, classes };
}

// ---------------------------------------------------------------------------
// Row normalisation (view columns: student_id, class, class_number, full_name, tr..cc, q1..q9, binary_total, ks, flag)
// ---------------------------------------------------------------------------
function truthy(v: unknown): boolean {
  return v === true || v === 1 || v === '1' || v === 't' || v === 'true';
}

function normalizeStudentRow(r: any) {
  const scores: SkillScores = {
    TR: Number(r.tr ?? 0),
    ME: Number(r.me ?? 0),
    LR: Number(r.lr ?? 0),
    GRA: Number(r.gra ?? 0),
    CC: Number(r.cc ?? 0)
  };
  const rubricTotal = Number((scores.TR + scores.ME + scores.LR + scores.GRA + scores.CC).toFixed(1));

  let binary: BinaryItemMap;
  if (r.q1 !== undefined && r.q1 !== null && r.q9 !== undefined && r.q9 !== null) {
    binary = {
      q1: truthy(r.q1), q2: truthy(r.q2), q3: truthy(r.q3),
      q4: truthy(r.q4), q5: truthy(r.q5), q6: truthy(r.q6),
      q7: truthy(r.q7), q8: truthy(r.q8), q9: truthy(r.q9)
    };
  } else {
    binary = deriveBinaryItemsFromRubric(scores);
  }

  const binaryTotal = r.binary_total !== undefined && r.binary_total !== null ? Number(r.binary_total) : countBinaryTotal(binary);

  const ks: KnowledgeStateType =
    r.ks && ['Mastery', 'Language Dev', 'Structure OK', 'Beginner'].includes(r.ks) ? r.ks : evaluateKnowledgeState(binaryTotal);
  const flag: FlagType = r.flag && ['OK', 'Lucky', 'Careless'].includes(r.flag) ? r.flag : evaluateFlag(binary);
  const level = evaluateLevel(binaryTotal);

  return {
    id: String(r.student_id),
    name: String(r.full_name ?? ''),
    class: String(r.class ?? ''),
    no: Number(r.class_number ?? 0),
    scores,
    rubricTotal,
    binary,
    binaryTotal,
    ks,
    flag,
    level,
    createdAt: r.created_at ? String(r.created_at) : null,
    tips: getKnowledgeStateTips(ks, flag),
    feedback: getSkillFeedback(scores),
    badges: evaluateBadges(scores, flag, level.n)
  };
}

type Norm = ReturnType<typeof normalizeStudentRow>;

function studentPayload(exId: string, norm: Norm): StudentResultPayload {
  return {
    exercise: { id: exId, name: EXERCISE_NAME },
    student: { name: norm.name, class: norm.class, no: norm.no },
    status: 'SUBMITTED',
    scores: norm.scores,
    rubricTotal: norm.rubricTotal,
    binary: norm.binary,
    binaryTotal: norm.binaryTotal,
    level: norm.level,
    ks: norm.ks,
    flag: norm.flag,
    badges: norm.badges,
    feedback: norm.feedback,
    tips: norm.tips,
    attempts: { used: 1, max: 1 }
  };
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
export const onRequest = async (context: {
  request: Request;
  env: Env;
  params?: any;
  waitUntil?: (promise: Promise<any>) => void;
  next?: () => Promise<Response>;
}): Promise<Response> => {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/?/, '').replace(/\/$/, '');
  const method = request.method;
  const isHttps = url.protocol === 'https:';
  const secureFlag = isHttps ? 'Secure; ' : '';
  const cookies = parseCookies(request.headers.get('Cookie'));

  // FAIL CLOSED: without a strong SESSION_SECRET nothing is served (no built-in default secret).
  const secret = getSessionSecret(env);
  if (!secret) {
    return errorResponse('CONFIG_ERROR', 'เซิร์ฟเวอร์ยังไม่ได้ตั้งค่า SESSION_SECRET (ต้องยาวอย่างน้อย 32 ตัวอักษร)', 500);
  }

  // -------------------------------------------------------------------------
  // Auth: start
  // -------------------------------------------------------------------------
  if (path === 'auth/google/start') {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      return errorResponse('CONFIG_ERROR', 'Google OAuth ยังไม่ได้ตั้งค่าบนเซิร์ฟเวอร์ (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)', 500);
    }
    const state = generateOAuthState();
    const redirectUri = `${url.origin}/api/auth/google/callback`;
    const googleAuthUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(env.GOOGLE_CLIENT_ID)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid%20email%20profile` +
      `&state=${encodeURIComponent(state)}&prompt=select_account`;
    return new Response(null, {
      status: 302,
      headers: {
        Location: googleAuthUrl,
        'Set-Cookie': `oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; ${secureFlag}Max-Age=300`,
        'Cache-Control': 'no-store'
      }
    });
  }

  // -------------------------------------------------------------------------
  // Auth: callback
  // -------------------------------------------------------------------------
  if (path === 'auth/google/callback') {
    const code = url.searchParams.get('code');
    const returnedState = url.searchParams.get('state');
    const expectedState = cookies['oauth_state'];
    const clearState = `oauth_state=; Path=/; HttpOnly; SameSite=Lax; ${secureFlag}Max-Age=0`;

    if (!returnedState || !expectedState || !safeEqual(returnedState, expectedState)) {
      return errorResponse('CSRF_ERROR', 'การยืนยัน state ป้องกัน CSRF ล้มเหลว กรุณาลองเข้าสู่ระบบใหม่อีกครั้ง', 400, { 'Set-Cookie': clearState });
    }
    if (!code) return errorResponse('AUTH_FAILED', 'ไม่พบรหัสยืนยัน (code) จาก Google', 400, { 'Set-Cookie': clearState });
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      return errorResponse('CONFIG_ERROR', 'Google OAuth ยังไม่ได้ตั้งค่าบนเซิร์ฟเวอร์', 500);
    }

    try {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: env.GOOGLE_CLIENT_ID,
          client_secret: env.GOOGLE_CLIENT_SECRET,
          redirect_uri: `${url.origin}/api/auth/google/callback`,
          grant_type: 'authorization_code'
        })
      });
      if (!tokenRes.ok) return errorResponse('AUTH_FAILED', 'ไม่สามารถแลกเปลี่ยนโทเคนกับ Google ได้', 401, { 'Set-Cookie': clearState });

      const tokenData = (await tokenRes.json()) as any;
      const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      if (!userRes.ok) return errorResponse('AUTH_FAILED', 'ไม่สามารถดึงข้อมูลโปรไฟล์จาก Google ได้', 401, { 'Set-Cookie': clearState });

      const profile = (await userRes.json()) as any;
      const email = String(profile.email || '').toLowerCase().trim();

      if (!(profile.verified_email === true || profile.email_verified === true)) {
        return errorResponse('UNVERIFIED_EMAIL', 'อีเมล Google ของคุณยังไม่ได้รับการยืนยันตัวตน', 403, { 'Set-Cookie': clearState });
      }

      // Role strictly from explicit allow-lists + school domains (no substring guessing, no defaults)
      const role = resolveRole(email, env);
      if (!role) {
        return errorResponse(
          'FORBIDDEN_ACCOUNT',
          'บัญชีนี้ไม่ได้รับอนุญาตให้เข้าใช้งาน ใช้อีเมลนักเรียน (@student.nssc.ac.th) หรือแจ้งผู้ดูแลระบบเพื่อเพิ่มสิทธิ์',
          403,
          { 'Set-Cookie': clearState }
        );
      }

      const sessionUser: Omit<UserSession, 'iat' | 'exp'> = {
        id: `usr-${String(profile.id || email)}`,
        name: String(profile.name || (role === 'student' ? 'นักเรียน' : 'ผู้ใช้งาน')),
        email,
        role
      };
      const token = await signSession(sessionUser, secret);
      const target = role === 'student' ? '/student' : role === 'teacher' ? '/teacher' : '/dev/exercises';

      const headers = new Headers({ Location: target, 'Cache-Control': 'no-store' });
      headers.append('Set-Cookie', `practice_hub_session=${token}; Path=/; HttpOnly; SameSite=Lax; ${secureFlag}Max-Age=604800`);
      headers.append('Set-Cookie', clearState);
      return new Response(null, { status: 302, headers });
    } catch (e) {
      console.error('OAuth callback error:', e);
      return errorResponse('AUTH_FAILED', 'เกิดข้อผิดพลาดในการยืนยันตัวตนกับ Google', 500, { 'Set-Cookie': clearState });
    }
  }

  // -------------------------------------------------------------------------
  // Auth: logout (POST only)
  // -------------------------------------------------------------------------
  if (path === 'auth/logout') {
    if (method !== 'POST') return errorResponse('METHOD_NOT_ALLOWED', 'ใช้ได้เฉพาะ POST', 405, { Allow: 'POST' });
    return jsonResponse({ ok: true }, 200, {
      'Set-Cookie': `practice_hub_session=; Path=/; HttpOnly; SameSite=Lax; ${secureFlag}Max-Age=0`
    });
  }

  // -------------------------------------------------------------------------
  // Session
  // -------------------------------------------------------------------------
  const rawSession = cookies['practice_hub_session'];
  const verified = rawSession ? await verifySession(rawSession, secret) : null;
  // Re-derive the role from the CURRENT allow-lists on every request, so removing someone from
  // DEV_EMAILS/TEACHER_EMAILS takes effect immediately (a signed cookie cannot keep old privileges).
  const liveRole = verified ? resolveRole(verified.email, env) : null;
  const currentUser: (UserSession & { role: 'student' | 'teacher' | 'dev' }) | null =
    verified && liveRole ? { ...verified, role: liveRole } : null;

  if (!currentUser) {
    return errorResponse('UNAUTHORIZED', 'กรุณาเข้าสู่ระบบก่อนใช้งาน', 401);
  }

  const isStaff = currentUser.role === 'teacher' || currentUser.role === 'dev';

  // Classes this user may read (computed from the DB + env, never stored in the cookie)
  let classesCache: string[] | null = null;
  const getAllowed = async (): Promise<{ ok: true; classes: string[] } | { ok: false; status: number }> => {
    if (classesCache) return { ok: true, classes: classesCache };
    const all = await listClasses(env);
    if (!all.ok) return all;
    classesCache = allowedClasses(currentUser, all.classes, env);
    return { ok: true, classes: classesCache };
  };

  if (path === 'me') {
    let classes: string[] = [];
    if (isStaff) {
      const a = await getAllowed();
      if (a.ok) classes = a.classes;
    }
    return jsonResponse({
      id: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      role: currentUser.role,
      classes
    });
  }

  // -------------------------------------------------------------------------
  // Student: exercises (only the pretest is backed by real data)
  // -------------------------------------------------------------------------
  if (path === 'student/exercises') {
    if (currentUser.role !== 'student') return errorResponse('FORBIDDEN', 'เฉพาะนักเรียนเท่านั้น', 403);

    const map = await sb(env, `student_emails?select=student_id&email=${eq(currentUser.email)}`);
    if (!map.ok) {
      return map.status === 404
        ? errorResponse('ROSTER_NOT_READY', 'ยังไม่ได้ตั้งค่าตารางจับคู่อีเมลนักเรียน กรุณาติดต่อผู้ดูแลระบบ', 503)
        : upstreamError(map.status);
    }
    const studentId: string | undefined = map.rows[0]?.student_id;
    if (!studentId || !isUuid(studentId)) {
      return errorResponse('NOT_FOUND', `ไม่พบข้อมูลนักเรียนสำหรับบัญชี ${currentUser.email} กรุณาติดต่อผู้ดูแลระบบ`, 404);
    }

    const rows = await sb(env, `writing_assessment_final?select=created_at&student_id=${eq(studentId)}&limit=1`);
    if (!rows.ok) return upstreamError(rows.status);
    const done = rows.rows.length > 0;

    const item: StudentExerciseItem = {
      id: EXERCISE_ID,
      name: EXERCISE_NAME,
      series: 'FANBOYS Series',
      phase: 'Pretest',
      status: done ? 'SUBMITTED' : 'TODO',
      dueAt: null,
      attemptsUsed: done ? 1 : 0,
      maxAttempts: 1,
      exerciseUrl: env.EXERCISE_URL_PRETEST || ''
    };
    return jsonResponse([item]);
  }

  // -------------------------------------------------------------------------
  // Student: own result only
  // -------------------------------------------------------------------------
  if (path.startsWith('student/results/')) {
    if (currentUser.role !== 'student') {
      return errorResponse('FORBIDDEN', 'หน้านี้สำหรับนักเรียน ครูให้ใช้ส่วน “ผลรายนักเรียน”', 403);
    }
    const exId = decodeURIComponent(path.split('/')[2] || '');
    if (exId !== EXERCISE_ID) return errorResponse('NOT_FOUND', 'ไม่พบแบบฝึกนี้', 404);

    const map = await sb(env, `student_emails?select=student_id&email=${eq(currentUser.email)}`);
    if (!map.ok) {
      return map.status === 404
        ? errorResponse('ROSTER_NOT_READY', 'ยังไม่ได้ตั้งค่าตารางจับคู่อีเมลนักเรียน กรุณาติดต่อผู้ดูแลระบบ', 503)
        : upstreamError(map.status);
    }
    const studentId: string | undefined = map.rows[0]?.student_id;
    if (!studentId || !isUuid(studentId)) {
      return errorResponse('NOT_FOUND', `ไม่พบข้อมูลนักเรียนสำหรับบัญชี ${currentUser.email} กรุณาติดต่อผู้ดูแลระบบ`, 404);
    }

    const rows = await sb(env, `writing_assessment_final?select=${FINAL_COLUMNS}&student_id=${eq(studentId)}&limit=1`);
    if (!rows.ok) return upstreamError(rows.status);
    if (rows.rows.length === 0) {
      return errorResponse('NOT_FOUND', 'ยังไม่มีผลการประเมินของคุณในระบบ (อาจยังไม่ได้ส่งงาน)', 404);
    }
    return jsonResponse(studentPayload(exId, normalizeStudentRow(rows.rows[0])));
  }

  // -------------------------------------------------------------------------
  // Teacher routes
  // -------------------------------------------------------------------------
  if (path === 'teacher/classes') {
    if (!isStaff) return errorResponse('FORBIDDEN', 'คุณไม่มีสิทธิ์เข้าถึงส่วนของครูผู้สอน', 403);
    const a = await getAllowed();
    if (!a.ok) return upstreamError(a.status);
    return jsonResponse(a.classes);
  }

  if (path.startsWith('teacher/report/') || path.startsWith('teacher/status/')) {
    if (!isStaff) return errorResponse('FORBIDDEN', 'เฉพาะครูผู้สอนเท่านั้น', 403);

    const parts = path.split('/');
    const kind = parts[1]; // report | status
    const exId = decodeURIComponent(parts[2] || '');
    const classId = decodeURIComponent(parts[3] || '');
    if (exId !== EXERCISE_ID) return errorResponse('NOT_FOUND', 'ไม่พบแบบฝึกนี้', 404);

    const a = await getAllowed();
    if (!a.ok) return upstreamError(a.status);
    if (!a.classes.includes(classId)) {
      return errorResponse('FORBIDDEN', `คุณไม่มีสิทธิ์เข้าถึงข้อมูลของห้อง ${classId}`, 403);
    }

    // Roster of the class (real total) + assessments of the class
    const rosterRes = await sb(env, `students?select=id,class_number,full_name&class=${eq(classId)}&order=class_number.asc`);
    if (!rosterRes.ok) return upstreamError(rosterRes.status);
    const finalRes = await sb(env, `writing_assessment_final?select=${FINAL_COLUMNS}&class=${eq(classId)}&order=class_number.asc`);
    if (!finalRes.ok) return upstreamError(finalRes.status);

    const evaluatedList = finalRes.rows.map(r => normalizeStudentRow(r));
    const submittedIds = new Set(evaluatedList.map(s => s.id));
    const pending = rosterRes.rows
      .filter(s => !submittedIds.has(String(s.id)))
      .map(s => ({ no: Number(s.class_number), name: String(s.full_name ?? '') }));
    const totalStudents = rosterRes.rows.length;

    // --- status list -------------------------------------------------------
    if (kind === 'status') {
      const byId = new Map(evaluatedList.map(s => [s.id, s]));
      const statusList: TeacherSubmissionStatus[] = rosterRes.rows.map(s => {
        const ev = byId.get(String(s.id));
        return {
          userId: String(s.id),
          no: Number(s.class_number),
          name: String(s.full_name ?? ''),
          status: ev ? 'SUBMITTED' : 'TODO',
          partsCompleted: ev ? 1 : 0,
          totalParts: 1,
          lastActivityAt: ev?.createdAt ?? null
        };
      });
      return jsonResponse(statusList);
    }

    // --- report ------------------------------------------------------------
    const submittedCount = evaluatedList.length;
    if (submittedCount === 0) {
      return errorResponse('NOT_FOUND', `ห้อง ${classId} ยังไม่มีนักเรียนส่งงาน`, 404);
    }
    const notSubmitted = Math.max(0, totalStudents - submittedCount);
    const avg = (f: (s: Norm) => number) => Number((evaluatedList.reduce((acc, s) => acc + f(s), 0) / submittedCount).toFixed(1));
    const avgRubric = avg(s => s.rubricTotal);
    const avgTot = avg(s => s.binaryTotal);
    const luckyCount = evaluatedList.filter(s => s.flag === 'Lucky').length;
    const carelessCount = evaluatedList.filter(s => s.flag === 'Careless').length;

    const ksList: KnowledgeStateType[] = ['Mastery', 'Language Dev', 'Structure OK', 'Beginner'];
    const knowledgeStates = ksList.map(name => {
      const count = evaluatedList.filter(s => s.ks === name).length;
      return { name, count, pct: Math.round((count / submittedCount) * 100) };
    });

    const skillCodes: Array<{ code: keyof SkillScores; name: string }> = [
      { code: 'TR', name: 'Task Response' },
      { code: 'ME', name: 'Mechanics' },
      { code: 'LR', name: 'Lexical Resource' },
      { code: 'GRA', name: 'Grammar & Accuracy' },
      { code: 'CC', name: 'Coherence & Cohesion' }
    ];
    const skills = skillCodes.map(({ code, name }) => {
      const total = evaluatedList.reduce((acc, s) => acc + s.scores[code], 0);
      const passed = evaluatedList.filter(s => s.scores[code] >= 3).length;
      return { code, name, avg: Number((total / submittedCount).toFixed(2)), passPct: Math.round((passed / submittedCount) * 100) };
    });

    const itemDifficulty = Array.from({ length: 9 }, (_, idx) => {
      const qKey = `q${idx + 1}`;
      const passPct = Math.round((evaluatedList.filter(s => s.binary[qKey]).length / submittedCount) * 100);
      const tag: 'ง่าย' | 'ปานกลาง' | 'ยาก' = passPct > 70 ? 'ง่าย' : passPct >= 40 ? 'ปานกลาง' : 'ยาก';
      return { id: qKey, passPct, tag };
    });

    const scoreDistribution = [
      { range: '0-5', count: evaluatedList.filter(s => s.rubricTotal <= 5).length },
      { range: '6-10', count: evaluatedList.filter(s => s.rubricTotal > 5 && s.rubricTotal <= 10).length },
      { range: '11-15', count: evaluatedList.filter(s => s.rubricTotal > 10 && s.rubricTotal <= 15).length },
      { range: '16-20', count: evaluatedList.filter(s => s.rubricTotal > 15 && s.rubricTotal <= 20).length },
      { range: '21-25', count: evaluatedList.filter(s => s.rubricTotal > 20).length }
    ];

    const insights: Array<{ level: 'red' | 'amber' | 'green'; text: string }> = [];
    if (carelessCount >= 5) {
      insights.push({ level: 'amber', text: `พบนักเรียน ${carelessCount} คนที่มีสัญญาณ Careless (ผ่าน q1 แต่ไม่ผ่าน q2) แนะนำให้เน้นการตรวจทานรายละเอียด` });
    }
    if (luckyCount >= 3) {
      insights.push({ level: 'amber', text: `พบสัญญาณ Lucky ${luckyCount} คน (ผ่านการเชื่อมโยงแต่ไวยากรณ์พื้นฐานยังไม่แน่น) ควรเสริมพื้นฐาน FANBOYS เพิ่มเติม` });
    }
    if (notSubmitted > 0) {
      insights.push({ level: 'amber', text: `ยังไม่มีผลของนักเรียน ${notSubmitted} คน จากทั้งหมด ${totalStudents} คน` });
    }
    const lowestSkill = [...skills].sort((a, b) => a.avg - b.avg)[0];
    if (lowestSkill && lowestSkill.avg < 3) {
      insights.push({ level: 'red', text: `มิติที่ต้องพัฒนาเร่งด่วน: ${lowestSkill.name} (${lowestSkill.code}) คะแนนเฉลี่ย ${lowestSkill.avg}/5.0` });
    } else {
      insights.push({ level: 'green', text: `ภาพรวมห้องผ่านเกณฑ์ คะแนนเฉลี่ยรูบริก ${avgRubric}/25.0` });
    }

    const payload: TeacherReportPayload = {
      exercise: { id: exId, name: EXERCISE_NAME, manifestVersion: '1.0.0' },
      class: { name: classId, students: totalStudents },
      asOf: new Date().toISOString().replace('T', ' ').slice(0, 16),
      stats: { submitted: submittedCount, notSubmitted, avgTot, avgRubric, lucky: luckyCount, careless: carelessCount },
      knowledgeStates,
      skills,
      itemDifficulty,
      scoreDistribution,
      insights,
      students: evaluatedList.map(s => ({
        userId: s.id,
        no: s.no,
        name: s.name,
        scores: s.scores,
        tot: s.binaryTotal,
        rubricTotal: s.rubricTotal,
        ks: s.ks,
        flag: s.flag
      })),
      pending
    };
    return jsonResponse(payload);
  }

  if (path.startsWith('teacher/student/')) {
    if (!isStaff) return errorResponse('FORBIDDEN', 'เฉพาะครูผู้สอนเท่านั้น', 403);

    const parts = path.split('/');
    const exId = decodeURIComponent(parts[2] || '');
    const studentId = decodeURIComponent(parts[3] || '');
    if (exId !== EXERCISE_ID) return errorResponse('NOT_FOUND', 'ไม่พบแบบฝึกนี้', 404);
    if (!isUuid(studentId)) return errorResponse('BAD_REQUEST', 'รหัสนักเรียนไม่ถูกต้อง', 400);

    const rows = await sb(env, `writing_assessment_final?select=${FINAL_COLUMNS}&student_id=${eq(studentId)}&limit=1`);
    if (!rows.ok) return upstreamError(rows.status);
    if (rows.rows.length === 0) return errorResponse('NOT_FOUND', 'ไม่พบผลของนักเรียนคนนี้', 404);

    const norm = normalizeStudentRow(rows.rows[0]);
    const a = await getAllowed();
    if (!a.ok) return upstreamError(a.status);
    if (!a.classes.includes(norm.class)) {
      return errorResponse('FORBIDDEN', `คุณไม่มีสิทธิ์เข้าถึงข้อมูลของนักเรียนในห้อง ${norm.class}`, 403);
    }
    return jsonResponse(studentPayload(exId, norm));
  }

  // -------------------------------------------------------------------------
  // Dev routes: only what is real. Everything else answers 501 (no fake success).
  // -------------------------------------------------------------------------
  if (path.startsWith('dev/')) {
    if (currentUser.role !== 'dev') return errorResponse('FORBIDDEN', 'เฉพาะผู้ดูแลระบบ (Dev Admin) เท่านั้น', 403);

    if (path === 'dev/users' && method === 'GET') {
      const classMap = parseTeacherClasses(env.TEACHER_CLASSES);
      const devs = parseEmailList(env.DEV_EMAILS).map((email, i) => ({ id: `dev-${i + 1}`, email, name: email, role: 'dev', classes: [] as string[] }));
      const teachers = parseEmailList(env.TEACHER_EMAILS).map((email, i) => ({
        id: `teacher-${i + 1}`,
        email,
        name: email,
        role: 'teacher',
        classes: classMap ? classMap[email] || [] : []
      }));
      return jsonResponse([...devs, ...teachers]);
    }

    return errorResponse('NOT_IMPLEMENTED', 'ฟีเจอร์นี้ยังไม่เปิดใช้งาน (ยังไม่มีระบบ registry/sync ฝั่งเซิร์ฟเวอร์)', 501);
  }

  return errorResponse('NOT_FOUND', `ไม่พบ API endpoint: ${url.pathname}`, 404);
};
