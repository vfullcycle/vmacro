# SCOPE — Vmacro v1.5

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

### P4a — Daily-use impact → tag `v1.2.0`
(แบ่งจาก P4 เดิมเป็นสองครึ่ง มี tag คั่นกลาง — บทเรียนจาก P2 ที่ phase ไม่มีหมุดกลางทางไหลยาว)
- BL-11: Search UX เร็วขึ้น+อ่านง่ายขึ้น — วัด latency อยู่เบื้องหลังคู่ขนานกับงานอื่นด้านล่าง (ไม่ block
  คิว), ห้ามแตะ search logic จนกว่าจะรายงานตัวเลข (2026-08-19)
- D-019: Day-type energy target — **เสร็จแล้ว** (FR-CALC-4, deploy 2026-08-19)
- D-023: AI Import — เริ่ม research doc (gate แบบเบา) คู่ขนานกับ D-019 ตั้งแต่ตอนนี้, เริ่มโค้ดทันทีที่
  D-019 จบ (2026-08-19: เลื่อนขึ้นก่อน BL-08 เพราะเพื่อนที่ใช้จริงติดขัดตรงหาไม่เจอแล้วให้วี import ให้ —
  วีกลายเป็นคอขวด, AI Import คือตัวแก้ตรงจุดนั้น)
- BL-08: Dashboard tab แทน Weight tab (ต้องมี D-019 จบก่อน เพราะ ring ต้องโชว์ day-type)

### P4b — Data-dependent → tag `v1.3.0`
- BL-10 (งานแรก, ทำได้ทันทีที่ D-019+BL-08 จาก P4a จบ): Per-meal targets + meal-time reminders
- FR-HLTH-3: VPS ingest endpoint + Shortcut #2 (workout/HR/active energy) — Apple Health READ
- FR-ANLT-1: Dashboard analytics tier 1 — correlation/trend พื้นฐาน (เช่น kcal balance vs weight trend,
  protein vs training days) ต้องมีข้อมูล health+diary สะสมจาก FR-HLTH-3 ก่อนถึงมีอะไรวิเคราะห์
- ปิด P4b แล้วค่อยตัดสินใจ BL-09 (Friends tab) ว่าเข้าก่อน/คู่ P5

### P5 — Insight tier 2 (LLM) → tag `v1.4.0`
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

- v1.5 (2026-08-19): D-019 (day-type target, FR-CALC-4) เสร็จ + deploy แล้ว — P4a งานถัดไปคือ D-023
- v1.4 (2026-08-19): ปรับลำดับ P4a เป็น D-019 → D-023 → BL-08 (เดิม D-019 → BL-08 → D-023) — feedback
  จากเพื่อน 2 คนที่ใช้จริง: ค้นไม่เจอแล้วให้วี import ให้เอง (วีกลายเป็นคอขวด) ทำให้ D-023 (AI Import)
  มีค่าเร่งด่วนกว่า dashboard — เริ่ม research doc คู่ขนานกับ D-019 ได้ทันที ดู PROJECT_BIBLE v1.17+
- v1.3 (2026-08-19): แบ่ง P4 เป็น P4a (`v1.2.0`: BL-11 search UX, D-019 day-type, BL-08 dashboard,
  D-023 AI Import) / P4b (`v1.3.0`: BL-10 per-meal targets, FR-HLTH-3 Health READ, FR-ANLT-1 analytics
  tier 1) — P5 เลื่อน tag เป็น `v1.4.0` — วีอนุมัติหลัง discuss ลำดับ dependency, ดู PROJECT_BIBLE v1.16
  สำหรับบริบทเต็ม (มีเพื่อนเริ่มใช้จริงแล้ว 2 คน)
- v1.2 (2026-08-11): เพิ่มข้อยกเว้น Phase Gate Rule สำหรับ P0 (ไม่มี dogfood surface จริง จนกว่าจะถึง P1) —
  ตัดสินใจโดยวีหลังพิสูจน์ residual risk ด้วย test แทนการรอเวลา: certbot renew --dry-run
  (vmacro.persiq.net ผ่าน — พบ bug เดิมไม่เกี่ยวกับ Vmacro ที่ persiq.net/ssdhr.persiq.net แยกไปแจ้งต่างหาก)
  + token cache expiry/refetch (ผ่าน)
- v1.1 (2026-08-11): เพิ่มงาน repo init ใน P0 + ผูก tag semver กับแต่ละ phase gate (D-010)
- v1.0 (2026-08-11): สร้างครั้งแรก
