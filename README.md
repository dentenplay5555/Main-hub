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
services/gateway  Cloudflare Worker (Hono + jose)        ← ตัวใหม่ ดูหัวข้อด้านล่าง
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

**เก็บทุก part:** ทุกคีย์ระดับบนสุดของ body (เช่น `info`, `outline`, `drafts`, `journey`) ถูกแยกเก็บเป็นแถวใน `submission_parts` (ส่วนที่ว่าง `{}` ก็เก็บ โดยติด `is_empty`) ค่าธรรมดาอย่าง `sheet` รวมไว้ใน part `_meta` และคะแนนที่รู้จัก (TR/ME/LR/GRA/CC/score/pct) ในทุกระดับของ part ถูกดึงไปไว้ใน `part_scores`
part ใหม่หรือ part ที่หายไปไม่ต้องแก้ schema ส่วนตัวตน (`user_id`, `user_email`) มาจาก token เสมอ ไม่เชื่อ `info.email` ใน body

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

## ยังไม่ได้ทำ (v0.1)

- rate limit ต่อผู้ใช้ และกฎจำนวนครั้งที่ส่ง (Pretest 1, Cycle 1/2 รอบละ 3, Post Test 1) ที่ต้องบังคับฝั่ง gateway/DB
- endpoint อ่านข้อมูล (ผลของฉัน, รายงานครู) และ role นักเรียน/ครู/ผู้ดูแล
- ย้าย engine CbKST จาก `apps/exam/server/cbkst.ts` เข้า gateway
- Learning System (รวม Dashboard), Weather, Music Player ยังเป็น "เร็ว ๆ นี้" ใน Hub
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
