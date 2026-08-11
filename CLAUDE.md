# CLAUDE.md — Working Rules สำหรับ Vmacro

> ไฟล์นี้ต้องอยู่ **root ของ repo** เสมอ — Claude Code อ่านอัตโนมัติทุก session
> เอกสารหลักที่เหลืออยู่ใน `docs/` อ่านตามลำดับใน `docs/00_START_HERE.md`

## บทบาทและภาษา

- วีเป็น solo developer (พื้นฐาน actuarial/BA/SA/applied math) — อธิบาย logic เบื้องหลังได้ ไม่ต้องอธิบายพื้นฐานที่ชัดเจน
- สื่อสารกับวีเป็น**ภาษาไทย** ทับศัพท์อังกฤษได้พร้อมวงเล็บความหมายไทยเมื่อเป็นศัพท์เฉพาะ
- Code, comment, commit message, identifier ทั้งหมดเป็น**ภาษาอังกฤษ**

## Comprehension-Verification ก่อนเริ่มทุก session

ก่อนเขียนโค้ดใด ๆ Claude Code ต้อง:
1. อ่านไฟล์ตามลำดับ: `CLAUDE.md` → `docs/00_START_HERE.md` → `docs/PROJECT_BIBLE.md` → `docs/SCOPE.md` → `docs/REQUIREMENTS.md`
2. สรุปความเข้าใจ: phase ปัจจุบัน, งานที่จะทำ, FR ที่เกี่ยวข้อง, decision ที่ผูกอยู่
3. ระบุจุดกำกวมหรือขัดแย้ง (ถ้ามี) แล้ว**ถามก่อนทำ**
4. รอวี confirm แล้วจึงเริ่ม

## กติกา implement

- ทำทีละ phase ตาม `docs/SCOPE.md` — ห้ามหยิบงาน phase ถัดไปมาทำก่อนโดยไม่ได้รับอนุมัติ
- ทุก feature ต้อง trace กลับไปที่ FR ID ได้ ถ้าไม่มี FR รองรับ = out of scope จนกว่าวีจะสั่งเพิ่ม
- Requirement ขัดกับ decision → decision ชนะ, decision ขัดกันเอง → ถามวี
- เจอปัญหา technical ที่ต้องเปลี่ยน architecture → หยุด, เสนอทางเลือกพร้อม trade-off, รอวีตัดสิน แล้วบันทึกเป็น decision ใหม่ใน PROJECT_BIBLE

## Git Conventions (D-010)

- **Branch:** trunk-based — ทำงานบน `main` เป็นหลัก, feature branch เฉพาะงานทดลองที่เสี่ยงกระทบของที่ใช้อยู่
- **Commit:** Conventional Commits + อ้าง FR ID เสมอเมื่อเป็นงาน feature
  - `feat(diary): copy-from-yesterday (FR-DIARY-3)`
  - `fix(calc): rounding drift in macro split (FR-CALC-3)`
  - `docs:` / `chore:` / `test:` ตามชนิดงาน
- **Tag:** semver ผูกกับ phase gate — annotated tag พร้อมข้อความอ้าง phase
  - `v0.1.0` = จบ P0, `v0.2.0` = จบ P1, `v1.0.0` = จบ P2 (core ครบ), `v1.1.0` = จบ P3, `v1.2.0` = จบ P4, `v1.3.0` = จบ P5
  - ตัวอย่าง: `git tag -a v0.1.0 -m "P0 complete: infra spike, R-01/R-02 closed"`
- **Push:** จบ task ที่ผ่าน DoD แล้วให้ commit ทันที — อย่าสะสมงานหลาย task ใน commit เดียว

## Tech constraints (สรุปจาก PROJECT_BIBLE — ที่นั่นคือ source of truth)

- Frontend: React + TypeScript + Vite, PWA, deploy บน GitHub Pages (**repo public — ห้าม commit secret ทุกชนิด**)
- Backend proxy: VPS ของวี (static IP 150.95.85.219) — เก็บ FatSecret credentials, token caching, Health data ingest endpoint
- DB: Supabase (Postgres + RLS + Auth)
- ห้ามเพิ่ม dependency ใหญ่โดยไม่ถาม (state lib, UI framework, ORM) — เลือกของเบาและอธิบายเหตุผลเสมอ

## Secret hygiene (สำคัญที่สุดเพราะ repo public)

- `.gitignore` ต้องมี `.env` (และ `.env.*` ยกเว้น `.env.example`) ตั้งแต่ commit แรก
- `server/.env.example` มีได้ — ใส่เฉพาะชื่อ key ห้ามมีค่าจริง
- ค่า credential จริงทั้งหมดอยู่บน VPS เท่านั้น
- ก่อน commit ทุกครั้ง: ตรวจ diff ว่าไม่มี key/secret/token หลุด

## Definition of Done ต่อ task

1. โค้ดทำงานตาม acceptance criteria ของ FR ที่อ้าง
2. ไม่มี secret ใน repo (ตรวจก่อน commit ทุกครั้ง)
3. Commit + push ตาม git conventions ข้างบน
4. อัปเดตสถานะใน `docs/00_START_HERE.md` §สถานะปัจจุบัน เมื่อจบ phase + ตี tag
5. บอกวีว่าทดสอบอะไรด้วยมือได้บ้าง (manual test checklist สั้น ๆ)

## สิ่งที่ห้ามทำเด็ดขาด

- แก้ `docs/REQUIREMENTS.md` เองโดยไม่ได้รับคำสั่ง
- Hardcode FatSecret key/secret, Supabase service key ในโค้ดฝั่ง client
- ข้าม RLS หรือเปิด table แบบ public โดยไม่มี decision รองรับ
- ลบ attribution ของ fatsecret ออกจาก UI (เงื่อนไข Premier Free)
- Force push ไป `main`
