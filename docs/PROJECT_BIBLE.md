# PROJECT_BIBLE — Vmacro v1.1

> Single source of truth ของโปรเจกต์ ถ้าไฟล์อื่นขัดกับไฟล์นี้ ให้ยึดไฟล์นี้แล้วแจ้งวีเพื่อ sync

---

## 1. Vision

แอปติดตาม macro ส่วนตัวที่ตอบโจทย์ที่แอปตลาดไม่มีให้ครบ: อาหารไทย + Apple Health sync
+ ปรับสูตรคำนวณได้ + วิเคราะห์อาหารเทียบข้อมูลสุขภาพ ใช้งานโดยวีเป็นหลัก และเพื่อนสนิทรวมไม่เกิน 5 คน
ไม่ใช่ product เชิงพาณิชย์ — optimize เพื่อการใช้จริงรายวันและลด friction ในการบันทึกให้ต่ำที่สุด

## 2. Users

| Persona | จำนวน | ลักษณะ |
|---|---|---|
| วี (owner/admin) | 1 | เทรนสม่ำเสมอ (เวท/Zumba/Hyrox), ใช้ Apple Watch, ต้องการข้อมูลเชิงวิเคราะห์ |
| เพื่อนสนิท | ≤4 | ใช้บันทึกอาหารทั่วไป, ได้ประโยชน์จาก Thai food DB ที่ทุกคนช่วยกันสร้าง |

Onboarding แบบ invite-only ผ่าน Supabase Auth — ไม่มี public sign-up

## 3. System Architecture

```
┌─────────────────────────────┐
│  PWA (React/TS/Vite)        │  GitHub Pages: vfullcycle.github.io/vmacro
│  - UI, TDEE engine, diary   │  (repo public, HTTPS)
└──────┬──────────────┬───────┘
       │ HTTPS        │ HTTPS (supabase-js)
       ▼              ▼
┌──────────────┐  ┌──────────────────────┐
│ VPS Proxy    │  │ Supabase             │
│ 150.95.85.219│  │ - Auth (invite only) │
│ + domain/TLS │  │ - Postgres + RLS     │
│ - FatSecret  │  │   users/foods/dishes │
│   OAuth2 +   │  │   diary/health/      │
│   token cache│  │   settings           │
│ - Health data│  └──────────────────────┘
│   ingest API │
│ - (later) LLM│
│   insight    │
└──────┬───────┘
       │ OAuth2 client credentials (static IP → ผ่าน IP whitelist)
       ▼
  FatSecret Platform API (Premier Free, US dataset)

Apple Health (iPhone/Watch)
  ▲ เขียน f/c/p/kcal          │ อ่าน workout/HR/active energy
  │                            ▼
  Shortcuts bridge (2 ตัว, แจกผ่าน iCloud link, user ติดตั้งครั้งเดียว/เครื่อง)
  Shortcut #1 WRITE: ดึงยอดวันจาก VPS API → Log Health Sample
  Shortcut #2 READ: query Health samples → POST ไป VPS ingest endpoint
```

หลักการแบ่งหน้าที่: **client โง่เรื่อง secret, ฉลาดเรื่องคำนวณ** — TDEE/macro engine อยู่ฝั่ง client ทั้งหมด
(pure functions, test ง่าย), ส่วนที่แตะ credential หรือ IP-sensitive อยู่ VPS เท่านั้น

## 4. Data Model (ระดับ concept — schema จริง define ตอน P0)

| Table | สาระสำคัญ |
|---|---|
| `profiles` | sex, birth_date, height, weight (log ล่าสุด), body_fat_pct (nullable), activity_level, goal (lose/maintain/gain), formula_choice |
| `custom_foods` | อาหาร/วัตถุดิบที่ user สร้าง — **creator_id ผูกทุก record**, ค้นหาเจอได้ทุก user (D-002), แก้/ลบได้เฉพาะ creator |
| `dishes` | จานประกอบจากหลาย ingredient (custom หรือ FatSecret snapshot) พร้อม serving แปลงหน่วย, รวม macro อัตโนมัติ |
| `diary_entries` | บันทึกต่อมื้อ/วัน อ้าง food/dish + quantity, เก็บ macro snapshot ณ เวลาบันทึก (กัน food ต้นทางถูกแก้ทีหลัง) |
| `meal_templates` | ชุดมื้อซ้ำ + favorites/recent สำหรับ FR-DIARY-3 |
| `health_samples` | workout, HR, active energy ที่ ingest จาก Shortcut #2 (ผูก user, timestamp, source) |
| `weight_logs` | ประวัติน้ำหนัก (แยกจาก profile เพื่อทำ trend) |

RLS หลัก: ข้อมูลส่วนตัว (diary, health, profile, weight) เห็นเฉพาะเจ้าของ /
`custom_foods` และ `dishes` ที่ mark shared: อ่านได้ทุก user, เขียนได้เฉพาะ creator

## 5. Decision Log

| ID | Decision | เหตุผล | วันที่ |
|---|---|---|---|
| D-001 | ใช้ FatSecret Premier Free (unlimited calls, US dataset) และแสดง fatsecret attribution ใน UI | ได้ premium features ฟรี แลกกับ attribution ตามเงื่อนไข tier | 2026-08-11 |
| D-002 | Thai custom food DB เป็น **core feature** ไม่ใช่ fallback — ทุก record ผูก creator_id และ user อื่นค้นหาเจอได้ | US dataset ไม่มีอาหารไทย + ให้กลุ่ม ≤5 คนช่วยกันสร้างฐานข้อมูลสะสม | 2026-08-11 |
| D-003 | Backend proxy รันบน VPS (150.95.85.219) แทน Cloudflare Worker | Static IP ผ่าน FatSecret IP whitelist ได้แน่นอน + วีมี infra อยู่แล้ว | 2026-08-11 |
| D-004 | DB + Auth ใช้ Supabase (Postgres, RLS, invite-only) | รองรับ shared food DB ข้าม user + วีมีประสบการณ์จาก Dog Seizure Tracker | 2026-08-11 |
| D-005 | Apple Health เชื่อมผ่าน Shortcuts bridge 2 ตัว แจก iCloud link, user ติดตั้ง+grant สิทธิ์เองครั้งเดียวต่อเครื่อง | Apple ไม่มี API ให้ระบบสร้าง shortcut ระยะไกล — นี่คือ friction ต่ำสุดที่ทำได้ | 2026-08-11 |
| D-006 | Analysis แบบขั้นบันได: stats/correlation → LLM insight (ผ่าน VPS) → ML จริงเมื่อข้อมูล ≥3–6 เดือน | ข้อมูล 1 คนช่วงแรกน้อยเกินกว่า ML จะไม่ overfit | 2026-08-11 |
| D-007 | TDEE 3 สูตร: Mifflin-St Jeor (default), Katch-McArdle (ต้องมี body fat %), Harris-Benedict revised — macro split แบบ protein g/kg ตาม goal → fat floor % → carb เป็นตัวเหลือ | Mifflin แม่นสุดสำหรับคนทั่วไป, Katch เหมาะคนเทรนที่รู้ LBM, แนวทาง split ตรงหลัก sport science | 2026-08-11 |
| D-008 | Frontend host บน GitHub Pages, repo public, secret ทั้งหมดอยู่ VPS env เท่านั้น | ตามความต้องการวี + zero hosting cost ฝั่ง client | 2026-08-11 |
| D-009 | VPS ต้องมี domain + TLS (Let's Encrypt) ก่อนเชื่อมกับ PWA | GitHub Pages เป็น HTTPS — เรียก http:// ตรงจะโดน browser block (mixed content) | 2026-08-11 |
| D-010 | Monorepo เดียวชื่อ `vmacro` (owner: vfullcycle) โครง `docs/ web/ server/ shortcuts/`, CLAUDE.md อยู่ root — git: trunk-based บน `main`, Conventional Commits อ้าง FR ID, tag semver ผูก phase gate (v0.1.0=P0 ... v1.0.0=P2) | Solo dev: repo เดียวลด overhead และ Claude Code เห็นภาพรวมจากที่เดียว, tag ผูก gate ทำให้ version สื่อความคืบหน้าจริง | 2026-08-11 |

## 6. Risks & Open Questions

| ID | Risk | Impact | Mitigation | สถานะ |
|---|---|---|---|---|
| R-01 | FatSecret IP whitelist อาจมีเงื่อนไขเพิ่มนอกจาก IP เดี่ยว | P0 block | ทดสอบ OAuth2 token request จาก VPS เป็นงานแรกของ P0 | เปิด |
| R-02 | ยังไม่มี domain ชี้ VPS + TLS | PWA เรียก API ไม่ได้ | จัด domain (subdomain ที่มีอยู่ก็ได้) + certbot ใน P0 | เปิด |
| R-03 | Shortcuts ไม่มี background sync แท้จริง | Health data ไม่ real-time | ยอมรับ manual run / time-based automation — ระบุใน SCOPE เป็น constraint | ยอมรับแล้ว |
| R-04 | Serving size ข้อมูล US (oz, cup) vs การใช้จริงของวี (กรัม) | UX บันทึกช้า | Unit conversion layer + default กรัมสำหรับ custom foods | เปิด |
| R-05 | Repo public — ความเสี่ยง secret หลุด | สูงมาก | Secret hygiene ใน CLAUDE.md + `.env` อยู่ VPS เท่านั้น + `.gitignore` ตั้งแต่ commit แรก | ควบคุมแล้ว |
| R-06 | attribution ของ fatsecret หายจาก UI โดยไม่ตั้งใจ (refactor) | ผิดเงื่อนไข tier | ใส่เป็น permanent component + ห้ามลบใน CLAUDE.md | ควบคุมแล้ว |

## 7. Naming (ยุติแล้ว — D-010)

- **Display name:** Vmacro — V ตัวเดียวเข้าชุดแบรนด์ vfullcycle
- **Repo:** `vfullcycle/vmacro` → PWA URL: `vfullcycle.github.io/vmacro`
- **GitHub topics:** nutrition-tracker, macros, tdee, pwa, react, typescript, supabase, fatsecret-api, apple-health

---

## Changelog

- v1.1 (2026-08-11): เพิ่ม D-010 (monorepo + git conventions), ยุติ §7 Naming, อัปเดต architecture ให้ระบุ URL จริง
- v1.0 (2026-08-11): สร้างครั้งแรกหลัง freeze decisions D-001–D-009
