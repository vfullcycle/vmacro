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

- **Docs version:** v1.5 (2026-08-18)
- **Phase ปัจจุบัน:** P2 (Food & Diary) — กำลังทำอยู่ FR-FOOD-1..6/FR-DIARY-1/2 เสร็จแล้ว, **FR-DIARY-3 ค้างไว้**
  (เลื่อนหลัง FR-HLTH-1/2 ตาม D-021) — ยังไม่ตี tag `v1.0.0` จนกว่า FR-DIARY-3 จะเสร็จ + dogfood ผ่านตาม
  Phase Gate Rule
- **P3 (Apple Health WRITE) เริ่มก่อนคิวแล้ว:** FR-HLTH-1/2 — exception ที่วีอนุมัติ (D-021, 2026-08-14)
  **core 4 (kcal/protein/carb/fat) เสร็จ + ยืนยันทำงานจริงบนเครื่องแล้ว (2026-08-18)** ผ่าน Shortcut #1 +
  ปุ่ม "ซิงก์เข้า Apple Health" ในหน้า Diary — extended nutrients (12 field เพิ่ม) เป็น backlog ยาว (BL-07)
  รอ core ทุกอย่างจบก่อนค่อยกลับมาทำ
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

- v1.5 (2026-08-18): FR-HLTH-1 core 4 ยืนยันทำงานจริง + extended nutrients (BL-07) เป็น backlog ยาว
- v1.4 (2026-08-14): แก้สถานะที่ stale (เคยเขียนว่า "P1 จบแล้ว" ทั้งที่ P2 ทำอยู่จริง) — อัปเดตเป็น P2
  in-progress + FR-DIARY-3 ค้าง + FR-HLTH-1/2 เริ่มก่อนคิวตาม D-021, ปิด backlog R-07
- v1.3 (2026-08-11): P1 จบ — tag `v0.2.0`, อัปเดตสถานะ + backlog R-07
- v1.1 (2026-08-11): ย้ายเข้าโครง monorepo — CLAUDE.md อยู่ root, docs อยู่ `docs/`, เพิ่มข้อมูล repo/URL
- v1.0 (2026-08-11): สร้างครั้งแรก
