# SCOPE — Vmacro v1.20

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

### P4a — Daily-use impact → tag `v1.2.0` **(ปิดแล้ว 2026-08-21)**
(แบ่งจาก P4 เดิมเป็นสองครึ่ง มี tag คั่นกลาง — บทเรียนจาก P2 ที่ phase ไม่มีหมุดกลางทางไหลยาว)
- BL-11: Search UX เร็วขึ้น+อ่านง่ายขึ้น — **ปิดสมบูรณ์** (batch translation, FatSecret toggle, "ดูทั้งหมด"
  บน custom/dish, deploy 2026-08-19) — instrumentation ถอดออกแล้ว (2026-08-20, วีสั่งหยุดรอข้อมูลเพิ่ม)
- D-019: Day-type energy target — **เสร็จแล้ว** (FR-CALC-4, deploy 2026-08-19)
- D-023: AI Import — **ยกเลิก (2026-08-20)** วัดผลจริงแล้วไม่แก้ปัญหาที่ตั้งใจ + มีต้นทุน API credit
  เพิ่ม โดยไม่ได้ดีกว่า pipeline ChatGPT+ตรวจเอง+bulk import ที่ใช้อยู่ — ดู D-023 ใน PROJECT_BIBLE §5
  สำหรับตัวเลขเต็ม, โค้ดเก็บไว้เฉยๆ หลัง flag ปิดถาวร ไม่ลบ — แทนที่ด้วย **BL-12** (ขออาหารใหม่ในแอป,
  แก้ปัญหาการประสานงานแทนที่จะพยายามแทนที่ความรู้วี — ดู §7 Backlog) ยังไม่กำหนด phase
- BL-08: Dashboard tab แทน Weight tab (ต้องมี D-019 จบก่อน เพราะ ring ต้องโชว์ day-type) — **เสร็จแล้ว**
  (FR-DASH-1, kcal ring + P/C/F ผ่าน shared hook `useTodayTarget()`, weight card+sparkline, "X/7 วัน" +
  amendment ระหว่าง dogfood: composition ring P/F/C/OTH, breakout ring, date-nav) — วี dogfood ผ่านครบ
  10 ข้อ (2026-08-21)

### P4b — Data-dependent → tag `v1.3.0` **(ปิดแล้ว 2026-08-21)**
- **BL-10/FR-CALC-5 — เสร็จแล้ว**: Per-meal targets จากเวลาตื่นนอน/ชั่วโมงนอน (default คำนวณอัตโนมัติ
  override ได้เสมอไม่ถูกทับ), % ต่อมื้อปรับได้, remaining-based display เป็น progress bar สี (แดง=เกินเป้า,
  เขียว=ไม่เกิน) โทนข้อเท็จจริงล้วนใน Diary+Dashboard, แสดงเฉพาะวันนี้เท่านั้น — วี dogfood ผ่านครบ
  (2026-08-21) — reminder ตามเวลาจริง (push) ไม่อยู่ในขอบเขตนี้ (รอ Shortcut #2/BL-13 กลับมาทำก่อน)
- ~~FR-HLTH-3 (Shortcut #2 client) + FR-ANLT-1~~ — **เลื่อนออกจาก P4b 2026-08-21 (วีตัดสินใจ)** ไปเป็น
  backlog **BL-13** ยังไม่กำหนด phase — server ฝั่ง FR-HLTH-3 เสร็จ+deploy+migration แล้ว (endpoint
  `/health/ingest`, ตาราง `health_workouts`/`health_daily_stats`, RPC
  `ingest_health_data_for_token()`) คงไว้เฉยๆ ไม่มีต้นทุน maintain, API contract ยืนยันแล้วที่
  `docs/shortcuts/shortcut-2-read.md` หยิบต่อได้ทันทีเมื่อวีพร้อมลงเวลาต่อ Shortcut ทีละ action บนเครื่องจริง
- BL-09 (Friends tab): เลื่อนอีกครั้ง (2026-08-21) — เกณฑ์ตัดสินผูกกับผลใช้งานจริงของ BL-12 (ดูด้านล่าง)
  แทนการกำหนด phase ตายตัว ดู PROJECT_BIBLE §7 BL-09 สำหรับเกณฑ์เต็ม

### P4c — Community + data collection → tag `v1.4.0` **(ปิดแล้ว 2026-08-21)**
- **BL-12/FR-FOOD-9 — เสร็จแล้ว**: ขออาหารใหม่ในแอป — แทนที่ D-023/AI Import ที่ยกเลิก, แก้ปัญหาประสานงาน
  เพื่อนที่เกิดขึ้นจริง — status 3 แบบ (pending/fulfilled/declined) + โน้ต admin ส่งกลับ requester, ไม่มี
  push notification — **ถือเป็น prototype ของ BL-09 (Friends tab) ในตัว** — วี dogfood ผ่านครบ 8 ข้อ
  (รวม RLS verification + end-to-end role-play) ไม่มี DF เหลือ
- **BL-01/FR-DIARY-4 — เสร็จแล้ว**: ราคาต่อ diary entry (optional) — ทำรวมรอบเดียวกับ BL-12, เพิ่งค้นพบว่า
  ตกหล่นจาก P2 ตั้งแต่แรก (ดู CLAUDE.md กติกาใหม่เรื่องเช็ค backlog ตอนวางแผน phase)
- ระหว่าง dogfood ได้ปรับเพิ่ม: แยก Settings → System ส่วน day-type/meal-target ออกเป็น 2 หน้าใหม่ (ชื่อ
  user เข้าใจง่าย: "เป้าตามประเภทวันฝึก", "เป้าต่อมื้ออาหาร"), แก้ spacing DF หลายจุด, จำกัด "ที่เคยกินมื้อนี้"
  เหลือ 5 รายการ+โหลดเพิ่ม

### P4d — Friends tab foundation → tag `v1.5.0` **(ปิดแล้ว 2026-08-22)**
- **BL-14/BL-09 ส่วนที่ 1 → FR-FRIEND-1 — เสร็จแล้ว**: แท็บ "Friends" ใหม่ (toolbar 5 ปุ่ม:
  Diary·Search·Dashboard·Friends·Settings) เริ่มจาก feed (อาหาร/จานใหม่จากทุกคนพร้อมชื่อผู้สร้าง, คำขอของ
  ตัวเองที่ถูกตอบ) + notification badge จุดแดงบนไอคอนแท็บ เช็คตอนเปิดแอปเท่านั้นไม่ใช้ push — เดิมออกแบบเป็น
  Dashboard section (FR-DASH-2) แล้วย้ายมาเป็นแท็บแยกก่อน deploy จริงตามแผน toolbar 5 ปุ่มที่ BL-09 บันทึกไว้
  แล้ว กันทำงานสองรอบ — วี dogfood ผ่านครบ 7 ข้อ ไม่มี DF
- BL-09 ส่วนที่ 2 (leaderboard/contribution board/activity feed) ยังไม่เริ่ม รอเกณฑ์เดิม (จำนวนคำขอ BL-12
  จากเพื่อน 3-4 สัปดาห์ นับจากวันที่วีแจ้งเพื่อนจริง — ยังไม่ระบุวันที่)
- Backlog เพิ่ม BL-15 (Web Push notification) ระหว่างทาง — ยังไม่ทำ รอเงื่อนไข (ดู PROJECT_BIBLE §7)

### P4e — Friends: posts + activity events → tag ยังไม่กำหนด (รอปิด phase)
- **BL-16/FR-FRIEND-2 — dogfood ผ่านครบ 7 ข้อ (รวม SQL ยืนยัน RLS)**: โพสต์ใน Friends feed เปิดให้ทุกคน
  โพสต์ได้ — พบปัญหาออกแบบระหว่าง dogfood (โพสต์ถูกดันตกจาก feed ที่ capped เวลามี bulk import เยอะ) แก้แล้ว
  ด้วยการแยกเป็น 2 ส่วน: "โพสต์" (ถาวร ไม่ capped, `fetchPosts`) กับ "ความเคลื่อนไหว" (capped/ephemeral,
  `fetchActivityFeed`) ใช้ cursor เดียวกันสำหรับ badge — เพิ่ม auto-link URL ใน body ผ่าน `Linkified.tsx`
  (split-based, ไม่ใช้ markdown/HTML render กัน XSS)
- **FR-FRIEND-3 — code-complete+deploy+migration รันแล้ว 2026-08-22 — รอวี dogfood**: activity events
  เชิงบวกล้วน 4 แบบ (บันทึกครบทุกมื้อ, ต่อเนื่องครบ 7/14/30 วัน — ใช้ "milestone สูงสุดที่ยังไม่เคยฉลอง"
  กันพลาดตอนไม่เปิดแอปวันที่ครบพอดี, ถึงเป้าโปรตีน, อาหารที่สร้างได้รับการยืนยัน — ผูกกับผู้สร้างอาหารไม่ใช่
  admin ที่กด) แสดงในส่วน "ความเคลื่อนไหว" — ห้ามมีตัวเลขเทียบ/เปิดเผย kcal/น้ำหนัก/สิ่งที่กิน — toggle
  "แชร์กิจกรรม" ใน Settings → System หัวข้อ "การแชร์ใน Friends" (default เปิด, บังคับด้วย RLS ไม่ใช่ client
  filter — เตรียมที่ว่างให้ BL-20/BL-21 เข้ากลุ่มเดียวกันทีหลัง)
- Backlog ปรับระหว่างทาง: ยกเลิก **BL-18** (รูปภาพในโพสต์/Storage, คำสั่งวีหลัง discuss ที่ปรึกษา), เพิ่ม
  **BL-19** (link preview, ยังไม่ทำ), **BL-20** (activity events ส่วนที่เหลือ, ยังไม่ทำ), **BL-21**
  (achievement badges, พร้อมทำหลัง FR-FRIEND-3 — ดู PROJECT_BIBLE §7)

### P5 — Insight tier 2 (LLM) → tag `v1.6.0` (เลขอาจขยับถ้า P4e ตี tag คั่นก่อน)
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

- v1.20 (2026-08-22): เพิ่ม P4e (Friends: posts + activity events) ระหว่างทาง — BL-16/FR-FRIEND-2 dogfood
  ผ่าน+แก้ design issue ที่พบ (แยกโพสต์ถาวร/ความเคลื่อนไหว capped), FR-FRIEND-3 code-complete+
  deploy+migration รันแล้ว รอวี dogfood — ยังไม่ตี tag, เลขยังไม่กำหนด
- v1.19 (2026-08-22): เพิ่ม+ปิด P4d (tag `v1.5.0`) — FR-FRIEND-1 (Friends tab) เสร็จ dogfood ผ่านครบ 7 ข้อ
  ไม่มี DF — P5 เลื่อนเป็น `v1.6.0`
- v1.18 (2026-08-21): ปิด P4c (tag `v1.4.0`) — วี dogfood ผ่านครบ 8 ข้อ ไม่มี DF เหลือ, ยังไม่เริ่ม phase
  ถัดไป — เพิ่ม backlog BL-14 (in-app notification badge), ปรับขอบเขต BL-09 เป็น 2 ส่วน (ดู PROJECT_BIBLE
  §7)
- v1.17 (2026-08-21): FR-FOOD-9 + FR-DIARY-4 code-complete+deploy+migration รันแล้ว — P4c รอวี dogfood
  ก่อนตี tag `v1.4.0`
- v1.16 (2026-08-21): เพิ่ม P4c (tag `v1.4.0`, คำสั่งวี) — BL-12/FR-FOOD-9 (ขออาหารใหม่ในแอป, งานแรก) +
  BL-01/FR-DIARY-4 (ราคาต่อ entry) — เป็น feature ตาม semver ไม่ใช่ patch (ตาราง+หน้าใหม่ 2 หน้า) จึงใช้
  v1.4.0 แทน v1.3.1 ที่เสนอไว้ก่อนหน้า — P5 เลื่อนเป็น `v1.5.0`, BL-09 ผูกเกณฑ์ตัดสินกับผลใช้งาน BL-12
- v1.15 (2026-08-21): ปิด P4b (tag `v1.3.0`) — วี dogfood FR-CALC-5/BL-10 ผ่านครบ, BL-09 ยังไม่ตัดสินใจ
  ลำดับ phase ถัดไป
- v1.14 (2026-08-21): FR-CALC-5 (BL-10) code-complete+deploy+migration รันแล้ว — P4b รอวี dogfood ก่อน
  ตี tag `v1.3.0`
- v1.13 (2026-08-21): เลื่อน FR-HLTH-3 client (Shortcut #2) + FR-ANLT-1 ออกจาก P4b เป็น backlog BL-13
  (คำสั่งวี, ยังไม่พร้อมลงเวลาต่อ Shortcut) — P4b เหลือ BL-10 เป็นงานหลัก ปิด phase ได้โดยไม่ต้องรอ BL-13
- v1.12 (2026-08-21): FR-HLTH-3 backend เสร็จ+deploy+migration รันแล้ว — เหลือต่อ Shortcut #2 จริงก่อนปิด FR
- v1.11 (2026-08-21): สลับลำดับ P4b (คำสั่งวี) — FR-HLTH-3 ทำก่อน BL-10/FR-ANLT-1 เพราะเวลาสะสมข้อมูล
  เร่งไม่ได้; BL-10 ตัดขอบเขต reminder ตามเวลา (push) ออกไปทำทีหลัง FR-HLTH-3, เหลือแค่ visual cue ในเฟสนี้
- v1.10 (2026-08-21): ปิด P4a (tag `v1.2.0`) — วี dogfood ผ่านครบทุกข้อ, เริ่ม P4b
- v1.9 (2026-08-20): BL-08 (FR-DASH-1, Dashboard tab) code-complete — P4a เขียนโค้ดครบทุกข้อแล้ว (BL-11,
  D-019, D-023 ยกเลิก, BL-08) เหลือแค่วี dogfood 2-3 วันตาม Phase Gate Rule ก่อนตี tag `v1.2.0`
- v1.8 (2026-08-20): BL-11 ปิดสมบูรณ์ (ถอด instrumentation) — P4a เหลือ BL-08 เป็นงานสุดท้ายก่อนตี tag
  `v1.2.0`
- v1.7 (2026-08-20): D-023 (AI Import) ยกเลิกถาวรหลังวัดผลจริง — แทนที่ด้วย BL-12 (ขออาหารใหม่ในแอป,
  ยังไม่กำหนด phase) — P4a เหลือ BL-08 เป็นงานถัดไป
- v1.6 (2026-08-19): BL-11 เสร็จ + deploy แล้ว — P4a เหลือแค่ D-023 (รอผลรีวิว research doc)
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
