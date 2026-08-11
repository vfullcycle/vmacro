# SCOPE — Vmacro v1.2

## In Scope

- PWA บันทึก macro รายมื้อ/รายวัน สำหรับ ≤5 users (invite-only)
- TDEE + macro target engine (3 สูตร เลือกได้ใน settings)
- Food search: FatSecret (US dataset) + shared Thai custom food DB + dish builder จากวัตถุดิบ
- Workflow ลดการทำซ้ำ: meal templates, favorites, recent, copy from yesterday
- Apple Health: เขียน f/c/p/kcal และอ่าน workout/HR/active energy ผ่าน Shortcuts bridge
- Analysis ขั้นบันได (stats → LLM insight → ML)
- Settings แยก Profile / System

## Out of Scope (v1)

- Public sign-up, social features, การแชร์ diary ระหว่าง user
- Native iOS/Android app, barcode scan ด้วยกล้อง (FatSecret barcode API มีให้ แต่เลื่อนไปพิจารณาหลัง P5)
- Micronutrients ครบถ้วน (vitamin/mineral) — v1 เอา energy + f/c/p (+ fiber/sugar/sodium ถ้า API ให้มาฟรี)
- Meal photo, AI ประเมินอาหารจากรูป
- Offline-first เต็มรูปแบบ — v1 ต้องมี internet ตอนบันทึก (PWA cache เฉพาะ shell)
- Real-time Health sync (ดู R-03)

## Constraints

- ทุก secret อยู่ VPS เท่านั้น (repo public)
- fatsecret attribution ต้องแสดงถาวรในหน้า food search
- Health sync เป็น manual/scheduled ผ่าน Shortcuts — ไม่ใช่ real-time
- อาหารจาก FatSecret ให้เก็บ snapshot ค่า macro ตอนบันทึก ไม่ re-fetch ย้อนหลัง

## Phases

### P0 — Infra Spike (gate: ทุก risk เปิดต้องปิดก่อนไป P1) → tag `v0.1.0`
- Init repo `vfullcycle/vmacro` ตามโครง monorepo (D-010) + `.gitignore` มี `.env` ตั้งแต่ commit แรก
- ทดสอบ FatSecret OAuth2 จาก VPS + ยืนยัน IP whitelist ผ่าน (ปิด R-01)
- Domain + Let's Encrypt บน VPS + proxy skeleton (token cache, `/food/search` passthrough) (ปิด R-02)
- Supabase project + schema v1 + RLS + invite user แรก (วี)
- Vite PWA skeleton deploy ขึ้น GitHub Pages เรียก proxy สำเร็จ 1 รอบ end-to-end

### P1 — Profile & Engine → tag `v0.2.0`
- Settings/Profile: ข้อมูลร่างกาย, activity level, goal, เลือกสูตร
- TDEE engine 3 สูตร + macro recommendation (pure functions + unit tests)
- Settings/System: หน่วย, ค่า default ต่าง ๆ
- Weight log + กราฟ trend อย่างง่าย

### P2 — Food & Diary (หัวใจของแอป) → tag `v1.0.0`
- FatSecret search + autocomplete ผ่าน proxy พร้อม attribution
- Custom food CRUD (creator_id, shared search ข้าม user)
- Dish builder: ประกอบวัตถุดิบ → รวม macro → save เป็นจาน
- Diary รายมื้อ + สรุปวัน เทียบ target จาก P1
- Meal templates / favorites / recent / copy yesterday

### P3 — Apple Health WRITE → tag `v1.1.0`
- VPS endpoint ให้ Shortcut ดึงยอด f/c/p/kcal ของวัน (auth ด้วย per-user token)
- Shortcut #1 + iCloud share link + คู่มือติดตั้ง 1 หน้า

### P4 — Apple Health READ + Analysis tier 1 → tag `v1.2.0`
- VPS ingest endpoint + Shortcut #2 (workout/HR/active energy)
- Dashboard: correlation/trend พื้นฐาน (เช่น kcal balance vs weight trend, protein vs training days)

### P5 — Insight tier 2 (LLM) → tag `v1.3.0`
- LLM endpoint บน VPS สรุป pattern รายสัปดาห์เป็นภาษาไทย
- (ประตูสู่อนาคต) เมื่อข้อมูล ≥3–6 เดือน ค่อยประเมิน ML tier 3 เป็นโปรเจกต์ย่อยแยก

## Phase Gate Rule

จบแต่ละ phase ต้อง: ผ่าน acceptance criteria ของ FR ใน phase นั้นครบ + วีใช้งานจริงอย่างน้อย 2–3 วัน
ก่อนอนุมัติเข้า phase ถัดไป (dogfooding คือ QA หลักของโปรเจกต์นี้) — ผ่าน gate แล้วจึงตี tag ตามที่ระบุ

**ข้อยกเว้น P0:** P0 เป็น infra spike ล้วน ไม่มี user-facing feature ให้ dogfood จริง (เริ่มมีตั้งแต่ P1)
— เกณฑ์ "ใช้งานจริง 2–3 วัน" จึงเริ่มนับบังคับตั้งแต่ P1 เป็นต้นไป P0 ตี tag ได้ทันทีที่ risk ทุกตัวปิด
+ AC ผ่านครบ โดยต้องทดสอบความเสี่ยงที่ปกติจะเจอจากการใช้งานจริงข้ามคืน/หลายวันแทน (เช่น cert renewal
dry-run, service restart resilience) ก่อนตี tag แทนการรอเวลาจริง

## Changelog

- v1.2 (2026-08-11): เพิ่มข้อยกเว้น Phase Gate Rule สำหรับ P0 (ไม่มี dogfood surface จริง จนกว่าจะถึง P1) —
  ตัดสินใจโดยวีหลังพิสูจน์ residual risk ด้วย test แทนการรอเวลา: certbot renew --dry-run
  (vmacro.persiq.net ผ่าน — พบ bug เดิมไม่เกี่ยวกับ Vmacro ที่ persiq.net/ssdhr.persiq.net แยกไปแจ้งต่างหาก)
  + token cache expiry/refetch (ผ่าน)
- v1.1 (2026-08-11): เพิ่มงาน repo init ใน P0 + ผูก tag semver กับแต่ละ phase gate (D-010)
- v1.0 (2026-08-11): สร้างครั้งแรก
