# Practice Hub — เอกสารออกแบบ Full Stack

ระบบรวมสถานะและผลของแบบฝึกหลายเว็บไว้ที่เดียว แต่ละแบบฝึกเป็นเว็บแยก ลงทะเบียนด้วย Cloudflare URL แล้ว hub ดึงข้อมูลมาแสดงเอง มี 3 หน้า: นักเรียน / ครู / dev

เวอร์ชัน: 1.0 (ร่างแรก) · วันที่: 2026-10-20

---

## สารบัญ

1. เป้าหมายและขอบเขต
2. สิ่งที่เรียนรู้จากระบบเดิม (PRISM)
3. สถาปัตยกรรมภาพรวม
4. Tech stack และเหตุผล
5. โครงสร้าง Monorepo
6. Contract ระหว่าง Hub กับแบบฝึก
7. Manifest schema (ส่วนที่ทำให้ระบบ generic)
8. Rule engine
9. ฐานข้อมูล Hub (D1)
10. Sync
11. Auth, Role, ความปลอดภัย
12. Hub API
13. Frontend: หน้าและ UX
14. Adapter ของ PRISM (แมปจากระบบเดิม)
15. แผน Refactor ทีละขั้น
16. การทดสอบ
17. Deploy และ Environment
18. Observability และการดูแลระบบ
19. ความเสี่ยงและข้อสมมติ
20. คำถามที่ยังเปิดอยู่

---

## 1. เป้าหมายและขอบเขต

**เป้าหมาย**

- รวมสถานะ/ผลแบบฝึกหลายชุดไว้ที่ hub เดียว
- เพิ่มแบบฝึกใหม่โดยวาง Cloudflare URL แล้ว hub fetch ได้เลย ไม่ต้องแก้โค้ด hub
- มีหน้า นักเรียน, ครู, dev
- รายงานครูมีฟีเจอร์เทียบเท่ารายงาน PRISM ต่อห้อง (Knowledge State, 5 สมรรถนะ, ความยากรายข้อ, การกระจายคะแนน, Lucky/Careless, รายชื่อ)
- Refactor จากระบบเดิม: ปลอดภัยขึ้น, backend นิ่ง, GUI ใช้ง่าย

**ขนาดการใช้งาน (จากที่วางไว้)**: นักเรียน ~300–450 คน, admin 2 คน (ผู้สร้างระบบ + ครู)

**อยู่ในขอบเขต**: registry ของแบบฝึก, sync, รายงาน, login Google, role, หน้า 3 role

**นอกขอบเขต (เวอร์ชันแรก)**: การทำแบบฝึกเอง (อยู่ในเว็บแบบฝึกแต่ละอัน), การตรวจคะแนน (ทำที่แบบฝึก), การแจ้งเตือนอีเมล/LINE, แอปมือถือเนทีฟ

**หลักการ**

1. คะแนนมาจากเว็บแบบฝึก (signed) เท่านั้น เบราว์เซอร์ส่งคะแนนมาที่ hub ไม่ได้
2. Hub ไม่รู้ DB ภายในของแบบฝึก รู้แค่ contract
3. นักเรียนได้ข้อมูลตัวเอง 1 แถวผ่าน API ที่ตรวจตัวตน ไม่ฝังข้อมูลทุกคนในหน้า
4. ทำทีละขั้น ระบบเดิมใช้งานต่อได้ระหว่าง refactor

---

## 2. สิ่งที่เรียนรู้จากระบบเดิม (PRISM)

ข้อมูลนี้มาจากการอ่านซอร์สหน้านักเรียน (Google Apps Script web app) และภาพ schema Supabase ที่ส่งมา

### 2.1 โครงข้อมูลในหน้าเดิม

ตัวแปร `S` เป็น array ของแถวนักเรียน (457 แถว) รูปแบบ:

```
[ห้อง, เลขที่, ชื่อ, TR, ME, LR, GRA, CC, tot, flag, knowledgeState,
 dev, fbTR, fbME, fbLR, fbGRA, fbCC, growth, risk]
```

| ตำแหน่ง | ความหมาย |
|---|---|
| 0–2 | ห้อง, เลขที่, ชื่อ |
| 3–7 | คะแนนรูบริก 5 มิติ (TR, ME, LR, GRA, CC) ช่วง 1–5 |
| 8 | `tot` = จำนวน binary items ที่ผ่าน (0–9) |
| 9 | flag: `OK` / `Lucky` / `Careless` |
| 10 | Knowledge State: `Mastery` / `Language Dev` / `Structure OK` / `Beginner` |
| 11 | `dev` = มิติที่ยังต้องพัฒนา (สตริงคั่นด้วยช่องว่าง เช่น `TR ME GRA CC`) |
| 12–16 | feedback รายมิติ (ค่า `__NOT_SUBMITTED__` ที่ตำแหน่ง 12 = ยังไม่ส่งงาน) |
| 17–18 | growth (ตัวเลข) และ risk (`ต่ำ`/`ปานกลาง`/`สูง`/`ไม่มีข้อมูล`) |

ตัวแปร `PEM` แมปอีเมลนักเรียน → index ใน `S` (339 อีเมล)

### 2.2 กฎที่ยืนยันได้จากข้อมูล

9 binary items **คำนวณจากคะแนนรูบริก ไม่ได้เก็บแยก**:

| Item | กฎ |
|---|---|
| q1 | TR ≥ 3 |
| q2 | TR ≥ 4 |
| q3 | ME ≥ 3 |
| q4 | LR ≥ 3 |
| q5 | LR ≥ 4 |
| q6 | GRA ≥ 3 |
| q7 | GRA ≥ 4 |
| q8 | CC ≥ 3 |
| q9 | CC ≥ 4 |

`tot` = จำนวนข้อที่ผ่าน ตรวจแล้วตรงทุกแถวที่คะแนนเป็นจำนวนเต็มปกติ

Level (จาก `tot`): ≥ 8.5 → 5, ≥ 7 → 4, ≥ 5 → 3, ≥ 3 → 2, ต่ำกว่านั้น → 1
ชื่อ Level: Novice Draftsman, Structure Architect, Coherence Crafter, Language Warrior, CbKST Grandmaster
Rubric รวม = TR+ME+LR+GRA+CC (เต็ม 25)

### 2.3 ปัญหาที่พบ

| # | ปัญหา | ผลกระทบ | แนวทาง |
|---|---|---|---|
| 1 | `S` และ `PEM` ฝังในหน้า ทุกคนเห็นข้อมูลทุกคนได้ | ข้อมูลส่วนบุคคลรั่ว | API คืนเฉพาะของผู้ login |
| 2 | รหัสครู `TEACHER2568` เทียบฝั่ง client | ใครอ่านซอร์สก็เข้าโหมดครูได้ | Google login + role ที่ Worker |
| 3 | `_email`/`_role` ฝังมากับหน้าตอนสร้าง | ปลอมตัวตนได้ถ้าฝั่ง GAS ไม่ตรวจ | session cookie ที่ Worker |
| 4 | 25 แถวคะแนนเป็น `1.0` ทุกมิติ แต่ `tot = 9`/Mastery | ข้อมูลขัดกันเอง | **ตัดสินใจ: ปล่อยตามเดิม** (edge case) |

### 2.4 Schema Supabase เดิม (จากภาพ)

- `students(id, class, class_number, full_name, created_at, user_id)`
- `submissions(id, user_id, assignment_id, parts_completed, status, last_activity_at[text], created_at, answer_data[jsonb])`
- `assignments(id, title, total_parts, created_at)`
- `rubric_criteria(id, code[unique], label)`
- `writing_assessments(...)` และ `writing_assessment_scores(...)` — **legacy ไม่ต้องแก้**
- `user_id` อ้าง `auth.users.id`

---

## 3. สถาปัตยกรรมภาพรวม

```
 นักเรียน / ครู / dev
        │  HTTPS
        ▼
 Hub Web (React + Vite)  ── Cloudflare Pages
        │  fetch /api/*   (cookie session, HttpOnly)
        ▼
 Hub API (Hono)  ── Cloudflare Worker ──── D1 (snapshot ของ hub)
        │  Cron Trigger + ปุ่ม "ซิงก์ตอนนี้"
        │  GET /hub/*  (HMAC-signed, server-to-server)
        ▼
 เว็บแบบฝึก A (PRISM) / B / C ...   (แต่ละอัน: Worker + DB ของตัวเอง)
```

**ทิศทางข้อมูล**: hub ดึง (pull) จากแบบฝึก แบบฝึกไม่รู้จัก hub นอกจาก secret ร่วมและ 4 route
**หน้ารายงานอ่านจาก D1 ของ hub** ไม่ยิงไปแบบฝึกตอนเปิดหน้า ทำให้เร็ว และแบบฝึกล่มก็ยังดูข้อมูลล่าสุดได้

---

## 4. Tech stack และเหตุผล

### Backend (Hub API)

| ส่วน | เลือก | เหตุผล |
|---|---|---|
| Runtime | Cloudflare Workers | ใช้อยู่แล้วกับแบบฝึก, ไม่ต้องดูแลเซิร์ฟเวอร์ |
| Framework | Hono | เบา, middleware ครบ, type-safe, ต่อ D1 ตรง |
| DB | Cloudflare D1 (SQLite) | อยู่ใน ecosystem เดียวกัน เหมาะกับขนาด ~450 คน |
| ORM/Migration | Drizzle ORM | schema เป็น TypeScript, สร้าง migration SQL |
| Validation | Zod | ตรวจ manifest/payload ที่ขอบระบบ |
| Auth | Google OAuth (`arctic` หรือ `@hono/oauth-providers`) | ตรงกับแผนเดิม |
| Session | cookie HttpOnly+Secure+SameSite=Lax, เก็บ session ใน D1 | ไม่ต้องใช้ JWT ฝั่ง client |
| Schedule | Cron Triggers | sync อัตโนมัติ |
| Crypto | WebCrypto (`crypto.subtle`) | HMAC |

### Frontend

| ส่วน | เลือก | เหตุผล |
|---|---|---|
| Framework | React + Vite (SPA) | ทุกหน้าอยู่หลัง login ไม่ต้องใช้ SSR/SEO |
| Hosting | Cloudflare Pages | |
| Routing | TanStack Router | type-safe |
| Data | TanStack Query | cache, refetch, loading/error state |
| Style | Tailwind CSS + CSS variables | แปลงธีมเดิมเป็น token ได้ตรง ๆ |
| Chart | SVG/div เอง (แท่ง, กระจาย), Recharts ถ้าต้อง radar | รายงานเดิมใช้แท่งอยู่แล้ว |
| Font | Sarabun | ใช้อยู่แล้ว |

**ทำไมไม่ใช้ Next.js**: ไม่มีหน้า public ไม่ต้อง SSR/SEO, frontend แค่ `fetch()` ไป Worker, และ Next.js บน Workers (OpenNext) เพิ่มความซับซ้อนตอน deploy ถ้าต้องการใช้ Next.js ต่อจากแผนเดิมก็ทำได้ แต่ต้องยอมรับค่าใช้จ่ายส่วนนี้

---

## 5. โครงสร้าง Monorepo

```
practice-hub/
├─ package.json                 # pnpm workspaces
├─ pnpm-workspace.yaml
├─ tsconfig.base.json
├─ packages/
│  └─ shared/                   # ใช้ร่วม hub, web, และเว็บแบบฝึก
│     ├─ src/
│     │  ├─ manifest.ts         # Zod: ExerciseManifest
│     │  ├─ contract.ts         # Zod: Submission, StatusRow, RosterRow, PageEnvelope
│     │  ├─ rules.ts            # rule engine (parser เล็ก ไม่ใช้ eval)
│     │  ├─ sign.ts             # HMAC sign/verify
│     │  └─ index.ts
│     └─ test/
├─ apps/
│  ├─ api/                      # Hub Worker
│  │  ├─ wrangler.toml
│  │  ├─ drizzle.config.ts
│  │  ├─ migrations/
│  │  └─ src/
│  │     ├─ index.ts            # Hono app + export scheduled()
│  │     ├─ env.ts              # type ของ bindings/secrets
│  │     ├─ db/
│  │     │  ├─ schema.ts
│  │     │  └─ client.ts
│  │     ├─ middleware/
│  │     │  ├─ auth.ts          # อ่าน session cookie
│  │     │  ├─ role.ts          # requireRole('teacher')
│  │     │  ├─ ownership.ts     # ครูเฉพาะห้อง, นร. เฉพาะตัวเอง
│  │     │  ├─ rateLimit.ts
│  │     │  └─ audit.ts
│  │     ├─ routes/
│  │     │  ├─ auth.ts
│  │     │  ├─ me.ts
│  │     │  ├─ student.ts
│  │     │  ├─ teacher.ts
│  │     │  └─ dev.ts
│  │     ├─ sync/
│  │     │  ├─ client.ts        # เรียก /hub/* พร้อมลายเซ็น, timeout, retry
│  │     │  ├─ run.ts           # วนทุก exercise ที่ enabled
│  │     │  ├─ upsert.ts
│  │     │  └─ validate.ts      # ตรวจ consistency
│  │     └─ report/
│  │        ├─ compute.ts       # คำนวณรายงานจาก manifest + submissions
│  │        └─ cache.ts
│  └─ web/                      # React + Vite
│     ├─ index.html
│     ├─ vite.config.ts
│     └─ src/
│        ├─ main.tsx
│        ├─ routes/
│        │  ├─ login.tsx
│        │  ├─ student/        # index.tsx, result.$exId.tsx
│        │  ├─ teacher/        # index.tsx, report.$exId.$classId.tsx, status.tsx
│        │  └─ dev/            # exercises.tsx, logs.tsx, users.tsx
│        ├─ components/        # StatCard, SkillBar, ScoreDist, ItemDifficulty,
│        │                     # KnowledgeStateCard, StudentList, StatusBadge,
│        │                     # EmptyState, ErrorState, Skeleton
│        ├─ lib/
│        │  ├─ api.ts          # fetch wrapper
│        │  └─ queries.ts      # TanStack Query hooks
│        └─ styles/
│           ├─ tokens.css      # สี/ระยะ/ฟอนต์ เป็น CSS variables
│           └─ print.css
└─ templates/
   └─ exercise-adapter/         # ตัวอย่าง /hub/* ให้แบบฝึกใหม่คัดลอกไปใช้
```

`packages/shared` เป็นแหล่งความจริงของ contract เมื่อเปลี่ยน contract TypeScript จะเตือนทุกที่ที่ไม่ตรง (hub, web, และแบบฝึกที่ import แพ็กเกจนี้)

---

## 6. Contract ระหว่าง Hub กับแบบฝึก

เว็บแบบฝึกเพิ่ม 4 route นี้ นอกนั้นไม่ต้องเปลี่ยน

| Route | หน้าที่ |
|---|---|
| `GET /hub/manifest` | โครงสร้างแบบฝึก: parts, items, skills, กฎ, ข้อความ |
| `GET /hub/roster` | รายชื่อ ห้อง เลขที่ (แหล่งข้อมูลห้อง/เลขที่) |
| `GET /hub/status?cursor=` | สถานะรายคน |
| `GET /hub/submissions?since=&cursor=&limit=` | ผลรายคน รายส่วน/ข้อ (incremental) |

### 6.1 ลายเซ็น (HMAC)

Hub ส่ง header:

```
X-Hub-Timestamp: <unix seconds>
X-Hub-Signature: hex( HMAC_SHA256(secret, `${timestamp}.${method}.${pathWithQuery}`) )
```

ฝั่งแบบฝึก:

1. ปฏิเสธถ้า `|now - timestamp| > 300` วินาที
2. คำนวณลายเซ็นซ้ำและเทียบแบบ constant-time
3. ไม่ตรง → 401 (ไม่บอกเหตุผลละเอียด)

เป็น server-to-server ไม่ต้องเปิด CORS และไม่เอา secret ไปไว้ในเบราว์เซอร์

### 6.2 Response envelope

```json
{
  "schema": 1,
  "exerciseId": "prism-fanboys",
  "manifestVersion": "2.3.0",
  "generatedAt": "2026-10-20T07:00:00Z",
  "nextCursor": null,
  "data": []
}
```

### 6.3 `/hub/roster`

```json
{ "data": [
  { "email": "52xxx.name@student.nssc.ac.th", "googleSub": null,
    "name": "ด.ช.ตัวอย่าง นามสมมติ", "class": "ม.3/1", "no": 1 }
],
  "teachers": [ { "email": "teacher@...", "classes": ["ม.3/1","ม.3/2"] } ] }
```

- ใช้ `email` (หรือ `googleSub`) เป็นตัวจับคู่คน ไม่ใช้ชื่อหรือเลขที่ (เลขที่เปลี่ยนได้)
- ตั้ง "แบบฝึกต้นทางของ roster" เพียงตัวเดียว (ของครู) ตัวอื่นไม่ต้องส่ง roster
- คนที่มีผลแต่ไม่อยู่ใน roster → แสดง "ไม่ทราบห้อง" ในหน้า dev

### 6.4 `/hub/status`

```json
{ "data": [ { "email": "...", "attempt": 1, "status": "SUBMITTED",
              "partsCompleted": 3, "totalParts": 3, "lastActivityAt": "2026-10-19T10:21:00Z" } ] }
```

สถานะ: `TODO` → `IN_PROGRESS` → `SUBMITTED` → `COMPLETED`

### 6.4 `/hub/submissions`

```json
{ "data": [
  { "email": "...", "attempt": 1, "partId": "p1", "itemId": "TR",
    "score": 4, "max": 5, "at": "2026-10-19T10:21:00Z", "raw": {} }
] }
```

- unique key: `(exerciseId, email, attempt, partId, itemId)`
- `raw` เก็บของเฉพาะแบบฝึก (เช่น ข้อความที่นักเรียนเขียน) hub เก็บและแสดงได้โดยไม่ต้องเข้าใจ
- แบ่งหน้าด้วย `cursor`; `since` ใช้ซิงก์แบบ incremental

### 6.5 Adapter ที่แบบฝึกต้องเขียน

แต่ละแบบฝึกมีฟังก์ชันแปลง DB ของตัวเองเป็นรูปกลาง:

```ts
function toSubmissions(rows: MyRow[]): Submission[] { /* ... */ }
```

DB ต่างกันแค่ไหนก็ไม่กระทบ hub (เช่น แบบฝึกหนึ่งมี 2 part อีกอันมี 3 part, อันหนึ่งเก็บเป็นคอลัมน์ อีกอันเป็น JSON) ใช้ Zod จาก `packages/shared` ตรวจก่อนตอบ

---

## 7. Manifest schema

Manifest ทำให้หน้ารายงานเป็น generic: แบบฝึกชุดใหม่ใช้หน้ารายงานเดิมได้เลย

### 7.1 โครงสร้าง

```ts
// packages/shared/src/manifest.ts (ร่าง)
import { z } from "zod";

const Skill = z.object({
  code: z.string(),                 // "TR"
  name: z.string().optional(),      // "Task Response"
  nameTh: z.string().optional(),
  color: z.string().optional(),
  max: z.number().default(5),
  passMin: z.number().optional(),   // เกณฑ์ผ่านของมิตินี้ (เช่น 3)
  feedback: z.record(z.string()).optional(), // ข้อความ feedback ต่อระดับ/มิติ
});

const Item = z.object({
  id: z.string(),                   // "q1"
  label: z.string().optional(),
  // ข้อที่ได้จากข้อมูลโดยตรง
  skills: z.array(z.string()).optional(),
  max: z.number().optional(),
  // หรือข้อที่ "คำนวณ" จากคะแนนมิติ (เช่น binary item ของ PRISM)
  derive: z.object({ skill: z.string(), min: z.number() }).optional(),
});

const Part = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(["auto", "rubric", "manual"]),
  items: z.array(Item),
});

export const ExerciseManifest = z.object({
  schema: z.literal(1),
  id: z.string(),
  name: z.string(),
  version: z.string(),              // semver
  report: z.enum(["diagnostic", "score-only", "checklist"]),
  maxAttempts: z.number().default(1),
  attemptPolicy: z.enum(["latest", "best", "first"]).default("latest"),
  skills: z.array(Skill),
  parts: z.array(Part),
  levels: z.array(z.object({ min: z.number(), name: z.string(), xp: z.number() })).optional(),
  knowledgeStates: z.array(z.object({ name: z.string(), rule: z.string(), icon: z.string().optional(), color: z.string().optional(), tips: z.array(z.string()).optional() })).optional(),
  flags: z.array(z.object({ name: z.string(), rule: z.string() })).optional(),
  insights: z.array(z.object({ when: z.string(), level: z.enum(["red","amber","green"]), text: z.string() })).optional(),
  badges: z.array(z.object({ id: z.string(), name: z.string(), desc: z.string(), rule: z.string() })).optional(),
});
```

### 7.2 ตัวอย่างสำหรับ PRISM (ร่าง)

```json
{
  "schema": 1,
  "id": "prism-fanboys-pretest",
  "name": "PRISM · FANBOYS · Pretest",
  "version": "1.0.0",
  "report": "diagnostic",
  "maxAttempts": 1,
  "skills": [
    {"code":"TR","name":"Task Response","passMin":3},
    {"code":"ME","name":"Mechanics","passMin":3},
    {"code":"LR","name":"Lexical Resource","passMin":3},
    {"code":"GRA","name":"Grammar & Accuracy","passMin":3},
    {"code":"CC","name":"Coherence & Cohesion","passMin":3}
  ],
  "parts": [
    { "id": "rubric", "name": "คะแนนรูบริก", "kind": "rubric",
      "items": [
        {"id":"TR","skills":["TR"],"max":5},{"id":"ME","skills":["ME"],"max":5},
        {"id":"LR","skills":["LR"],"max":5},{"id":"GRA","skills":["GRA"],"max":5},
        {"id":"CC","skills":["CC"],"max":5}
      ] },
    { "id": "binary", "name": "CbKST 9 items", "kind": "auto",
      "items": [
        {"id":"q1","derive":{"skill":"TR","min":3}},{"id":"q2","derive":{"skill":"TR","min":4}},
        {"id":"q3","derive":{"skill":"ME","min":3}},
        {"id":"q4","derive":{"skill":"LR","min":3}},{"id":"q5","derive":{"skill":"LR","min":4}},
        {"id":"q6","derive":{"skill":"GRA","min":3}},{"id":"q7","derive":{"skill":"GRA","min":4}},
        {"id":"q8","derive":{"skill":"CC","min":3}},{"id":"q9","derive":{"skill":"CC","min":4}}
      ] }
  ],
  "levels": [
    {"min":0,"name":"Novice Draftsman","xp":0},
    {"min":3,"name":"Structure Architect","xp":40},
    {"min":5,"name":"Coherence Crafter","xp":62},
    {"min":7,"name":"Language Warrior","xp":80},
    {"min":8.5,"name":"CbKST Grandmaster","xp":100}
  ],
  "knowledgeStates": [ "…ต้องยืนยันกฎจริงจากฝั่ง GAS (ดูหัวข้อ 20)…" ],
  "flags": [ "…Lucky / Careless — ต้องยืนยันกฎจริง…" ]
}
```

### 7.3 Versioning

- `version` เป็น semver; hub เก็บ manifest ทุกเวอร์ชัน
- `submissions` ผูกกับ `manifest_version` ตอนที่ sync รายงานเก่าจึงคำนวณด้วยโครงเก่าได้
- แก้แค่ข้อความ/ลำดับ → patch/minor; เพิ่ม/ลบข้อหรือเปลี่ยน skills → major และหน้า dev เตือน "มีข้อมูลหลาย manifest version"

### 7.4 วิธีรับ "DS ที่ต่างกัน" ของแต่ละแบบฝึก

| ความต่าง | วิธีรับ |
|---|---|
| จำนวน part ต่างกัน (2, 3, …) | `parts[]` |
| วิธีให้คะแนนต่างกัน (ถูกผิด/รูบริก/ครึ่งคะแนน) | ทุกอย่างเป็น `score/max`, `kind` บอกชนิด |
| สมรรถนะคนละชุด | `skills[]` ประกาศต่อแบบฝึก |
| ข้อหนึ่งวัดหลายสมรรถนะ | `skills: []` เป็น array |
| ทำได้หลายรอบ | `attempt` + `attemptPolicy` |
| ข้อมูลพิเศษ | `raw` ไม่บังคับ schema |
| ข้อที่คำนวณจากข้ออื่น | `derive` |
| ไม่มีสมรรถนะ (แค่เสร็จ/ไม่เสร็จ) | `report: "checklist"` หรือ `"score-only"` |

### 7.5 Report templates

| template | แสดงอะไร |
|---|---|
| `diagnostic` | เต็มแบบ PRISM: Knowledge State, สมรรถนะ, ความยากรายข้อ, flag, insight |
| `score-only` | คะแนนเฉลี่ย, การกระจายคะแนน, ความยากรายข้อ, ใครยังไม่ส่ง |
| `checklist` | ทำเสร็จกี่ข้อ, ใครค้างตรงไหน |

ส่วนที่ทุก template ใช้ร่วม (การกระจายคะแนน, ความยากรายข้อ, รายชื่อ) คำนวณจาก `score/max` อย่างเดียว ส่วนที่ต้องมี `skills` และกฎ (Knowledge State, flag) ใช้ได้เฉพาะ `diagnostic`

---

## 8. Rule engine

กฎใน manifest เขียนเป็นสตริงหรือโครงสร้าง ต้องประเมินได้โดย **ไม่ใช้ `eval`/`new Function`**

### 8.1 ภาษากฎ (เสนอ)

```
expr    := or
or      := and ( "||" and )*
and     := cmp ( "&&" cmp )*
cmp     := atom ( ("<"|"<="|">"|">="|"=="|"!=") atom )?
atom    := number | ident | func "(" args ")" | "(" expr ")" | "!" atom
ident   := TR | ME | ... | tot | q1..q9 | room.<metric>
func    := all(list) | any(list) | count(list) | passed(item) | lost(item)
```

ตัวอย่าง: `ME>=3 && LR>=3 && GRA<3`, `count(q1..q9)>=7`, `room.lucky>=6`

### 8.2 การทำงาน

1. Parse เป็น AST ครั้งเดียวตอน sync manifest (ถ้า parse ไม่ผ่าน → manifest ถูกปฏิเสธ แสดงที่หน้า dev)
2. ประเมินด้วย context ของนักเรียน (คะแนนมิติ, ผลรายข้อ) หรือของห้อง (สถิติรวม)
3. ผลของ `knowledgeStates` = สถานะแรกที่กฎเป็นจริง (เรียงตามลำดับใน manifest), `else` เป็นค่า default

### 8.3 ทางเลือก

ถ้าไม่อยากเขียน parser: ใช้กฎเป็น JSON ล้วน เช่น `{ "all": [{"skill":"ME","gte":3}, {"skill":"LR","gte":3}] }` ตรวจง่ายกว่าและปลอดภัยกว่า แต่เขียนยากกว่า ควรเลือกก่อนเริ่มทำ (ดูหัวข้อ 20)

### 8.4 การทดสอบ

ใช้ข้อมูลเดิมเป็น "เฉลย": คำนวณ `tot`, Knowledge State, flag ใหม่จากคะแนนรายมิติของ `S` ทั้ง 457 แถว แล้วเทียบกับค่าที่เก็บไว้ ที่ไม่ตรงคือบั๊กของ rule หรือข้อมูลเก่า (25 แถวที่เป็น `1.0` ให้ยกเว้นตามที่ตัดสินใจ)

---

## 9. ฐานข้อมูล Hub (D1)

```sql
-- ผู้ใช้
CREATE TABLE users (
  id           TEXT PRIMARY KEY,           -- uuid
  google_sub   TEXT UNIQUE,
  email        TEXT NOT NULL UNIQUE,
  name         TEXT,
  role         TEXT NOT NULL DEFAULT 'student'
               CHECK (role IN ('student','teacher','dev')),
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE classes (
  id    TEXT PRIMARY KEY,
  name  TEXT NOT NULL,                     -- 'ม.3/1'
  year  INTEGER NOT NULL
);

CREATE TABLE enrollments (
  user_id   TEXT NOT NULL REFERENCES users(id),
  class_id  TEXT NOT NULL REFERENCES classes(id),
  no        INTEGER,
  PRIMARY KEY (user_id, class_id)
);

CREATE TABLE teacher_classes (
  teacher_id TEXT NOT NULL REFERENCES users(id),
  class_id   TEXT NOT NULL REFERENCES classes(id),
  PRIMARY KEY (teacher_id, class_id)
);

-- Registry ของแบบฝึก
CREATE TABLE exercises (
  id               TEXT PRIMARY KEY,
  base_url         TEXT NOT NULL UNIQUE,
  name             TEXT NOT NULL,
  manifest_json    TEXT,
  manifest_version TEXT,
  secret_hash      TEXT,                   -- เก็บเฉพาะ hash/เข้ารหัส ไม่เก็บ plaintext
  roster_source    INTEGER NOT NULL DEFAULT 0,
  enabled          INTEGER NOT NULL DEFAULT 0,
  sync_cursor      TEXT,
  last_sync_at     TEXT,
  last_status      TEXT,                   -- ok | error | never
  last_error       TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE exercise_manifests (          -- ประวัติ manifest ทุกเวอร์ชัน
  exercise_id TEXT NOT NULL REFERENCES exercises(id),
  version     TEXT NOT NULL,
  manifest_json TEXT NOT NULL,
  fetched_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (exercise_id, version)
);

CREATE TABLE assignments (
  exercise_id TEXT NOT NULL REFERENCES exercises(id),
  class_id    TEXT NOT NULL REFERENCES classes(id),
  due_at      TEXT,
  PRIMARY KEY (exercise_id, class_id)
);

-- สถานะต่อคนต่อแบบฝึก
CREATE TABLE user_exercise (
  user_id      TEXT NOT NULL REFERENCES users(id),
  exercise_id  TEXT NOT NULL REFERENCES exercises(id),
  status       TEXT NOT NULL CHECK (status IN ('TODO','IN_PROGRESS','SUBMITTED','COMPLETED')),
  attempts     INTEGER NOT NULL DEFAULT 0,
  score        REAL,
  max          REAL,
  updated_at   TEXT,
  PRIMARY KEY (user_id, exercise_id)
);

-- ผลรายข้อ
CREATE TABLE submissions (
  exercise_id      TEXT NOT NULL REFERENCES exercises(id),
  user_id          TEXT NOT NULL REFERENCES users(id),
  attempt          INTEGER NOT NULL DEFAULT 1,
  part_id          TEXT NOT NULL,
  item_id          TEXT NOT NULL,
  score            REAL NOT NULL,
  max              REAL NOT NULL,
  manifest_version TEXT NOT NULL,
  at               TEXT NOT NULL,
  raw_json         TEXT,
  flags            TEXT,                   -- เช่น 'inconsistent'
  PRIMARY KEY (exercise_id, user_id, attempt, part_id, item_id)
);
CREATE INDEX idx_sub_user ON submissions(user_id, exercise_id);

CREATE TABLE reports_cache (
  exercise_id TEXT NOT NULL,
  class_id    TEXT NOT NULL,
  computed_json TEXT NOT NULL,
  computed_at TEXT NOT NULL,
  PRIMARY KEY (exercise_id, class_id)
);

CREATE TABLE sessions (
  id         TEXT PRIMARY KEY,             -- random 32 bytes (hash เก็บ)
  user_id    TEXT NOT NULL REFERENCES users(id),
  expires_at TEXT NOT NULL
);

CREATE TABLE sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exercise_id TEXT NOT NULL, at TEXT NOT NULL,
  ok INTEGER NOT NULL, rows INTEGER, ms INTEGER, error TEXT
);

CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT, action TEXT NOT NULL, target TEXT, at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

หมายเหตุ

- คนที่ยังไม่เคย login แต่อยู่ใน roster → สร้างแถว `users` จาก email ไว้ก่อน (role = student) ผูก `google_sub` ตอน login ครั้งแรก
- ปกติเก็บเฉพาะข้อมูลที่รายงานต้องใช้ (ข้อความที่นักเรียนเขียนอยู่ใน `raw_json` เฉพาะเมื่อ manifest ระบุว่าต้องการ)
- การเปลี่ยน schema ทำแบบ expand → migrate → contract (ห้ามลบ/เปลี่ยนชื่อคอลัมน์ทีเดียว)

---

## 10. Sync

### 10.1 ลงทะเบียนแบบฝึก (flow ในหน้า dev)

1. dev วาง `https://xxx.workers.dev`
2. Hub เรียก `GET /hub/manifest` (ครั้งแรกยังไม่มี secret → แบบฝึกต้องอนุญาต manifest แบบสาธารณะ หรือใช้ "token ตั้งต้น" ใช้ครั้งเดียว ดูข้อ 20)
3. Zod ตรวจ manifest + parse กฎทุกตัว ไม่ผ่าน → แสดงข้อผิดพลาดรายข้อ
4. Hub สร้าง `hub_secret` และแสดงครั้งเดียว ให้ไปตั้งใน Worker ของแบบฝึก (`wrangler secret put HUB_SECRET`)
5. กด "ทดสอบ" → hub เรียกครบ 4 route และรายงานผ่าน/ไม่ผ่านทีละข้อ
6. เปิด `enabled`

### 10.2 รอบ sync

- Cron ทุก 10 นาที (ปรับได้) + ปุ่ม "ซิงก์ตอนนี้" ในหน้า dev
- วนทุก exercise ที่ `enabled`; แต่ละอัน: `manifest` (เทียบเวอร์ชัน) → `roster` (ถ้าเป็นแหล่ง) → `status` → `submissions?since=<cursor>`
- Upsert ด้วย primary key (`exercise_id, user_id, attempt, part_id, item_id`) → idempotent: ซิงก์ซ้ำกี่รอบผลเท่าเดิม
- timeout ต่อ request, retry แบบ exponential backoff, ไม่เกิน N ครั้ง
- บันทึก `sync_log` ทุกรอบ; อัปเดต `last_sync_at/last_status/last_error`
- หลังซิงก์ → ล้าง/คำนวณ `reports_cache` ของห้องที่ข้อมูลเปลี่ยน
- แบบฝึกตัวหนึ่งล่มไม่กระทบตัวอื่น (try/catch ต่อ exercise)

### 10.3 ตรวจ consistency ตอนซิงก์

| กรณี | การจัดการ |
|---|---|
| `score > max` หรือ `max` ไม่ตรง manifest | ติดธง `inconsistent` และไม่นับในรายงาน |
| `itemId` ไม่อยู่ใน manifest | ติดธง, ไม่คำนวณ |
| อีเมลไม่อยู่ใน roster | เก็บไว้, แสดงเป็น "ไม่ทราบห้อง" ที่หน้า dev |
| manifest version เปลี่ยน | หน้า dev เตือน |

ข้อมูลเก่าของ PRISM ที่ขัดกันเอง (25 แถว `1.0`) **ไม่ต้องจัดการเป็นพิเศษ** ตามที่ตัดสินใจ

---

## 11. Auth, Role, ความปลอดภัย

### 11.1 Login

- Google OAuth (Authorization Code + PKCE)
- จำกัดโดเมนอีเมลที่ยอมรับ (เช่น `@student.nssc.ac.th` และอีเมลครู) ตรวจ `email_verified`
- Callback สร้าง session แบบสุ่ม 32 ไบต์ เก็บ hash ใน `sessions`, ส่ง cookie `HttpOnly; Secure; SameSite=Lax; Path=/`
- CSRF: route ที่เปลี่ยนข้อมูลใช้ `POST/PATCH/DELETE` + ตรวจ `Origin` header

### 11.2 Role และสิทธิ์

| Role | สิทธิ์ |
|---|---|
| student | อ่านแบบฝึกของตัวเอง และผลของตัวเองเท่านั้น |
| teacher | อ่านรายงาน/สถานะของห้องที่ตัวเองสอน (`teacher_classes`) |
| dev | ทุกอย่างของ teacher + registry, sync, log, จัดการ role |

ตรวจที่ Worker ทุก route ด้วย middleware `auth → role → ownership` ไม่ใช่แค่ซ่อนปุ่มใน UI

### 11.3 รายการความปลอดภัย

- คะแนนมาจากแบบฝึก (signed) เท่านั้น; hub ไม่มี route รับคะแนนจากผู้ใช้
- ไม่ส่งข้อมูลนักเรียนคนอื่นไปที่เบราว์เซอร์ (แก้ปัญหา `S`/`PEM`)
- ไม่ฝังรหัสผ่าน/secret ในโค้ดหรือหน้าเว็บ; secret อยู่ใน Worker secrets
- `hub_secret` ต่อแบบฝึกคนละตัว; เก็บเป็นค่าที่เข้ารหัส/ hash ตามที่ต้องใช้ตรวจ
- Rate limit ที่ `/api/auth/*` และ route ที่เรียกบ่อย
- Security headers: `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors 'none'`
- Validate ทุกขาเข้าด้วย Zod (body, query, payload จากแบบฝึก)
- `audit_log` ทุกการกระทำสำคัญ (เพิ่ม/ปิดแบบฝึก, เปลี่ยน role, sync ด้วยมือ, export CSV)
- เก็บข้อมูลเท่าที่จำเป็น; export CSV เฉพาะครูของห้องนั้น
- ข้อมูลนักเรียนเป็นข้อมูลส่วนบุคคล: จำกัดการเข้าถึงตามห้อง, ไม่ log ข้อความที่นักเรียนเขียน

---

## 12. Hub API

Base: `/api` · ทุก route ตอบ JSON · error รูปแบบ `{ "error": { "code": "...", "message": "ภาษาคนอ่านรู้เรื่อง" } }`

### 12.1 Auth / ตัวตน

```
GET  /api/auth/google/start
GET  /api/auth/google/callback
POST /api/auth/logout
GET  /api/me                        -> { id, name, email, role, classes }
```

### 12.2 นักเรียน

```
GET /api/student/exercises          -> รายการแบบฝึกของฉัน + status + due_at
GET /api/student/results/:exId      -> ผลของฉัน (เฉพาะ user_id ตัวเอง)
```

ผล `results` ส่งค่าที่คำนวณแล้ว: คะแนนมิติ, `tot`, level/xp, knowledge state, flag, badges, feedback รายมิติ, tips, 9 binary items

### 12.3 ครู

```
GET /api/teacher/classes
GET /api/teacher/report/:exId/:classId      -> รายงานรวมห้อง (จาก reports_cache)
GET /api/teacher/status/:exId/:classId      -> ใครส่ง/ไม่ส่ง
GET /api/teacher/student/:exId/:userId      -> รายนักเรียน (เฉพาะห้องที่ดูได้)
GET /api/teacher/report/:exId/:classId/export.csv
```

### 12.4 dev

```
GET    /api/dev/exercises
POST   /api/dev/exercises               { baseUrl }   -> อ่าน manifest, สร้าง secret (คืนครั้งเดียว)
PATCH  /api/dev/exercises/:id           { enabled, name, rosterSource }
DELETE /api/dev/exercises/:id
POST   /api/dev/exercises/:id/test      -> ทดสอบ contract ทั้ง 4 route
POST   /api/dev/exercises/:id/sync      -> สั่งซิงก์ทันที
POST   /api/dev/exercises/:id/rotate-secret
GET    /api/dev/logs?type=sync|audit
GET    /api/dev/users            PATCH /api/dev/users/:id/role
PUT    /api/dev/assignments      { exerciseId, classId, dueAt }
PUT    /api/dev/teacher-classes  { teacherId, classIds }
```

### 12.5 โครงรายงานครู (`/api/teacher/report/...`)

```json
{
  "exercise": {"id":"...","name":"...","manifestVersion":"..."},
  "class": {"name":"ม.3/1","students":36},
  "asOf": "2026-10-20T07:00:00Z",
  "stats": { "submitted": 30, "notSubmitted": 6, "avgTot": 5.2, "avgRubric": 15.1,
             "lucky": 3, "careless": 7 },
  "knowledgeStates": [ {"name":"Mastery","count":9}, ... ],
  "skills": [ {"code":"TR","passPct":72,"avg":3.4}, ... ],
  "itemDifficulty": [ {"id":"q1","passPct":88,"tag":"ง่าย"}, ... ],
  "scoreDistribution": [ {"range":"0-1","count":4}, ... ],
  "insights": [ {"level":"amber","text":"..."} ],
  "students": [ {"no":1,"name":"...","scores":{"TR":3,...},"tot":6,"ks":"Beginner","flag":"OK"} ],
  "pending": [ {"no":4,"name":"..."} ]
}
```

---

## 13. Frontend: หน้าและ UX

หลักการ: แต่ละ role เห็นแค่สิ่งที่ต้องทำ ใน 1–2 คลิก

### 13.1 Design tokens

ใช้ธีมมืดและสีของระบบเดิมเป็นฐาน (พื้น `#060e1c`, accent `#38bdf8`, ฟอนต์ Sarabun) แปลงเป็น CSS variables ใน `tokens.css`; สีแทนสถานะมี 3 ระดับ (เขียว/เหลือง/แดง) และ **ใช้ไอคอน/ข้อความคู่กับสีเสมอ** ไม่พึ่งสีอย่างเดียว ขนาดอ่านง่ายบนมือถือ (นักเรียนส่วนใหญ่ใช้มือถือ), ปุ่มอย่างน้อย 44px

### 13.2 หน้านักเรียน

1. **งานของฉัน**: การ์ดแบบฝึก เรียงตามกำหนดส่ง สถานะสีชัดเจน ปุ่มใหญ่ปุ่มเดียว "ทำต่อ" (เปิดลิงก์เว็บแบบฝึก)
2. **ผลของฉัน** (ต่อแบบฝึก) สืบทอดจากหน้าเดิม:
   - โปรไฟล์: Level 1–5, ดาว, XP, กลุ่ม Knowledge State, flag, จำนวน Badges
   - Badges (First Draft Hero, Target Sniper (TR≥3), Bridge Builder (CC≥3), Sharp Eye (ME≥4), และ badge "future" ที่รอข้อมูล)
   - แท็บ Pretest / Cycle 1 / Cycle 2 / Post Test (จาก `maxAttempts` และชุดแบบฝึก)
   - คะแนนรูบริก /25, CbKST /9, การ์ดสมรรถนะ 5 มิติ + radar, 9 binary items, feedback รายมิติ, คำแนะนำตามกลุ่ม
   - ปุ่ม "คุยกับครู"
3. **ยังไม่ส่งงาน**: หน้าเฉพาะที่บอกให้ติดต่อครู
4. **ประวัติ** การทำ

### 13.3 หน้าครู

- เลือกห้อง × แบบฝึก (dropdown 2 อัน) → รายงานทันที
- บนสุด: ตัวเลขสำคัญ (ส่งแล้ว/ยังไม่ส่ง, กลุ่ม Beginner, Lucky/Careless) + ป้าย "ข้อมูลล่าสุดเมื่อ …"
- ถัดมา: Knowledge State, สมรรถนะ 5 ด้าน, ความยากรายข้อ, การกระจายคะแนน, insight, รายชื่อแยกกลุ่ม (สี + ไอคอน flag)
- ตาราง "ใครยังไม่ส่ง", ค้นหา/กรองรายชื่อ, ดูรายนักเรียน
- ปุ่ม พิมพ์ (print.css) และ Export CSV อยู่ในที่เห็นตลอด
- ครูเห็นเฉพาะห้องของตัวเอง

### 13.4 หน้า dev

- Registry: แต่ละแบบฝึกมีสถานะ เขียว/เหลือง/แดง, sync ล่าสุด, error ล่าสุด
- เพิ่มแบบฝึก: วาง URL → ผลตรวจ manifest → แสดง secret ครั้งเดียว → ปุ่ม "ทดสอบ" → เปิดใช้
- ดู manifest/raw payload, เทียบเวอร์ชัน, rotate secret
- sync log, audit log, จัดการ role, ผูกครู–ห้อง, assignments
- ปุ่ม re-sync ทั้งหมด / คำนวณรายงานใหม่

### 13.5 สถานะทุกหน้า

ทุกหน้ามี loading (skeleton), ว่าง, และ error เป็นภาษาไทยที่คนอ่านรู้เรื่อง เช่น "ยังไม่มีนักเรียนส่งงาน" แทนหน้าว่างเปล่า และ error ของ sync แสดงเวลาที่ข้อมูลล่าสุดแทนการล้มทั้งหน้า

### 13.6 การเข้าถึง (Accessibility)

ความต่างสีข้อความตามเกณฑ์ WCAG AA, ใช้งานด้วยคีย์บอร์ดได้, label ของฟอร์ม, ไม่ใช้สีอย่างเดียวสื่อสถานะ

---

## 14. Adapter ของ PRISM (แมปจากระบบเดิม)

PRISM เป็นแบบฝึกตัวแรกที่ใช้ contract นี้ เพิ่ม `/hub/*` **ควบคู่** กับ API เดิม (ไม่แก้ route เดิม)

### 14.1 การแมป

| Contract | แหล่งใน PRISM เดิม |
|---|---|
| `manifest.skills` | `rubric_criteria` (`code`, `label`) |
| `manifest.parts/items` | กำหนดใน manifest (rubric 5 ข้อ + binary 9 ข้อแบบ `derive`) |
| `/hub/roster` | `students` (`class`, `class_number`, `full_name`) join `auth.users.email` ผ่าน `user_id` |
| `/hub/status` | `submissions` (`status`, `parts_completed`, `last_activity_at`) + `assignments.total_parts` |
| `/hub/submissions` | คะแนนรายมิติจากตารางผลประเมิน และ/หรือ `answer_data` (jsonb) |

### 14.2 View อ่านอย่างเดียว (schema `hub` ไม่ expose ผ่าน PostgREST)

```sql
create schema if not exists hub;

create view hub.roster as
select s.full_name as name, u.email, s.class, s.class_number as no
from public.students s
left join auth.users u on u.id = s.user_id;

create view hub.status as
select sub.user_id, sub.assignment_id, sub.status,
       sub.parts_completed, a.total_parts, sub.last_activity_at
from public.submissions sub
join public.assignments a on a.id = sub.assignment_id;
```

view ของคะแนนรายมิติสร้างหลังจากทราบโครงสร้าง `answer_data` ที่ใช้เป็นแหล่งคะแนนจริง (ดูหัวข้อ 20) `writing_assessments` เดิมเป็น legacy ไม่ต้องแก้

### 14.3 ปรับปรุงเล็กน้อยที่ทำได้โดยไม่กระทบของเดิม (ทางเลือก)

- `submissions.status`: เพิ่ม `CHECK (status in ('TODO','IN_PROGRESS','SUBMITTED','COMPLETED'))` ด้วย `NOT VALID` แล้ว `VALIDATE`
- `last_activity_at` เป็น `text` → เพิ่มคอลัมน์ `last_activity_ts timestamptz`, backfill, แล้วค่อยเลิกใช้ตัวเก่าในรอบถัดไป
- unique `submissions(user_id, assignment_id)` และ `students(class, class_number)` ถ้ายังไม่มี (ตรวจข้อมูลซ้ำก่อน)
- ตรวจ RLS ของ `students` และตารางผลประเมินในหน้า Policies

---

## 15. แผน Refactor ทีละขั้น

ใช้วิธีครอบแล้วค่อยย้าย (strangler): ระบบเดิมวิ่งต่อ ส่วนใหม่ค่อย ๆ รับงานทีละชิ้น แต่ละขั้นต้องใช้งานได้จริงก่อนไปต่อ

| ขั้น | งาน | เกณฑ์ผ่าน |
|---|---|---|
| 0 | Backup ข้อมูลเดิมทั้งหมด (export SQL/CSV เก็บนอกระบบ), แยก branch, ทำ staging, เขียนเช็กลิสต์ "สิ่งที่ห้ามพัง" | มี backup ที่ restore ได้ |
| 1 | `packages/shared` (manifest/contract/rules) + test กับ `S` | rules คำนวณ `tot`/KS/flag ตรงกับของเดิม |
| 2 | เพิ่ม `/hub/*` ใน PRISM (ควบคู่ของเดิม, อ่านอย่างเดียว) | ตอบตาม contract, นักเรียนไม่รู้สึกอะไร |
| 3 | Hub API (D1, registry, sync, HMAC) + รายงานครูแบบอ่านอย่างเดียว | ตัวเลขตรงรายงาน PRISM เดิมทีละห้อง (ม.3/1 ถึง 3/12) |
| 4 | Google login + หน้า นร. + หน้า dev | นร. เห็นเฉพาะของตัวเอง; role บังคับที่ Worker |
| 5 | ครูเริ่มใช้หน้าใหม่คู่กับของเดิม 1–2 รอบสอน | ไม่มี bug ใหญ่ |
| 6 | ปิดหน้าเก่า (เก็บ read-only ไว้ระยะหนึ่ง) | ของใหม่ใช้ได้ครบ |

ส่วนที่เสี่ยงที่สุด (การส่งงาน/ให้คะแนน) อยู่ที่แบบฝึกเดิมจนขั้นสุดท้าย

### หลักการ migration ฐานข้อมูล

expand → migrate → contract: เพิ่มของใหม่ก่อน, ย้ายข้อมูล, ค่อยลบของเก่าใน release ถัดไปหลังโค้ดเลิกใช้ ห้ามเปลี่ยนชื่อ/ลบคอลัมน์ในรอบเดียว

---

## 16. การทดสอบ

เขียนเฉพาะที่คุ้ม:

1. **Rule engine**: unit test ทุกกฎของ Knowledge State/flag/insight, และเทียบกับ `S` 457 แถว (golden test)
2. **Adapter ของแต่ละแบบฝึก**: เทียบผลกับตัวเลขที่รู้คำตอบอยู่แล้ว
3. **Contract**: Zod ตรวจ response ของแบบฝึก, ทดสอบกรณีผิดรูป
4. **ความปลอดภัย**: ลายเซ็นผิด/หมดอายุ → 401; นักเรียนเรียก route ครู → 403; ครูเรียกห้องอื่น → 403; นักเรียนขอผลของคนอื่น → 403
5. **Sync idempotent**: รันซ้ำ 2 รอบ → แถวเท่าเดิม
6. **E2E เบา**: login (mock), เปิดรายงาน, สลับห้อง, export CSV

---

## 17. Deploy และ Environment

### 17.1 Environment

| env | ใช้ทำอะไร |
|---|---|
| local | `wrangler dev` + D1 local |
| staging | Worker/Pages/D1 แยก ใช้ข้อมูลทดสอบ |
| production | ของจริง |

### 17.2 Secrets และตัวแปร (Worker)

```
GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
SESSION_SECRET
HUB_SECRET_KEY            # คีย์เข้ารหัส hub_secret ของแต่ละแบบฝึก
ALLOWED_EMAIL_DOMAINS     # student.nssc.ac.th, ...
```

ตั้งด้วย `wrangler secret put` ไม่ใส่ใน repo

### 17.3 Deploy

- API: `wrangler deploy` (migration ด้วย `wrangler d1 migrations apply`)
- Web: build ด้วย Vite → Cloudflare Pages
- ผ่าน CI (GitHub Actions): typecheck, test, แล้วค่อย deploy; production deploy ด้วยการ approve

### 17.4 Backup

export D1 สม่ำเสมอ (เช่น รายวัน) เก็บนอกระบบ ทดสอบ restore เป็นระยะ

---

## 18. Observability และการดูแลระบบ

- หน้า dev แสดงสุขภาพทุกแบบฝึก (เขียว/เหลือง/แดง) จาก `last_status`, `last_sync_at`
- `sync_log` เก็บ rows/ms/error; แจ้งเตือนเมื่อ sync ล้มติดกันหลายรอบ (เริ่มแบบง่าย: แสดงแดงในหน้า dev)
- log แบบมีโครงสร้าง (request id, user id, route, status, ms) ไม่ log ข้อมูลนักเรียนส่วนบุคคลหรือข้อความที่เขียน
- Cloudflare Analytics/Workers Logs สำหรับดูอัตรา error

---

## 19. ความเสี่ยงและข้อสมมติ

| ความเสี่ยง | การลดความเสี่ยง |
|---|---|
| Refactor ทำระบบที่ใช้อยู่พัง | strangler, `/hub/*` เพิ่มคู่ของเดิม, backup, staging, เทียบตัวเลขกับรายงานเดิม |
| กฎ Knowledge State/flag ไม่ตรงของจริง | ได้โค้ดฝั่ง GAS มาตรวจ, golden test กับ `S` |
| ข้อมูลนักเรียนรั่ว | API ส่งเฉพาะของตัวเอง, role ที่ Worker, ไม่ฝังข้อมูลในหน้า |
| อีเมลไม่ตรงกันระหว่างระบบ | จับคู่ด้วย email/google_sub, หน้า dev แสดง "ไม่ทราบห้อง" |
| แบบฝึกล่ม | แสดงข้อมูล cache + เวลาล่าสุด, timeout/retry |
| D1 ขีดจำกัดขนาด/ปริมาณ | ขนาด ~450 คนอยู่ในขีดจำกัดสบาย; เก็บ `raw_json` เท่าที่จำเป็น |
| ครูเปลี่ยน/เพิ่ม | ผูกครู–ห้องในหน้า dev, ไม่ hardcode |

**ข้อสมมติ**

- PRISM Worker/Supabase ปัจจุบันใช้งานต่อได้ระหว่าง refactor
- ครูมีน้อย ผูกครู–ห้องมือในหน้า dev ก็พอ
- ข้อมูลเก่า 25 แถวที่ขัดกันเอง ปล่อยตามเดิม
- `writing_assessments` ไม่ต้องแก้

---

## 20. คำถามที่ยังเปิดอยู่

1. **กฎ Knowledge State และ Lucky/Careless จริง** อยู่ฝั่ง GAS (`.gs`) ไม่ได้อยู่ในหน้าที่ส่งมา ต้องการโค้ดส่วนนั้น (หรือยืนยันกฎ) เพื่อเขียนลง manifest ให้ตรง
2. **รูปแบบกฎ**: สตริง (ต้องเขียน parser) หรือ JSON โครงสร้าง (ตรวจง่าย/ปลอดภัย แต่เขียนยาวกว่า) ควรเลือกก่อนเริ่มทำ rule engine
3. **โครง `answer_data` (jsonb)** ใน `submissions` ของ PRISM และจุดที่เก็บคะแนนรายมิติจริง (ตารางไหน) เพื่อสร้าง view ของ `/hub/submissions`
4. **การลงทะเบียนครั้งแรก**: `/hub/manifest` ให้เปิดสาธารณะ (ไม่มีข้อมูลส่วนบุคคล) หรือใช้ token ตั้งต้นใช้ครั้งเดียว
5. **ชุดแบบฝึกของ PRISM**: Pretest / Cycle 1 / Cycle 2 / Post Test เป็น 4 exercise แยกกัน หรือ 1 exercise ที่มีหลาย attempt/phase
6. **โดเมนอีเมลของครู** และวิธีกำหนด role teacher/dev ตั้งต้น (ใส่เองในหน้า dev ครั้งแรก หรือ seed)
7. **กำหนดส่ง (`due_at`)** ครูตั้งที่ hub หรือมาจากแบบฝึก
8. **ความถี่ sync** ที่ต้องการ (10 นาทีเพียงพอไหม)

---

## ภาคผนวก A: ลำดับสร้างที่แนะนำ (สรุป)

1. `packages/shared` + test กับ `S`
2. `/hub/*` ใน PRISM
3. Hub API + รายงานครู (อ่านอย่างเดียว) เทียบตัวเลขกับของเดิม
4. Google login + หน้า นร. + หน้า dev
5. ใช้คู่กับของเดิม 1–2 รอบ แล้วปิดของเก่า

## ภาคผนวก B: Checklist ก่อนปล่อยใช้จริง

- [ ] Backup ล่าสุด restore ได้
- [ ] นักเรียนคนหนึ่งเปิดหน้าแล้วไม่เห็นข้อมูลคนอื่น (ตรวจ Network tab/View Source)
- [ ] ครูเปิดได้เฉพาะห้องตัวเอง
- [ ] ลายเซ็นผิด/หมดอายุถูกปฏิเสธ
- [ ] ตัวเลขรายงานตรงรายงานเดิมทุกห้อง
- [ ] ไม่มีรหัสผ่าน/secret ใน repo หรือหน้าเว็บ
- [ ] หน้าทุกหน้ามี loading/ว่าง/error
- [ ] ใช้งานบนมือถือได้ และพิมพ์รายงานได้
