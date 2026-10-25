# Gateway check

หน้าทดสอบ gateway ด้วยตัวเอง: ล็อกอิน Google (Supabase Auth) แล้วยิง `/v1/me`, ส่งงานตัวอย่าง, อ่านกลับ

```bash
cd tools/gateway-check
npx serve -l 5173 .        # เปิด http://localhost:5173
```

ต้องตั้งที่ Supabase ก่อน (Authentication):
1. Providers → **Google** เปิดใช้งาน (ใส่ Client ID/Secret จาก Google Cloud)
2. URL Configuration → **Redirect URLs** เพิ่ม `http://localhost:5173/`

ถ้ายังไม่อยากตั้ง ให้วาง access token เองในช่อง "วาง token เอง"
