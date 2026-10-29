# dentenplay-hub

รวมเว็บแอปไว้ใน repo เดียว (monorepo) มีหน้า Hub พร้อมเมนูตารางจุดสำหรับสลับแอปแบบ Google spp
และมี **gateway** (Cloudflare Worker) เป็นด่านเดียวที่คุยกับฐานข้อมูล Supabase 

```
Hub (apps/hub)    Exercise Web (แยก)    เว็บอื่น ๆ
        \               |               /
         Cloudflare Worker  (services/gateway)
           ตรวจ Bearer token · ตรวจโดเมนอีเมล · รับ payload แบบยืดหยุ่น
                          |
                  Supabase Postgres  (db/migrations)
```

```
apps/hub          หน้าแรก + ตัวสลับแอป (Vite + React)   ← รายชื่อแอปแก้ที่ apps/hub/src/apps.ts
apps/exam         Exam Management (React + Vite)         ← ยังใช้ API เดิมใน apps/exam/functions
apps/learning     Learning System (React + Vite)         ← หน้านักเรียน/ครู อ่านผ่าน gateway (ดูหัวข้อ Learning System)
apps/music        Music Player — หน้าเว็บขอเพลงผ่าน QR (React + Vite)  ← ดูหัวข้อ Music Player
services/gateway  Cloudflare Worker (Hono + jose)        ← ตัวใหม่ ดูหัวข้อด้านล่าง
services/music-api Cloudflare Worker + D1 + Durable Object ← API/WebSocket ของ Music Player (แยกจาก gateway)
packages/shared   types/constants ที่ใช้ร่วมกันระหว่าง apps/music กับ services/music-api
db/migrations     SQL สำหรับ Supabase                     ← รันใน SQL editor ตามลำดับเลข
scripts/build.mjs build Hub + exam รวมเป็น dist/
```

## สัญญาของ gateway ("dynamic")

**เข้มงวดแค่เรื่องเดียว คือ header `Authorization: Bearer <token>`** (token ของ Supabase Auth)

| กรณี | ผลลัพธ์ |
|---|---|
| ไม่มี header / รูปแบบผิด | 401 `missing_token` / `malformed_authorization` |
| token ปลอม หมดอายุ หรือ audience ผิด | 401 `invalid_token` |
| อีเมลไม่อยู่ในโดเมนที่อนุญาต | 403 `domain_not_allowed` |
| body ใหญ่เกิน `MAX_BODY_BYTES` | 413 `payload_too_large` |
| ฐานข้อมูลล่ม | 502 `db_unavailable` (ไม่แกล้งทำเป็นสำเร็จ) |
| **อย่างอื่นทั้งหมด** | **บันทึกสำเร็จ** (201) |

"อย่างอื่นทั้งหมด" คือ body ไม่ใช่ JSON, content-type ผิด, body ว่าง, เป็น array/ตัวเลข/ข้อความ, ชื่อฟิลด์ต่างจากที่คาด,
คะแนนเป็นข้อความ ฯลฯ ระบบเก็บ body ดิบไว้ใน `raw` ทุกครั้ง ดึงฟิลด์ที่อ่านออกไปใส่คอลัมน์ และบอกสิ่งที่ผิดปกติใน `warnings`
(ดูกฎการอ่านฟิลด์ที่ `services/gateway/src/normalize.ts`) ส่ง `Idempotency-Key` ซ้ำได้ ระบบจะคืน id เดิมโดยไม่บันทึกซ้ำ

**ระบุแบบฝึกจาก URL:** `POST /v1/submissions/writing-1` หรือ `POST /v1/submissions?exercise=writing-1` (ถ้ามีทั้งใน URL และ body จะใช้ค่าใน URL) เว็บแบบฝึกจึงไม่ต้องใส่ id ใน body

**เก็บทุก part:** ทุกคีย์ระดับบนสุดของ body (เช่น `info`, `outline`, `drafts`, `journey`) ถูกแยกเก็บเป็นแถวใน `submission_parts` (ส่วนที่ว่าง `{}` ก็เก็บ โดยติด `is_empty`) ถ้า payload เป็นแบบแบน (เช่น `Socratic_Topic`, `Act1_Acc`) จะจัดกลุ่มตามคำก่อน `_` (ตัดเลขท้ายออก: `Act1_Acc`…`Act6_Acc` รวมเป็น part `Act`) ชื่อ field คงเดิม ค่าที่เหลือ (เช่น `sheet`, `Name`, `Class`) รวมไว้ใน part `_meta` และ `FormType` ใช้เป็นรหัสแบบฝึกถ้าไม่มีอย่างอื่น และคะแนนที่รู้จัก (TR/ME/LR/GRA/CC/score/pct) ในทุกระดับของ part ถูกดึงไปไว้ใน `part_scores`
part ใหม่หรือ part ที่หายไปไม่ต้องแก้ schema ส่วนตัวตน (`user_id`, `user_email`) มาจาก token เสมอ ไม่เชื่อ `info.email` ใน body

**อ่านผล (`GET`, ต้องมี Bearer token เหมือนกัน):**

| endpoint | ใครใช้ได้ | ได้อะไร |
|---|---|---|
| `/v1/me` | ทุกคน | อีเมลและ role (`teacher` ถ้าอยู่ใน `TEACHER_EMAILS` ไม่งั้น `student`) |
| `/v1/my/submissions`, `/v1/my/submissions/:id` | ทุกคน | งานของตัวเองเท่านั้น (กรองด้วย user id จาก token เสมอ) พร้อมทุก part และคะแนน |
| `/v1/teacher/submissions`, `/:id`, `/v1/teacher/scores` | ครู (ไม่ใช่ครู = 403) | งานและคะแนนทั้งหมด กรองด้วย `exercise_id`, `email`, `limit` ได้ |

ตั้งอีเมลครูใน `services/gateway/wrangler.toml` ที่ `TEACHER_EMAILS` (เมื่อ deploy)

ทุก response เป็น JSON เสมอ ไม่มีหน้า HTML error หรือ stack trace

```bash
curl -X POST https://<gateway>/v1/submissions \
  -H "Authorization: Bearer $TOKEN" -H "Idempotency-Key: abc-1" \
  -d '{"exerciseId":"ex1","score":"8","answers":{"q1":"b"}}'
# => {"ok":true,"id":"...","duplicate":false,"warnings":[]}
```

## ติดตั้งและทดสอบ

```bash
npm install
npm test            # exam 6 เทสต์ + gateway 18 เทสต์
npm run typecheck
npm run dev         # รัน Hub
```

## Deploy gateway (Cloudflare)

1. Supabase → SQL editor → รัน `db/migrations/0003_raw_submissions_and_parts.sql` (0001 เลิกใช้แล้ว; โปรเจกต์ main ใช้ 0002 + 0003 ที่รันไปแล้ว)
2. แก้ `services/gateway/wrangler.toml`: ใส่ `SUPABASE_URL` (และ `ALLOWED_EMAIL_DOMAINS` ถ้ารวมโดเมนครู)
3. ตั้ง secret (ห้าม commit):
   ```bash
   cd services/gateway
   npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
   npx wrangler secret put SUPABASE_JWT_SECRET   # เฉพาะโปรเจกต์ที่ยังใช้ legacy HS256
   npx wrangler deploy
   ```
   (anon key ใน Dashboard เดิมขึ้นต้นด้วย `eyJhbGciOiJIUzI1NiIs` = HS256 จึงน่าจะต้องใช้ `SUPABASE_JWT_SECRET`)

## Deploy หน้าเว็บ (GitHub Pages)

Workflow `.github/workflows/deploy-pages.yml` ทดสอบ (`npm test`) แล้ว build และ deploy ให้เองทุกครั้งที่ push เข้า `master`
เว็บอยู่ที่ `https://<user>.github.io/<ชื่อ repo>/`

ตั้งครั้งเดียวที่ GitHub:
1. Settings → Pages → Build and deployment → Source = **GitHub Actions**
2. repo ต้องเป็น **public** (Pages ของ repo private ใช้ฟรีไม่ได้ ต้องมีแผนเสียเงิน) ดูรายการตรวจก่อนเปิด public ในหัวข้อความปลอดภัย

**ขึ้นทีละนิด:** เริ่มต้นเว็บมีแค่ Hub ส่วน exam ถูกซ่อน (tile ขึ้น "เร็ว ๆ นี้" และไม่ถูกเผยแพร่) เมื่อพร้อมเปิด
ให้ไปที่ Settings → Secrets and variables → Actions → **Variables** แล้วเพิ่ม
- `INCLUDE_EXAM` = `1` เผยแพร่หน้า exam และเปิด tile ใน Hub
- `VITE_API_BASE` = origin ของ API ที่ exam จะเรียก (ว่างไว้ได้ถ้ายังไม่มี)

แล้วรัน workflow ซ้ำ (Actions → Deploy to GitHub Pages → Run workflow) แอปใหม่ ๆ ให้เพิ่มทำตามรูปแบบเดียวกันนี้

## Learning System (`apps/learning`)

- นักเรียน: ล็อกอิน Google (Supabase Auth) → เห็นเรดาร์ 5 ทักษะ ระดับ (Beginner / Structure OK / Language Dev / Mastery) คะแนน x/9 สัญญาณเตือน (Lucky / Careless) ขั้นตอนต่อไป และเหรียญรางวัล
- ครู (อีเมลใน `TEACHER_EMAILS`): ภาพรวมห้อง การกระจายคะแนน ตัวกรองห้อง/ระดับ/ธง ค้นหา และรายงานรายบุคคลแบบเดียวกับที่นักเรียนเห็น
- กฎวินิจฉัยอยู่ที่ `apps/learning/src/lib/diagnose.ts` (มีเทสต์) ย้ายจากหน้า PRISM เดิมและ view ใน Supabase: ใช้คะแนน TR/ME/LR/GRA/CC ของกลุ่มล่าสุดที่ครบทั้ง 5 ด้าน (เช่น `drafts/d3`) ถ้าไม่ครบจะไม่เดาระดับ
- ตั้งค่า (ไม่ลับทั้งหมด): `VITE_GATEWAY_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY` (publishable key), `VITE_EXERCISE_ID` (ว่าง = ทุกแบบฝึก)
- เปิดบนเว็บ: repo Variable `INCLUDE_LEARNING=1` แล้วรัน workflow ซ้ำ และเพิ่ม URL ของเว็บ (เช่น `https://<user>.github.io/Main-hub/learning/`) ใน Supabase → Authentication → URL Configuration → Redirect URLs

## Music Player (`apps/music` + `services/music-api`)

ย้ายมาจาก repo `Music-Player-For-Classroom-self-hosted` (ห้องเรียนสร้างห้อง แล้วนักเรียนสแกน QR ขอเพลง YouTube เข้าคิว)
หน้าเว็บอยู่ที่ `apps/music` ส่วน API (Hono + D1 + Durable Object สำหรับ WebSocket) อยู่ที่ `services/music-api`
ไม่ได้ใช้ Supabase และไม่ผ่าน gateway ของ Hub มี D1 migration ของตัวเองใน `services/music-api/migrations`

**รันในเครื่อง (หรือในวง Wi-Fi ห้องเรียน)**
```bash
npm install
cp services/music-api/.dev.vars.example services/music-api/.dev.vars   # แล้วแก้ ADMIN_PASSWORD เป็นรหัสของคุณเอง
npm run d1:migrate:local -w services/music-api    # ครั้งแรกครั้งเดียว
npm run dev -w services/music-api                 # API :3001
npm run dev -w apps/music                         # เว็บ :5173 (proxy /api ไป :3001)
```
- **ไม่มีรหัสผ่านเริ่มต้น** ถ้าไม่ตั้ง `ADMIN_PASSWORD` การเข้า Admin จะถูกปฏิเสธ (503)
- ให้มือถือสแกน QR ได้: ตั้ง `PUBLIC_URL` (เช่น `http://192.168.1.50:5173`) ใน `services/music-api/wrangler.toml`
- **จอ Player บนเครื่องอื่น (เช่น คอมในห้อง)**: ทุกห้องมี Player Token ของตัวเอง ในหน้า Admin กด "คัดลอกลิงก์จอ Player" แล้วเปิดลิงก์นั้นบนเครื่องจอ เครื่องนั้นจะเลื่อนเพลงอัตโนมัติได้โดยไม่ต้อง login Admin ลิงก์นี้มีรหัสควบคุม **อย่าแชร์ให้นักเรียน** (QR ของนักเรียนเป็นคนละลิงก์และไม่มี token) ห้องที่สร้างก่อนมีฟีเจอร์นี้จะได้ token เมื่อ Admin เปิดแผงควบคุมครั้งแรก
- **Autoplay (ไม่บังคับ)**: สวิตช์ในหน้า Admin แท็บ C เมื่อคิวหมด ระบบค้นเพลงใกล้เคียงกับเพลงที่เพิ่งเล่นจบจาก YouTube แล้วเล่นต่อให้เอง ต้องมี YouTube Data API key (สร้างฟรีใน Google Cloud Console เปิด "YouTube Data API v3") ใส่ใน `.dev.vars` เป็น `YOUTUBE_API_KEY=...` หรือบน Worker ด้วย `npx wrangler secret put YOUTUBE_API_KEY` โควตาฟรี 10,000 หน่วยต่อวัน การค้นหนึ่งครั้งใช้ราว 101 หน่วย จึงได้ราว 100 เพลงต่อวัน (ทุกห้องใช้โควตาร่วมกัน) ถ้าไม่มี key สวิตช์จะกดไม่ได้ ถ้าโควตาหมดหรือไม่เจอเพลงที่เหมาะ เพลงจะหยุดและมีบันทึก `autoplay.failed` ในแท็บ D เพลงที่ Autoplay เลือกจะกรองเฉพาะวิดีโอหมวดดนตรี ฝังได้ ยาว 30 วินาทีถึง 10 นาที ใช้ SafeSearch แบบเข้มและไม่ซ้ำกับ 50 เพลงล่าสุดของห้อง ต้องมีเพลงที่เล่นจบอย่างน้อย 1 เพลงก่อน จึงจะมีเพลงให้ใช้ค้น
- **เนื้อเพลง (หน้า Player)**: แผง "เนื้อเพลง" ใต้แถบ Now Playing ดึงจาก [LRCLIB](https://lrclib.net) ตอนเล่น ไม่ต้องมี key และไม่ได้เก็บเนื้อเพลงลง DB (แคชที่ edge ไม่เกิน 1 วัน) Worker ค้นจากชื่อวิดีโอ แล้วแสดงเฉพาะผลที่ชื่อเพลงอยู่ในชื่อวิดีโอจริง ถ้าไม่แน่ใจจะบอกว่าไม่พบ ไม่แสดงเนื้อผิดเพลง ถ้ามีเวลาประกอบ เนื้อจะไฮไลต์ตามวิดีโอ (ปรับเร็ว/ช้าได้ทีละ 0.5 วินาที เพราะเวอร์ชันใน YouTube อาจมีอินโทรไม่เท่าต้นฉบับ) เพลงไทยหรือเพลงใหม่อาจไม่มีใน LRCLIB และสถานะลิขสิทธิ์ของข้อมูลเป็นของผู้ให้บริการนั้น ถ้าจะใช้เชิงพาณิชย์ควรเปลี่ยนไปใช้บริการที่มีสัญญาอนุญาต
- เปิดผ่าน IP แบบ `http://` ได้ (โค้ดไม่พึ่ง `crypto.randomUUID` / `navigator.clipboard` ที่ใช้ได้เฉพาะ HTTPS/localhost)

**ขึ้นเว็บ (GitHub Pages + Worker)** — หน้าเว็บอยู่บน Pages แต่ API ต้อง deploy เป็น Worker แยก
1. `npx wrangler d1 create qr-music-db` แล้วใส่ `database_id` จริงใน `services/music-api/wrangler.toml`
2. `npm run d1:migrate:remote -w services/music-api`
3. `cd services/music-api && npx wrangler secret put ADMIN_PASSWORD && npx wrangler deploy`
4. ใส่ origin ของ Pages (เช่น `https://<user>.github.io`) ใน `ALLOWED_ORIGINS` ของ `wrangler.toml` แล้ว deploy ซ้ำ
5. GitHub → Settings → Actions → **Variables**: `INCLUDE_MUSIC` = `1` และ `VITE_MUSIC_API_BASE` = origin ของ Worker (เช่น `https://qr-music-api.<account>.workers.dev`) แล้วรัน workflow ซ้ำ

## ยังไม่ได้ทำ (v0.1)

- rate limit ต่อผู้ใช้ และกฎจำนวนครั้งที่ส่ง (Pretest 1, Cycle 1/2 รอบละ 3, Post Test 1) ที่ต้องบังคับฝั่ง gateway/DB
- รายงานครูแบบสรุป (กระจายคะแนน ระดับความรู้ flag รายห้อง) ซึ่งตอนนี้มีแค่ข้อมูลดิบจาก `/v1/teacher/scores`
- ย้าย engine CbKST จาก `apps/exam/server/cbkst.ts` เข้า gateway
- QR Studio (`apps/qrcode`) ทำงานในเบราว์เซอร์ทั้งหมด ไม่มี API: ตั้ง repo Variable `INCLUDE_QRCODE=1` เพื่อเผยแพร่และเปิด tile ใน Hub (ข้อมูลเก็บใน IndexedDB ของเบราว์เซอร์ ใช้กล้องสแกนได้เฉพาะ https หรือ localhost)
- Learning System (รวม Dashboard) และ Weather ยังเป็น "เร็ว ๆ นี้" ใน Hub (Music Player จะขึ้นเมื่อตั้ง `INCLUDE_MUSIC=1`)
- ตัวสลับแอปมีเฉพาะหน้า Hub ยังไม่ได้ฝังในแต่ละแอป
- ล็อกอินของ exam บน GitHub Pages: API คนละโดเมนกับหน้าเว็บ ทำให้ cookie ใช้ไม่ได้ ต้องย้ายมาใช้ token ผ่าน gateway ก่อนค่อยตั้ง `INCLUDE_EXAM=1`

## ความปลอดภัย

- อย่าใส่ `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `.env` ลง repo (`.gitignore` กันไว้แล้ว)
- ตาราง `submissions` เปิด RLS และไม่มี policy เลย anon key / ผู้ใช้ทั่วไปอ่านเขียนตรง ๆ ไม่ได้ มีแต่ gateway ที่เข้าถึงได้
- ข้อมูลนักเรียน (ชื่อ อีเมล คะแนน) ต้องอยู่ในฐานข้อมูลเท่านั้น ห้ามฝังในไฟล์ HTML/JS หรือ commit ลง repo ที่จะเป็น public

**ก่อนเปลี่ยน repo เป็น public** (Settings → General → Danger Zone → Change visibility):
- [ ] ค้นใน repo และประวัติ git ว่าไม่มี key/รหัสผ่าน/ชื่อ-อีเมล-คะแนนนักเรียนจริง (`git log -p | grep -iE "secret|password|@student"`)
- [ ] ไม่มีไฟล์ `.env`, `.dev.vars` หรือไฟล์ข้อมูลนักเรียน (เช่น export จาก PRISM) ถูก commit
- [ ] ถ้าเคย commit secret แล้ว ต้องเปลี่ยน key ใหม่ ไม่ใช่แค่ลบไฟล์ (ประวัติยังเห็นอยู่)
- [ ] `SUPABASE_URL` และ anon key เปิดเผยได้ แต่ `service_role` / `JWT secret` ห้ามอยู่ใน repo
