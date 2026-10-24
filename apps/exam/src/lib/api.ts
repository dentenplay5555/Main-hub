// Hub API Client (design.md Section 5 & Rule 9)
// All communication goes through /api/* with credentials: 'include' (HttpOnly Cookie)
// Frontend DOES NOT calculate scores or touch database directly.

import type {
  UserMe,
  StudentExerciseItem,
  StudentResultPayload,
  TeacherReportPayload,
  TeacherSubmissionStatus,
  DevExerciseItem,
  DevUserItem
} from '../types';

export class ApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

// API origin. Empty = same origin (Cloudflare Pages). On GitHub Pages set VITE_API_BASE to the API's origin.
const API_BASE = ((import.meta.env.VITE_API_BASE as string | undefined) ?? '').replace(/\/$/, '');

// Helper to make API requests with error handling
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}/api${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });

    if (res.status === 401) {
      throw new ApiError('UNAUTHORIZED', 'กรุณาเข้าสู่ระบบก่อนดำเนินการ');
    }

    if (res.status === 403) {
      throw new ApiError('FORBIDDEN', 'คุณไม่มีสิทธิ์เข้าถึงส่วนนี้');
    }

    // A non-JSON 2xx means the API is not really there (e.g. the Vite dev server answering /api/* with
    // index.html). Treat it as "unreachable" instead of as an empty-but-valid response — otherwise
    // /me resolves to {} and the app thinks a role-less user is logged in (403 on every page).
    if (res.ok && res.status !== 204 && !(res.headers.get('content-type') ?? '').includes('json')) {
      throw new Error('API did not return JSON (is the Hub API running?)');
    }

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const code = typeof json.error === 'string'
        ? json.error
        : json.error?.code || json.code || 'ERROR';
      const message = json.message
        || json.error?.message
        || (typeof json.error === 'string' ? json.error : 'เกิดข้อผิดพลาดในการติดต่อระบบ');
      throw new ApiError(code, message);
    }

    return json as T;
  } catch (err: any) {
    if (err instanceof ApiError) throw err;

    // Only allow mock fallback if explicitly enabled in development (VITE_DEV_MOCK=true)
    const isExplicitDevMock = import.meta.env.DEV && import.meta.env.VITE_DEV_MOCK === 'true';
    if (isExplicitDevMock) {
      return getMockFallback<T>(path, options);
    }

    throw new ApiError('NETWORK_ERROR', err.message || 'ไม่สามารถติดต่อเซิร์ฟเวอร์ Hub API ได้');
  }
}

// 1. Auth API
export const authApi = {
  getMe: () => request<UserMe>('/me'),
  logout: () => request<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
  startGoogleUrl: `${API_BASE}/api/auth/google/start`
};

// 2. Student API
export const studentApi = {
  getExercises: () => request<StudentExerciseItem[]>('/student/exercises'),
  getResult: (exId: string) => request<StudentResultPayload>(`/student/results/${exId}`)
};

// 3. Teacher API
export const teacherApi = {
  getClasses: () => request<string[]>('/teacher/classes'),
  getReport: (exId: string, classId: string) => request<TeacherReportPayload>(`/teacher/report/${exId}/${encodeURIComponent(classId)}`),
  getStatus: (exId: string, classId: string) => request<TeacherSubmissionStatus[]>(`/teacher/status/${exId}/${encodeURIComponent(classId)}`),
  getStudentResult: (exId: string, userId: string) => request<StudentResultPayload>(`/teacher/student/${exId}/${userId}`),
  exportCsvUrl: (exId: string, classId: string) => `${API_BASE}/api/teacher/report/${exId}/${encodeURIComponent(classId)}/export.csv`
};

// 4. Dev API
export const devApi = {
  getExercises: () => request<DevExerciseItem[]>('/dev/exercises'),
  addExercise: (baseUrl: string) => request<{ ok: boolean; secret: string }>('/dev/exercises', {
    method: 'POST',
    body: JSON.stringify({ baseUrl })
  }),
  testExercise: (id: string) => request<{ ok: boolean; routes: Record<string, boolean> }>(`/dev/exercises/${id}/test`, { method: 'POST' }),
  syncExercise: (id: string) => request<{ ok: boolean; rows: number }>(`/dev/exercises/${id}/sync`, { method: 'POST' }),
  rotateSecret: (id: string) => request<{ ok: boolean; secret: string }>(`/dev/exercises/${id}/rotate-secret`, { method: 'POST' }),
  getLogs: (type: 'sync' | 'audit') => request<any[]>(`/dev/logs?type=${type}`),
  getUsers: () => request<DevUserItem[]>('/dev/users'),
  updateUserRole: (id: string, role: string) => request<{ ok: boolean }>(`/dev/users/${id}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role })
  }),
  updateAssignments: (data: { exerciseId: string; classIds: string[]; dueAt: string }) => request<{ ok: boolean }>('/dev/assignments', {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  updateTeacherClasses: (data: { teacherId: string; classIds: string[] }) => request<{ ok: boolean }>('/dev/teacher-classes', {
    method: 'PUT',
    body: JSON.stringify(data)
  })
};

// --- MOCK FALLBACK (Exact JSON schema from Section 5 for offline / preview) ---
function getMockFallback<T>(path: string, options: RequestInit): T {
  // Mock current user
  if (path === '/me') {
    const role = (localStorage.getItem('practice_hub_mock_role') as any) || 'student';
    return {
      id: 'usr-001',
      name: role === 'student' ? 'ด.ช. กฤษณะ วงศ์สวัสดิ์' : role === 'teacher' ? 'อาจารย์สมเกียรติ ยิ่งเจริญ' : 'Dev Admin',
      email: role === 'student' ? '52001.kritsana@student.nssc.ac.th' : 'teacher@nssc.ac.th',
      role,
      classes: ['ม.3/1', 'ม.3/2']
    } as T;
  }

  // Student exercises
  if (path === '/student/exercises') {
    return [
      {
        id: 'prism-fanboys-pretest',
        name: 'PRISM · FANBOYS · Pretest (วินิจฉัยพื้นฐาน)',
        status: 'SUBMITTED',
        dueAt: '2026-10-25T23:59:00Z',
        attemptsUsed: 1,
        maxAttempts: 1,
        exerciseUrl: 'https://prism-pretest.workers.dev',
        series: 'FANBOYS',
        phase: 'Pretest'
      },
      {
        id: 'prism-fanboys-c1',
        name: 'PRISM · FANBOYS · Cycle 1 (Coordinating Conjunctions)',
        status: 'IN_PROGRESS',
        dueAt: '2026-10-30T23:59:00Z',
        attemptsUsed: 0,
        maxAttempts: 2,
        exerciseUrl: 'https://prism-cycle1.workers.dev',
        series: 'FANBOYS',
        phase: 'Cycle 1'
      },
      {
        id: 'prism-fanboys-c2',
        name: 'PRISM · FANBOYS · Cycle 2 (Compound Sentence Mastery)',
        status: 'TODO',
        dueAt: '2026-11-05T23:59:00Z',
        attemptsUsed: 0,
        maxAttempts: 2,
        exerciseUrl: 'https://prism-cycle2.workers.dev',
        series: 'FANBOYS',
        phase: 'Cycle 2'
      },
      {
        id: 'prism-fanboys-post',
        name: 'PRISM · FANBOYS · Post-Test (แบบวัดผลปลายภาค)',
        status: 'TODO',
        dueAt: '2026-11-20T23:59:00Z',
        attemptsUsed: 0,
        maxAttempts: 1,
        exerciseUrl: 'https://prism-post.workers.dev',
        series: 'FANBOYS',
        phase: 'Post-test'
      }
    ] as T;
  }

  // Student result & Teacher view of student result: exact JSON structure provided in Section 5
  if (path.startsWith('/student/results/') || path.startsWith('/teacher/student/')) {
    const isTeacher = path.startsWith('/teacher/student/');
    return {
      exercise: { id: 'prism-fanboys-pretest', name: 'PRISM · FANBOYS · Pretest' },
      student: { name: isTeacher ? 'ด.ช. ณภัทร เจริญเกียรติ' : 'ด.ช. กฤษณะ วงศ์สวัสดิ์', class: 'ม.3/1', no: isTeacher ? 2 : 1 },
      status: 'SUBMITTED',
      scores: isTeacher ? { TR: 4, ME: 4, LR: 4, GRA: 4, CC: 4 } : { TR: 3, ME: 4, LR: 4, GRA: 3, CC: 3 },
      rubricTotal: isTeacher ? 20 : 17,
      binary: {
        q1: true,
        q2: true,
        q3: true,
        q4: true,
        q5: false,
        q6: true,
        q7: false,
        q8: true,
        q9: false
      },
      binaryTotal: 7,
      level: { n: 4, name: 'Precision Pioneer', xp: 84 },
      ks: 'Mastery',
      flag: 'OK',
      badges: [
        { id: 'first-draft', name: 'First Draft Hero', earned: true, desc: 'ส่งงานตรงเวลา' },
        { id: 'target-sniper', name: 'Target Sniper', earned: true, desc: 'TR ≥ 3 ตอบโจทย์แม่นยำ' },
        { id: 'bridge-builder', name: 'Bridge Builder', earned: true, desc: 'CC ≥ 3 เชื่อมโยงประโยคถูกต้อง' },
        { id: 'sharp-eye', name: 'Sharp Eye', earned: true, desc: 'ME ≥ 4 ไวยากรณ์และเครื่องหมายแม่นยำ' },
        { id: 'rocket-climber', name: 'Rocket Climber', earned: true, desc: 'พัฒนาคะแนนก้าวกระโดด' },
        { id: 'calm-mind', name: 'Calm Mind', earned: false, desc: 'รอข้อมูล (รอบถัดไป)' }
      ],
      feedback: {
        TR: 'ตอบตรงประเด็นโจทย์ได้ดีเยี่ยม มีใจความสำคัญครบถ้วนและลึกซึ้ง',
        ME: 'เครื่องหมายวรรคตอนและการสะกดคำถูกต้อง แม่นยำ',
        LR: 'เลือกใช้คำศัพท์สื่อความหมายได้หลากหลายและเป็นธรรมชาติ',
        GRA: 'โครงสร้างประโยค Compound และ Complex มีความแม่นยำสูง',
        CC: 'เชื่อมประโยค FANBOYS ได้สอดคล้องลื่นไหล ไร้ข้อต่อสะดุด'
      },
      tips: [
        'ลองเพิ่มการใช้ Subordinating Conjunctions ในการแต่งประโยคให้ซับซ้อนขึ้น',
        'รักษามาตรฐานความแม่นยำของ Punctuation'
      ],
      attempts: { used: 1, max: 2 }
    } as T;
  }

  // Teacher classes
  if (path === '/teacher/classes') {
    return ['ม.3/1', 'ม.3/2', 'ม.3/3', 'ม.3/4'] as T;
  }

  // Teacher report
  if (path.startsWith('/teacher/report/')) {
    return {
      exercise: { id: 'prism-fanboys-pretest', name: 'PRISM · FANBOYS · Pretest', manifestVersion: '1.2.0' },
      class: { name: 'ม.3/1', students: 36 },
      asOf: 'วันนี้ เวลา 14:20 น.',
      stats: {
        submitted: 32,
        notSubmitted: 4,
        avgTot: 5.8,
        avgRubric: 17.2,
        lucky: 2,
        careless: 4
      },
      knowledgeStates: [
        { name: 'Mastery', count: 12, pct: 33 },
        { name: 'Language Dev', count: 14, pct: 39 },
        { name: 'Structure OK', count: 6, pct: 17 },
        { name: 'Beginner', count: 4, pct: 11 }
      ],
      skills: [
        { code: 'TR', name: 'Task Response', passPct: 88, avg: 3.8 },
        { code: 'ME', name: 'Mechanics', passPct: 82, avg: 3.6 },
        { code: 'LR', name: 'Lexical Resource', passPct: 75, avg: 3.4 },
        { code: 'GRA', name: 'Grammar & Accuracy', passPct: 68, avg: 3.1 },
        { code: 'CC', name: 'Coherence & Cohesion', passPct: 80, avg: 3.5 }
      ],
      itemDifficulty: [
        { id: 'q1', passPct: 88, tag: 'ง่าย' },
        { id: 'q2', passPct: 62, tag: 'ปานกลาง' },
        { id: 'q3', passPct: 82, tag: 'ง่าย' },
        { id: 'q4', passPct: 75, tag: 'ง่าย' },
        { id: 'q5', passPct: 54, tag: 'ปานกลาง' },
        { id: 'q6', passPct: 68, tag: 'ปานกลาง' },
        { id: 'q7', passPct: 42, tag: 'ยาก' },
        { id: 'q8', passPct: 80, tag: 'ง่าย' },
        { id: 'q9', passPct: 48, tag: 'ยาก' }
      ],
      scoreDistribution: [
        { range: '0-5', count: 2 },
        { range: '6-10', count: 3 },
        { range: '11-15', count: 7 },
        { range: '16-20', count: 16 },
        { range: '21-25', count: 8 }
      ],
      insights: [
        { level: 'green', text: 'นักเรียนร้อยละ 88 ผ่านเกณฑ์การตอบตรงโจทย์ (TR ≥ 3)' },
        { level: 'amber', text: 'ข้อ q7 (GRA ≥ 4) มีอัตราผ่านเพียง 42% ควรเสริมโครงสร้าง Compound Sentences' },
        { level: 'red', text: 'พบสัญญาณ Careless 4 คนที่มีคะแนนรวมสูงแต่ตกเกณฑ์ย่อยพื้นฐาน' }
      ],
      students: [
        {
          userId: 'u1',
          no: 1,
          name: 'ด.ช. กฤษณะ วงศ์สวัสดิ์',
          scores: { TR: 5, ME: 5, LR: 5, GRA: 4, CC: 5 },
          tot: 9,
          rubricTotal: 24,
          ks: 'Mastery',
          flag: 'OK'
        },
        {
          userId: 'u2',
          no: 2,
          name: 'ด.ช. ณภัทร เจริญเกียรติ',
          scores: { TR: 4, ME: 4, LR: 4, GRA: 4, CC: 4 },
          tot: 8,
          rubricTotal: 20,
          ks: 'Mastery',
          flag: 'OK'
        },
        {
          userId: 'u3',
          no: 3,
          name: 'ด.ช. ธนดล พัฒนกิจ',
          scores: { TR: 4, ME: 2, LR: 4, GRA: 4, CC: 4 },
          tot: 7,
          rubricTotal: 18,
          ks: 'Language Dev',
          flag: 'Careless'
        },
        {
          userId: 'u4',
          no: 4,
          name: 'ด.ญ. ปรียาภรณ์ ศรีสุวรรณ',
          scores: { TR: 4, ME: 3, LR: 3, GRA: 3, CC: 4 },
          tot: 6,
          rubricTotal: 17,
          ks: 'Structure OK',
          flag: 'OK'
        },
        {
          userId: 'u5',
          no: 5,
          name: 'ด.ช. พงศกร มิ่งขวัญ',
          scores: { TR: 2, ME: 3, LR: 2, GRA: 2, CC: 3 },
          tot: 5,
          rubricTotal: 12,
          ks: 'Beginner',
          flag: 'Lucky'
        }
      ],
      pending: [
        { no: 9, name: 'ด.ช. อิทธิพัทธ์ บวรเกียรติ' },
        { no: 10, name: 'ด.ญ. อมรรัตน์ สินชัย' }
      ]
    } as T;
  }

  // Teacher status
  if (path.startsWith('/teacher/status/')) {
    return [
      { userId: 'u1', no: 1, name: 'ด.ช. กฤษณะ วงศ์สวัสดิ์', status: 'SUBMITTED', partsCompleted: 3, totalParts: 3, lastActivityAt: '2026-10-20 10:15' },
      { userId: 'u2', no: 2, name: 'ด.ช. ณภัทร เจริญเกียรติ', status: 'SUBMITTED', partsCompleted: 3, totalParts: 3, lastActivityAt: '2026-10-20 11:20' },
      { userId: 'u3', no: 3, name: 'ด.ช. ธนดล พัฒนกิจ', status: 'SUBMITTED', partsCompleted: 3, totalParts: 3, lastActivityAt: '2026-10-19 14:30' },
      { userId: 'u9', no: 9, name: 'ด.ช. อิทธิพัทธ์ บวรเกียรติ', status: 'IN_PROGRESS', partsCompleted: 1, totalParts: 3, lastActivityAt: '2026-10-20 12:05' },
      { userId: 'u10', no: 10, name: 'ด.ญ. อมรรัตน์ สินชัย', status: 'TODO', partsCompleted: 0, totalParts: 3, lastActivityAt: '-' }
    ] as T;
  }

  // Dev exercises
  if (path === '/dev/exercises') {
    return [
      {
        id: 'prism-fanboys-pretest',
        name: 'PRISM · FANBOYS · Pretest',
        baseUrl: 'https://prism-pretest.workers.dev',
        health: 'healthy',
        manifestVersion: '1.2.0',
        enabled: true,
        lastSyncAt: '5 นาทีที่แล้ว',
        lastError: null,
        rosterSource: true
      },
      {
        id: 'prism-fanboys-c1',
        name: 'PRISM · FANBOYS · Cycle 1',
        baseUrl: 'https://prism-cycle1.workers.dev',
        health: 'healthy',
        manifestVersion: '1.2.0',
        enabled: true,
        lastSyncAt: '12 นาทีที่แล้ว',
        lastError: null,
        rosterSource: false
      }
    ] as T;
  }

  // Dev logs
  if (path.startsWith('/dev/logs')) {
    return [
      { id: 'sync-1', exerciseId: 'prism-fanboys-pretest', at: '2026-10-20 14:20:04', ok: true, rows: 144, ms: 380 },
      { id: 'sync-2', exerciseId: 'prism-fanboys-c1', at: '2026-10-20 14:10:00', ok: true, rows: 98, ms: 290 }
    ] as T;
  }

  // Dev users
  if (path === '/dev/users') {
    return [
      { id: 'u1', name: 'อาจารย์สมเกียรติ ยิ่งเจริญ', email: 'somkiat@nssc.ac.th', role: 'teacher', classes: ['ม.3/1', 'ม.3/2'] },
      { id: 'u2', name: 'Admin ผู้ดูแลระบบ', email: 'admin@nssc.ac.th', role: 'dev', classes: [] }
    ] as T;
  }

  return {} as T;
}
