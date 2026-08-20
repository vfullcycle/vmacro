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

- **Docs version:** v1.8 (2026-08-20)
- **Phase ปัจจุบัน:** P4a เขียนโค้ดครบทุกข้อแล้ว (2026-08-20), รอวี dogfood 2-3 วันตาม Phase Gate Rule ก่อน
  ตี tag `v1.2.0`: BL-11 (search UX, ปิดสมบูรณ์รวมถอด instrumentation), D-019/FR-CALC-4 (day-type energy
  target), D-023/AI Import (**ยกเลิกถาวรหลังวัดผลจริง** — แทนที่ด้วย BL-12 ยังไม่กำหนด phase), BL-08/
  FR-DASH-1 (Dashboard tab แทน Weight tab, ใช้ shared hook `useTodayTarget()` ร่วมกับ Diary) — ดู
  `docs/SCOPE.md` §P4a และ `docs/PROJECT_BIBLE.md` §Decision Log (D-019, D-023) สำหรับรายละเอียดเต็ม
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
