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

- **Docs version:** v1.2 (2026-08-11)
- **Phase ปัจจุบัน:** P0 (Infra Spike) — **จบแล้ว, tag `v0.1.0`** — ถัดไปคือ P1 (Profile & Engine)
- **R-01 (FatSecret IP whitelist):** ปิดแล้ว 2026-08-11
- **R-02 (domain + TLS):** ปิดแล้ว 2026-08-11 — `https://vmacro.persiq.net`, cert renewal ยืนยันด้วย `certbot renew --dry-run` แล้ว
- **P0 gate:** ใช้ข้อยกเว้นตาม `docs/SCOPE.md` §Phase Gate Rule (P0 ไม่มี dogfood surface จริง) — ตี tag ทันทีหลัง risk ปิดครบ + พิสูจน์ residual risk ด้วย test แทนเวลา (token cache refresh, cert renewal dry-run)
- **รู้ไว้:** พบ bug เดิมไม่เกี่ยวกับ Vmacro บน VPS 2 จุด — `persiq.net`/`ssdhr.persiq.net` certbot renewal พังอยู่ (แยกแก้ทีหลัง ไม่ block Vmacro)
- **Session C1 ทำเสร็จ:** repo init, FatSecret OAuth2 proxy (`server/`), Supabase schema v1 + RLS + invite วีเป็น user แรก, PWA skeleton deploy GitHub Pages เรียก proxy สำเร็จ end-to-end, REQUIREMENTS bump เป็น v1.1 (nutrients jsonb, D-011)

## Six-Layer Funnel ที่ใช้สร้างชุดเอกสารนี้

Vision → Boundary → Requirement → Decision → Freeze → Working Rules
(รายละเอียดแต่ละชั้นกระจายอยู่ใน PROJECT_BIBLE / SCOPE / REQUIREMENTS / CLAUDE.md ตามหน้าที่)

## กติกาแก้เอกสาร

- REQUIREMENTS.md ถูก **freeze** — แก้ได้เฉพาะวีสั่ง และต้อง bump version + บันทึกใน changelog ท้ายไฟล์
- Decision ใหม่ทุกตัวต้องลงทะเบียนใน PROJECT_BIBLE §Decision Log ก่อน implement
- ห้าม Claude Code "ตีความเพิ่ม" requirement ที่กำกวม — ให้ถามวีก่อนเสมอ

## Changelog

- v1.1 (2026-08-11): ย้ายเข้าโครง monorepo — CLAUDE.md อยู่ root, docs อยู่ `docs/`, เพิ่มข้อมูล repo/URL
- v1.0 (2026-08-11): สร้างครั้งแรก
