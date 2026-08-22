# 00_START_HERE — Vmacro

> Entry point สำหรับทุก session (มนุษย์หรือ Claude Code) ห้ามเริ่มงานก่อนอ่านไฟล์ตามลำดับนี้

## โปรเจกต์นี้คืออะไร

**Vmacro** — Personal macro tracking PWA สำหรับวีและเพื่อนสนิท (≤5 users)
คำนวณ TDEE/เป้า macro, บันทึกอาหารรายมื้อ (FatSecret API + Thai custom food DB),
sync กับ Apple Health ผ่าน Shortcuts bridge และวิเคราะห์ความสัมพันธ์อาหาร↔สุขภาพแบบขั้นบันได

- **Repo:** `vfullcycle/vmacro` (public) — PWA deploy ที่ `vfullcycle.github.io/vmacro`
- **Backend:** VPS ของวี (static IP) + Supabase

## โครงสร้าง repo (monorepo)

```
vmacro/
├── CLAUDE.md            ← กติกา Claude Code (ต้องอยู่ root — CC อ่านอัตโนมัติ)
├── .gitignore           ← ต้องมี .env ตั้งแต่ commit แรก
├── docs/
│   ├── 00_START_HERE.md
│   ├── PROJECT_BIBLE.md
│   ├── SCOPE.md
│   └── REQUIREMENTS.md
├── web/                 ← PWA (React + TypeScript + Vite)
├── server/              ← VPS proxy (FatSecret OAuth2, Health ingest, LLM insight)
├── supabase/            ← SQL migrations (schema + RLS) รันมือใน SQL Editor
└── shortcuts/           ← Shortcut definitions + คู่มือติดตั้ง
```

## ลำดับการอ่าน (บังคับ)

| ลำดับ | ไฟล์ | มีไว้ทำไม | ต้องอ่านเมื่อ |
|---|---|---|---|
| 1 | `CLAUDE.md` (root) | กติกาการทำงาน + git conventions | ทุก session |
| 2 | `docs/00_START_HERE.md` | จุดเริ่มต้น + สถานะโปรเจกต์ | ทุก session |
| 3 | `docs/PROJECT_BIBLE.md` | Vision, architecture, decisions, risks (single source of truth) | ทุก session |
| 4 | `docs/SCOPE.md` | ขอบเขต in/out + phases P0–P5 | ก่อนเริ่ม phase ใหม่ |
| 5 | `docs/REQUIREMENTS.md` | FR ทั้งหมด (frozen) | ตอน implement feature |

## สถานะปัจจุบัน

- **Docs version:** v1.15 (2026-08-22)
- **Phase ปัจจุบัน:** P4e จบแล้ว — FR-BADGE-1 (BL-21, achievement badges) code-complete+deploy+
  migration รันแล้ว 2026-08-22 รอวี dogfood, ยังไม่กำหนด phase/tag — ดู `docs/PROJECT_BIBLE.md` §7
  Backlog สำหรับรายการเต็มที่รอตัดสินใจ (BL-09 ส่วนที่ 2/BL-13/BL-15/BL-20)
- **P4e จบแล้ว, tag `v1.6.0`** (2026-08-22) — วี dogfood ผ่านครบทุกข้อ: BL-16/FR-FRIEND-2 (โพสต์ใน
  Friends feed, แยก "โพสต์"/"ความเคลื่อนไหว" หลัง dogfood พบปัญหา bulk import ดันโพสต์ตก), FR-FRIEND-3
  (activity events เชิงบวกล้วน 4 แบบ — พบ+แก้บั๊ก RLS ที่ `activity_events_select` ชน RLS ของ `profiles`
  เอง ทำให้ไม่มีใครเห็น event คนอื่นได้แม้เปิดแชร์อยู่ แก้ด้วย SECURITY DEFINER function
  `profile_shares_activity()`)
- **P4d จบแล้ว, tag `v1.5.0`** (2026-08-22) — วี dogfood ผ่านครบ 7 ข้อ ไม่มี DF: FR-FRIEND-1 (แท็บ
  "Friends" ใหม่ toolbar 5 ปุ่ม — feed อาหาร/จานใหม่พร้อมชื่อผู้สร้าง + คำขอของตัวเองที่ถูกตอบ +
  notification badge เช็คตอนเปิดแอปไม่ใช้ push) รวม BL-14 + BL-09 ส่วนที่ 1 — BL-09 ส่วนที่ 2
  (leaderboard ฯลฯ) ยังรอเกณฑ์เดิม, เพิ่ม backlog BL-15 (Web Push, ยังไม่ทำ)
- **P4c จบแล้ว, tag `v1.4.0`** (2026-08-21) — วี dogfood ผ่านครบ 8 ข้อ ไม่มี DF เหลือ: BL-12/FR-FOOD-9
  (ขออาหารใหม่ในแอป — status 3 แบบ, โน้ต admin ส่งกลับ requester, ไม่มี push — ถือเป็น prototype ของ BL-09
  ในตัว), BL-01/FR-DIARY-4 (ราคาต่อ diary entry, optional, ตกหล่นจาก P2 ตั้งแต่แรก) — ระหว่าง dogfood แยก
  Settings → System ส่วน day-type/meal-target เป็น 2 หน้าใหม่ ("เป้าตามประเภทวันฝึก", "เป้าต่อมื้ออาหาร")
- **P4b จบแล้ว, tag `v1.3.0`** (2026-08-21) — วี dogfood ผ่านครบ (5 ข้อ + 2 ข้อเพิ่มเอง): FR-CALC-5/BL-10
  (per-meal targets จาก wake_time/sleep_hours_target, % ต่อมื้อปรับได้, remaining-based display เป็น
  progress bar สี — โทนข้อเท็จจริงล้วนไม่มีคำตัดสิน, แสดงเฉพาะวันนี้เท่านั้น) — FR-HLTH-3 client
  (Shortcut #2) และ FR-ANLT-1 ถูกเลื่อนออกจาก P4b ระหว่างทาง (2026-08-21, วีตัดสินใจ) ไปเป็น backlog BL-13
  — server ฝั่ง FR-HLTH-3 เสร็จ+deploy+migration แล้ว คงไว้เฉยๆ พร้อมหยิบต่อได้ทันที (API contract ที่
  `docs/shortcuts/shortcut-2-read.md`)
- **P4a จบแล้ว, tag `v1.2.0`** (2026-08-21) — วี dogfood ผ่านครบตาม Phase Gate Rule: BL-11 (search UX,
  ปิดสมบูรณ์รวมถอด instrumentation), D-019/FR-CALC-4 (day-type energy target), D-023/AI Import
  (**ยกเลิกถาวรหลังวัดผลจริง** — แทนที่ด้วย BL-12 ยังไม่กำหนด phase), BL-08/FR-DASH-1 (Dashboard tab แทน
  Weight tab, ใช้ shared hook `useTodayTarget()` ร่วมกับ Diary, + amendment ระหว่าง dogfood: composition
  ring P/F/C/OTH, breakout ring nutrient อื่น, date-nav — พบ+แก้บั๊กจริงระหว่าง dogfood ที่ ring ใช้
  `serving_size_g` เป็นฐานผิด ดู REQUIREMENTS.md FR-DASH-1 §แก้ไขซ้ำ) — ดู `docs/SCOPE.md` §P4a และ
  `docs/PROJECT_BIBLE.md` §Decision Log (D-019, D-023) สำหรับรายละเอียดเต็ม
- **P2 จบแล้ว, tag `v1.0.0`** — FR ทุกตัวเขียนโค้ดเสร็จ (FR-FOOD-1..6, FR-DIARY-1..3)
  รวม FR-DIARY-3 (copy จากวันก่อนหน้า ทั้งวัน/รายมื้อ, รายการโปรด, รายการล่าสุด) **ปิดโดย exception ของ
  Phase Gate Rule (D-024, 2026-08-19)** — ไม่รอ manual dogfood ครบ 2-3 วันตามเกณฑ์ปกติ เพราะเป็น
  shortcut ลด friction ล้วน ความเสี่ยงต่ำกว่า feature ที่แตะ core data path โดยตรง บั๊กที่เจอภายหลัง
  จากการใช้จริงจะแก้เป็น patch (`v1.0.x`) แทนที่จะบล็อก tag ไว้รอ
- **P3 (Apple Health WRITE) จบแล้ว (core), tag `v1.1.0`:** FR-HLTH-1/2 — เริ่มก่อนคิวตาม exception ที่วี
  อนุมัติ (D-021, 2026-08-14) **core 4 (kcal/protein/carb/fat) เสร็จ + ยืนยันทำงานจริงบนเครื่องแล้ว
  (2026-08-18)** ผ่าน Shortcut #1 + ปุ่ม "ซิงก์เข้า Apple Health" ในหน้า Diary — extended nutrients
  (12 field เพิ่ม) เป็น backlog ยาว (BL-07) รอ core ทุกอย่างจบก่อนค่อยกลับมาทำ, day-type energy target
  (BL-05/D-019) ไม่ได้เข้า P3 นี้ — เลื่อนไป P4 ตามร่างแผน P4a/P4b ที่รอเสนอวี
- **P0:** จบแล้ว, tag `v0.1.0` — R-01/R-02 ปิด, ดูรายละเอียดใน PROJECT_BIBLE §Risks
- **P1:** จบแล้ว, tag `v0.2.0` — TDEE/macro engine (unit test 18 เคส), Supabase auth + routing,
  Settings/Profile (FR-PROF-1), Settings/System (FR-SET-1), weight log + กราฟ (FR-PROF-2), guest calculator
  `/calculator` (ไม่ต้อง login), mobile-first UI (iPhone 12 Pro Max+) — วี dogfood แล้ว ผ่านครบ ไม่มีปัญหา
- **Backlog (R-07):** ปิดแล้ว — เปิด public food search ผ่าน D-012 ตอนวางแผน P2
- **รู้ไว้:** พบ bug เดิมไม่เกี่ยวกับ Vmacro บน VPS 2 จุด — `persiq.net`/`ssdhr.persiq.net` certbot renewal พังอยู่ (แยกแก้ทีหลัง ไม่ block Vmacro)

## Six-Layer Funnel ที่ใช้สร้างชุดเอกสารนี้

Vision → Boundary → Requirement → Decision → Freeze → Working Rules
(รายละเอียดแต่ละชั้นกระจายอยู่ใน PROJECT_BIBLE / SCOPE / REQUIREMENTS / CLAUDE.md ตามหน้าที่)

## กติกาแก้เอกสาร

- REQUIREMENTS.md ถูก **freeze** — แก้ได้เฉพาะวีสั่ง และต้อง bump version + บันทึกใน changelog ท้ายไฟล์
- Decision ใหม่ทุกตัวต้องลงทะเบียนใน PROJECT_BIBLE §Decision Log ก่อน implement
- ห้าม Claude Code "ตีความเพิ่ม" requirement ที่กำกวม — ให้ถามวีก่อนเสมอ

## Changelog

- v1.15 (2026-08-22): FR-BADGE-1 (achievement badges, BL-21) code-complete+deploy+migration รันแล้ว
  รอวี dogfood — ยังไม่กำหนด phase/tag
- v1.14 (2026-08-22): เพิ่ม+ปิด P4e (tag `v1.6.0`) — BL-16/FR-FRIEND-2 + FR-FRIEND-3 วี dogfood ผ่านครบ
  ทุกข้อ รวมแก้บั๊ก RLS ที่พบระหว่างทาง (`activity_events_select` ชน RLS ของ `profiles` เอง)
- v1.13 (2026-08-22): เพิ่ม P4e (Friends: posts + activity events) ระหว่างทาง — BL-16/FR-FRIEND-2 dogfood
  ผ่าน+แก้ design issue (แยกโพสต์/ความเคลื่อนไหว), FR-FRIEND-3 code-complete+deploy+migration รันแล้ว
  รอวี dogfood — ยังไม่ตี tag
- v1.12 (2026-08-22): เพิ่ม+ปิด P4d (tag `v1.5.0`) — FR-FRIEND-1 (Friends tab) วี dogfood ผ่านครบ 7 ข้อ
  ไม่มี DF, ปิด BL-14, เพิ่ม BL-15 (Web Push, ยังไม่ทำ) — P5 เลื่อนเป็น `v1.6.0`
- v1.11 (2026-08-21): ปิด P4c (tag `v1.4.0`) — วี dogfood BL-12/BL-01 ผ่านครบ 8 ข้อ, ยังไม่เริ่ม phase
  ถัดไป — เพิ่ม BL-14 (notification badge) + ปรับขอบเขต BL-09 เป็น 2 ส่วนใน backlog
- v1.10 (2026-08-21): ปิด P4b (tag `v1.3.0`) — วี dogfood FR-CALC-5/BL-10 ผ่านครบ, ยังไม่เริ่ม phase ถัดไป
  (รอวีตัดสินใจร่วมกับที่ปรึกษาว่าจะหยิบอะไรจาก backlog มาทำต่อ)
- v1.9 (2026-08-21): ปิด P4a (tag `v1.2.0`) — วี dogfood ผ่านครบทุกข้อ (รวม amendment ring composition
  ที่พบ+แก้บั๊กจริงระหว่างทาง), เริ่ม P4b: งานแรก FR-HLTH-3
- v1.8 (2026-08-20): อัปเดตสถานะ P4a (เคย stale ค้างว่า "รอเสนอวี" ทั้งที่ตัดสินใจและเขียนโค้ดไปแล้วทั้งช่วง)
  — BL-11/D-019/D-023/BL-08 เขียนโค้ดครบ, D-023 (AI Import) ยกเลิกถาวร, รอ dogfood ก่อนตี tag `v1.2.0`
- v1.7 (2026-08-19): ปิด P2 (tag `v1.0.0`) และ P3 core (tag `v1.1.0`) — วีอนุมัติ exception ของ Phase
  Gate Rule ไม่รอ FR-DIARY-3 dogfood ครบ 2-3 วัน (D-024) เพราะความเสี่ยงต่ำ, บั๊กที่เจอทีหลังจะแก้เป็น
  patch แทน ดู `docs/PROJECT_BIBLE.md` D-024 สำหรับเหตุผลเต็ม
- v1.6 (2026-08-18): FR-DIARY-3 เสร็จ (copy จากวันก่อนหน้า, รายการโปรด, รายการล่าสุด) — P2 ครบทุก FR แล้ว
  รอ dogfood 2-3 วันตาม Phase Gate Rule ก่อนตี tag `v1.0.0`
- v1.5 (2026-08-18): FR-HLTH-1 core 4 ยืนยันทำงานจริง + extended nutrients (BL-07) เป็น backlog ยาว
- v1.4 (2026-08-14): แก้สถานะที่ stale (เคยเขียนว่า "P1 จบแล้ว" ทั้งที่ P2 ทำอยู่จริง) — อัปเดตเป็น P2
  in-progress + FR-DIARY-3 ค้าง + FR-HLTH-1/2 เริ่มก่อนคิวตาม D-021, ปิด backlog R-07
- v1.3 (2026-08-11): P1 จบ — tag `v0.2.0`, อัปเดตสถานะ + backlog R-07
- v1.1 (2026-08-11): ย้ายเข้าโครง monorepo — CLAUDE.md อยู่ root, docs อยู่ `docs/`, เพิ่มข้อมูล repo/URL
- v1.0 (2026-08-11): สร้างครั้งแรก
