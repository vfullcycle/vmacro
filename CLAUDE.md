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
- **งานที่ยังไม่มี FR รองรับ (เช่น task ใหม่ในแต่ละ phase ตั้งแต่ P4):** ร่าง FR + Acceptance Criteria
  ส่งวีอนุมัติก่อนเสมอ → bump `docs/REQUIREMENTS.md` (เฉพาะวีสั่ง) → แล้วค่อยเขียนโค้ด — ทำทีละ FR
  ห้ามรวบหลายรายการร่างพร้อมกันทีเดียว (2026-08-19)
- **ตอนวางแผน phase ใหม่ ต้องเช็ค `docs/PROJECT_BIBLE.md` §7 Backlog ทุกครั้ง** ว่ามีรายการไหน mark ไว้ว่า
  ควรรวมเข้า phase ที่กำลังวางแผนบ้าง (2026-08-21 — บทเรียนจาก BL-01 ที่ mark ไว้ตั้งแต่ P2 ว่า "ให้รวมเข้า
  scope เลย" แต่ตกหล่นไม่เคยกลายเป็น FR จริง เพราะไม่มีใครย้อนเช็ค backlog ตอนวางแผน P2) — ของที่อยู่ใน
  backlog แต่ไม่เคยกลายเป็น FR จะไม่มีวันถูกทำ

## Research Gate (D-013)

ใช้เฉพาะ feature ที่เข้าเกณฑ์ข้อใดข้อหนึ่ง:
(ก) ผลลัพธ์เป็นการประมาณค่า/ทำนาย ที่ความแม่นยำเป็นสาระของ feature
(ข) มีคำถามเชิง algorithm ที่คำตอบผิดจะรื้อ architecture ภายหลัง

งานนอกเกณฑ์นี้ (CRUD, UI, integration, สูตรที่มีมาตรฐานชัด) ไม่เข้า gate — ห้ามใช้ gate นี้ฟุ่มเฟือย

Feature ที่เข้า gate: ห้ามเริ่มโค้ดจนกว่ามี `docs/research/<topic>.md` ตอบครบ 5 ข้อ:
1. ปัญหา + วรรณกรรมพร้อมอ้างอิง
2. benchmark ตัวเลขจริงจากงานอื่น
3. ทางเลือก 2-3 ทาง + trade-off
4. เพดานเชิงทฤษฎี
5. เกณฑ์สำเร็จ + แหล่ง ground truth

— และวีอนุมัติแล้ว

**สิทธิ์ของ Claude Code ภายใต้กติกานี้:**
- เสนอเองได้ว่า feature ไหนควรเข้า/ไม่ควรเข้า gate พร้อมเหตุผล
- ถ้าเห็นว่า mark เกินจำเป็น ท้วงได้เลย ตัดสินโดยวี
- เป็นผู้เขียน research doc เองได้ แค่ต้องผ่านรีวิวจากวี

**เพดานของ research doc (กันบานปลาย):**
- ยาวไม่เกิน 2 หน้า (~800 คำ) ต่อไฟล์ — เกินนี้ถือว่ายังย่อยปัญหาไม่พอ
- เป็น snapshot ณ เวลาตัดสินใจ: freeze พร้อมคำอนุมัติ ไม่ maintain ต่อ — ถ้าความรู้เปลี่ยนให้เปิด doc ใหม่อ้างของเก่า
- ถ้าโฟลเดอร์ `docs/research/` มีเกิน 4 ไฟล์เมื่อไหร่ ให้ทักวีทบทวนว่า gate ถูกใช้ฟุ่มเฟือยหรือไม่

## Git Conventions (D-010)

- **Branch:** trunk-based — ทำงานบน `main` เป็นหลัก, feature branch เฉพาะงานทดลองที่เสี่ยงกระทบของที่ใช้อยู่
- **Commit:** Conventional Commits + อ้าง FR ID เสมอเมื่อเป็นงาน feature
  - `feat(diary): copy-from-yesterday (FR-DIARY-3)`
  - `fix(calc): rounding drift in macro split (FR-CALC-3)`
  - `docs:` / `chore:` / `test:` ตามชนิดงาน
- **Tag:** semver ผูกกับ phase gate — annotated tag พร้อมข้อความอ้าง phase
  - `v0.1.0` = จบ P0, `v0.2.0` = จบ P1, `v1.0.0` = จบ P2 (core ครบ), `v1.1.0` = จบ P3, `v1.2.0` = จบ P4a,
    `v1.3.0` = จบ P4b, `v1.4.0` = จบ P5
  - ตัวอย่าง: `git tag -a v0.1.0 -m "P0 complete: infra spike, R-01/R-02 closed"`
- **Commit/tag message:** สั้น อ้างอิง decision ID (Dxxx) หรือ FR ID แทนการอธิบายเหตุผลยาวในข้อความ —
  เหตุผลเต็มอยู่ใน PROJECT_BIBLE Decision Log เสมอ อยู่แล้ว ไม่ต้องพูดซ้ำ (2026-08-19: message ยาวเกินไป
  เคยโดน auto-mode permission classifier บล็อกจริงด้วย)
- **Push:** จบ task ที่ผ่าน DoD แล้วให้ commit ทันที — อย่าสะสมงานหลาย task ใน commit เดียว

## Server deploy (D-015 amendment, 2026-08-13)

`server/` (VPS proxy) **ไม่ auto-deploy** ต่างจาก `web/` (GitHub Pages ผ่าน Actions) — push ขึ้น `main` อย่างเดียวไม่พอ
เคยเกิด VPS ค้าง 10 commits มาแล้วเพราะเข้าใจผิดว่า deploy แล้ว (ดู PROJECT_BIBLE §5 D-015)

- จบงานที่แก้ไฟล์ใน `server/` ทุกครั้ง ต้อง deploy จริงก่อนถือว่า DoD ผ่าน:
  ```
  ssh vmacro-vps 'bash /home/vmacro/vmacro/server/deploy/deploy.sh'
  ```
- Deploy script (`server/deploy/deploy.sh`) ทำให้ครบในคำสั่งเดียว: `git pull` → `npm install` เฉพาะตอน `package-lock.json` เปลี่ยน → เขียน `server/deploy/version.json` → restart `vmacro-proxy` → self-check `GET /version`
- **ตรวจ drift ได้ทุกเมื่อ** โดยเทียบ `curl https://vmacro.persiq.net/version` (commit ที่รันจริงบน VPS) กับ `git log --oneline -1` (commit ล่าสุดบน `main`) — ต้องตรงกันเสมอหลัง deploy
- **เลี่ยงช่วงเวลากินข้าว** (07:00–09:00, 11:00–13:00, 17:00–20:00 เวลาไทย) สำหรับ deploy ที่มี downtime
  จริง (VPS restart) และ push ที่ trigger web deploy — เพื่อนใช้งานจริงแล้ว (2026-08-19: 3 users รวมวี)
  อาจกำลังบันทึกอาหารอยู่ช่วงนั้น — docs-only commit ไม่ trigger deploy ผ่านได้ทุกเวลา

## Migration safety (เพิ่ม 2026-08-19)

มีเพื่อนใช้งานจริงแล้ว — migration ที่แก้ schema ของตารางที่มีข้อมูล user อยู่แล้ว (ไม่ใช่ตารางเปล่า/สร้างใหม่)
ต้อง backup ก่อนรันเสมอ: `pg_dump` เฉพาะตารางนั้นผ่าน `psql` (ใช้ connection string ของ Supabase, รันจาก
VPS หรือเครื่อง local ก็ได้ที่ต่อถึง) เก็บไฟล์ไว้ก่อน — ไม่ต้องระบบ backup ใหญ่ แค่ dump ไฟล์เก็บพอ

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
