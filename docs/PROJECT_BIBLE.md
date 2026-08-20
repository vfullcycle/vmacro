# PROJECT_BIBLE — Vmacro v1.25

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
| `profiles` | sex, birth_date, height, weight (log ล่าสุด), body_fat_pct (nullable), activity_level, goal (lose/maintain/gain), formula_choice, `display_name` (nickname สาธารณะ, default = local part ของ email, แก้เองได้ — D-016), `is_admin` (bool, seed เฉพาะวี — D-017) |
| `custom_foods` | อาหาร/วัตถุดิบที่ user สร้าง — **creator_id ผูกทุก record**, ค้นหาเจอได้ทุก user (D-002), แก้/ลบได้เฉพาะ creator — kcal/f/c/p เป็น typed column + `nutrients` jsonb เก็บ panel เต็ม (D-011), `is_verified` + `verified_source` (ตรวจสอบโดย admin เท่านั้น ผ่าน `set_food_verified()` — D-017) |
| `dishes` (+ `dish_ingredients`) | จานประกอบจากหลาย ingredient (custom หรือ FatSecret snapshot) พร้อม serving แปลงหน่วย, รวม macro+nutrients อัตโนมัติ, snapshot ไม่เปลี่ยนตามต้นทางเว้นแต่ creator กด "Recalculate from source" (D-011, FR-FOOD-3) |
| `diary_entries` | บันทึกต่อมื้อ/วัน อ้าง food/dish + quantity (serving count หรือกรัม, scale แบบ rule of three), เก็บ macro+nutrients snapshot ณ เวลาบันทึก (กัน food ต้นทางถูกแก้ทีหลัง) |
| `meal_templates` (+ `meal_template_items`) | ชุดมื้อซ้ำ + favorites/recent สำหรับ FR-DIARY-3 — private ต่อ user (ไม่ shared แบบ custom_foods/dishes) |
| `health_samples` | workout, HR, active energy ที่ ingest จาก Shortcut #2 (ผูก user, timestamp, source) |
| `weight_logs` | ประวัติน้ำหนัก (แยกจาก profile เพื่อทำ trend) |
| `favorites` | รายการโปรดต่อ user (custom_food/dish/fatsecret) สำหรับ FR-DIARY-3 — private ต่อ user |
| `food_translations` | cache คำแปล FatSecret food_name → ไทย (D-015) keyed by fatsecret_food_id, public read+insert |

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
| D-011 | Nutrient storage: ทุกตาราง food/dish/snapshot (`custom_foods`, `dishes`, `dish_ingredients`, `diary_entries`, `meal_template_items`) เก็บ kcal/protein/carbs/fat เป็น typed column หลัก + คอลัมน์ `nutrients` jsonb เก็บ panel เต็มเท่าที่ต้นทางให้มา (sat/trans/poly/mono fat, cholesterol, sodium, fiber, sugar, vitamins, minerals) — snapshot copy jsonb ไปด้วยทุกจุด. Dish snapshot คงที่หลัง save เว้นแต่ creator สั่ง "Recalculate from source" เอง (manual only, ไม่มี auto-update). ปริมาณ (FR-FOOD-1/FR-DIARY-1) กรอกได้ทั้งจำนวน serving หรือน้ำหนักจริง (g) แล้ว scale ทุก nutrient ตามสัดส่วนจาก serving ต้นทาง (rule of three) | typed column ให้ query/sort เร็วสำหรับ 4 ตัวหลักที่ใช้บ่อย (TDEE/diary summary), jsonb กันต้องแก้ schema ทุกครั้งที่ต้องการ nutrient เพิ่ม + รองรับข้อมูลไม่ครบจาก FatSecret ได้โดยไม่ต้อง NULL เกลื่อน; recalculate แบบ manual กันจานที่คนอื่นใช้ diary แล้วเปลี่ยนค่าย้อนหลังโดยไม่ตั้งใจ | 2026-08-11 |
| D-012 | Food search (FatSecret + custom foods) เปิด public ไม่ต้อง login — เพิ่ม RLS policy ให้ `anon` role `select` บน `custom_foods` ได้ (read-only) ส่วนเขียน/แก้/ลบ custom food, dish builder, diary, favorites, weight log, profile ยังต้อง login เหมือนเดิมทั้งหมด (ผูก auth.uid()/creator_id) | ปิด R-07 backlog — วีต้องการดู macro อาหารได้ทันทีไม่ต้องสมัครก่อน ลด friction ตอนค้นครั้งแรก, เขียนข้อมูลยังปลอดภัยเพราะ policy เปิดเฉพาะ select | 2026-08-12 |
| D-013 | **Research Gate**: feature ที่เข้าเกณฑ์ (ก) ผลลัพธ์เป็นการประมาณค่า/ทำนายที่ความแม่นยำเป็นสาระสำคัญของ feature หรือ (ข) มีคำถามเชิง algorithm ที่ถ้าตอบผิดจะรื้อ architecture ภายหลัง — ห้ามเริ่มโค้ดจนกว่ามี `docs/research/<topic>.md` ตอบครบ 5 ข้อ (1) ปัญหา+วรรณกรรมพร้อมอ้างอิง (2) benchmark ตัวเลขจริงจากงานอื่น (3) ทางเลือก 2-3 ทาง+trade-off (4) เพดานเชิงทฤษฎี (5) เกณฑ์สำเร็จ+แหล่ง ground truth — และวีอนุมัติแล้ว. งาน CRUD/UI/integration/สูตรที่มีมาตรฐานชัดไม่เข้า gate. Research doc ยาวไม่เกิน ~800 คำ/ไฟล์, freeze เป็น snapshot ณ เวลาอนุมัติ (ไม่ maintain ต่อ — ความรู้เปลี่ยนให้เปิด doc ใหม่อ้างของเก่า), ถ้า `docs/research/` มีเกิน 4 ไฟล์ให้ทักวีทบทวนว่า gate ถูกใช้ฟุ่มเฟือยหรือไม่ | กันเสีย effort implement feature เชิงประมาณ/ทำนายที่ยังไม่มีพื้นฐานเพียงพอ โดยไม่บล็อกงาน CRUD/UI ปกติด้วยกระบวนการที่หนักเกินจำเป็น | 2026-08-12 |
| D-014 | เปิดเผยชื่อ creator ของ custom food แบบปลอดภัย ผ่าน `get_display_name(profile_id)` — SECURITY DEFINER function คืนแค่คอลัมน์ `display_name` เท่านั้น ไม่แก้ RLS ของ `profiles` เลย (ยังเป็น owner-only ตาม FR-AUTH-1 สำหรับข้อมูลร่างกาย/เป้าหมายอื่นๆ) | FR-FOOD-2 AC บังคับ (frozen) ว่าต้องแสดงชื่อ creator บน custom food แต่ profiles RLS เดิมบล็อกทุกคนยกเว้นเจ้าของ — function bypass RLS เฉพาะช่องทางนี้ ปลอดภัยกว่าเปิด RLS ตรงๆ เพราะ query ได้แค่ display_name อย่างเดียว | 2026-08-12 |
| D-015 | Thai search/display สำหรับ FatSecret: proxy endpoint ใหม่ `/translate` เรียก Claude Haiku (`claude-haiku-4-5-20251001`) แปล food name เป็น batch เดียว — คำค้นไทยแปลเป็นอังกฤษก่อนยิง FatSecret, ผลลัพธ์ FatSecret แปลเป็นไทยสำหรับแสดงผล cache ถาวรในตาราง `food_translations` (keyed by fatsecret_food_id, public read+insert ไม่มี update/delete) กัน re-translate ซ้ำ. **(เพิ่ม 2026-08-13)** Cost ownership: ใช้ Anthropic API key ส่วนตัวของวี (prepaid credit) — key อยู่ใน `server/.env` บน VPS เท่านั้น ไม่มีทางหลุดฝั่ง client (ตาม secret hygiene เดิม). Guard: `/translate` ต้อง require auth — verify token ผ่าน Supabase `/auth/v1/user` (ไม่ใช่ user login = 401, ผลคือ anonymous search จาก D-012 เห็นเฉพาะชื่ออังกฤษ ไม่ได้แปลไทย) + rate limit ในหน่วยความจำต่อ user (20 req/นาที) กันยิงรัว/loop โดยไม่ตั้งใจ. Fallback: ทุก error จาก endpoint นี้ (credit หมด, rate limit, auth, network) client ต้อง**ไม่ error ให้ผู้ใช้เห็น** — fallback แสดงชื่ออังกฤษแทนเงียบๆ เสมอ (pattern ที่มีอยู่แล้วทุกจุดเรียก `translateTexts`) | custom_foods DB (D-002) เป็นภาษาไทยอยู่แล้ว แต่ FatSecret เป็น US dataset ล้วน (ยืนยันไม่มี native localization ตาม evidence note ใต้ D-002) — วีต้องการให้พิมพ์/เห็นภาษาไทยได้ทั้งสองแหล่ง ทางเลือก static dictionary ไม่พอเพราะต้องแปลชื่ออาหารนับพันแบบจาก FatSecret ไม่ใช่แค่คำค้นจำกัดจำนวน — เพิ่ม secret ใหม่ `ANTHROPIC_API_KEY` บน VPS. Auth guard + rate limit เพิ่มหลัง dogfood เพราะ endpoint เดิมเปิดไม่จำกัดสิทธิ์ ในขณะที่ค่าใช้จ่ายเป็นเงินส่วนตัววี — ต้องกันการใช้เกินควบคุมก่อนเปิดใช้งานจริงต่อเนื่อง | 2026-08-12, แก้ 2026-08-13 |
| D-016 | ระบบ nickname: `profiles.display_name` default = local part ของ email (ก่อน `@`) ตอน signup แทนที่จะเป็น email เต็ม — แก้ไขได้เองใน Settings → Profile | ชื่อเต็ม email หลุดไปแสดงต่อ user อื่นบน custom food ที่สร้าง (FR-FOOD-2) ไม่เหมาะกับความเป็นส่วนตัว แม้เป็นกลุ่มปิด ≤5 คน — nickname อ่านง่ายกว่าและ user ปรับเป็นชื่อจริงเองได้ถ้าต้องการ | 2026-08-13 |
| D-017 | Admin verification สำหรับ custom food: `custom_foods.is_verified` + `verified_source` (text, เช่น "Thai FCD v3") — set ได้เฉพาะผ่าน `set_food_verified()` (SECURITY DEFINER, เช็ค `profiles.is_admin` ฝั่ง server) วีเป็น admin คนเดียว (seed จาก email ตอน migration) ผู้สร้างอาหารเองยืนยันตัวเองไม่ได้ — badge (สีเขียว, รูปแบบเดียวกับ logo app) แสดงในผลค้นหา, แหล่งอ้างอิงแสดงเต็มในหน้า detail (ไม่ใช่ในผลค้นหาแบบย่อ เพราะพื้นที่จำกัด) | เพิ่ม quality layer ให้ shared custom food DB (D-002) — ข้อมูลที่ user คนไหนก็เพิ่มได้ ไม่มีการตรวจสอบเลยอาจมีความผิดพลาดสะสม; ให้ admin คนเดียวเป็นผู้ตรวจเพื่อกันคนอื่นยืนยันข้อมูลตัวเอง (self-verify) ซึ่งไม่มีความหมายเป็น quality signal | 2026-08-13 |
| D-018 | เพิ่ม **USDA FoodData Central (FDC)** เป็นแหล่งข้อมูลอาหารที่ 3 ต่อจาก FatSecret (D-001) และ custom food DB (D-002) — บทบาท: วัตถุดิบ generic คุณภาพแล็บ (Foundation Foods + SR Legacy) ใช้หลักใน dish builder (FR-FOOD-3) **ไม่แทนที่ FatSecret** (คนละบทบาท: FDC = generic ingredients, FatSecret = branded/restaurant). License public domain CC0 — แสดง citation "U.S. Department of Agriculture, FoodData Central, fdc.nal.usda.gov" ในหน้า attribution (USDA ขอร้องไว้ ไม่บังคับทางกฎหมาย แต่ให้). API key (`FDC_API_KEY`, วีสมัคร+วางใน `server/.env` แล้ว) เรียกผ่าน proxy ตาม pattern เดียวกับ FatSecret (D-003) ไม่มีทางหลุดฝั่ง client. Rate limit จริง 1,000 req/ชม./IP — จำกัดเฉพาะ submit search (ห้าม autocomplete/search-as-you-type) + cache ผลใน Supabase + log `X-RateLimit-Remaining` เพื่อ monitor. ผลลัพธ์ผ่าน Thai translation pipeline เดียวกับ FatSecret (D-015). ~~Timing เดิม: งานแรกหลัง FR-DIARY-2/3 จบ~~ — เสียบเป็น source เพิ่มในหน้าค้นหาโหมด `forDish` ที่มีอยู่แล้ว ไม่ใช่รื้อโครง. **(แก้ 2026-08-19)** Timing เปลี่ยนเป็น "เมื่อมี user ติดขัดจริง" — D-023 (AI Import) ครอบ use case เดียวกัน (วัตถุดิบ generic ที่หาไม่เจอใน FatSecret) ได้ตรงกว่า เพราะไม่ต้องรู้ชื่อ ingredient ล่วงหน้าเป็นภาษาอังกฤษ, FDC ยังไม่ถอน — คงไว้เป็น fallback เพราะไม่มีต้นทุน maintain เพิ่ม | Dish builder (FR-FOOD-3) ต้องการวัตถุดิบ generic (เช่น "chicken breast raw") ที่ FatSecret เป็น branded/restaurant-heavy ให้ไม่ครบ — FDC เป็น USDA lab-tested dataset เหมาะกว่าสำหรับวัตถุดิบดิบ/พื้นฐาน ลดภาระต้อง maintain custom food เองทุกรายการ, public domain ตัดปัญหา license | 2026-08-13, แก้ 2026-08-19 |
| D-019 | **(ออกแบบไว้ล่วงหน้า ยังไม่ implement — คิว P3)** Day-type energy target แก้ปัญหา TDEE แบบ static ที่เฉลี่ยการเทรนทั้งสัปดาห์ไม่ตรงการใช้พลังงานจริงรายวัน: (1) ตีความ Profile activity level ใหม่เป็น baseline ที่ไม่รวม exercise (เช่น sedentary/lightly active จากงานประจำเท่านั้น) (2) diary เพิ่ม day type ต่อวัน: rest/light/hard (เลือกได้ 1 tap, default = rest หรือค่าที่ user ตั้งไว้ล่วงหน้า) → เป้า kcal ของวันนั้น = baseline TDEE + allowance ตาม type (allowance ตั้งค่าได้ใน Settings → System, มี default แนะนำ) (3) macro split คำนวณใหม่ตามเป้าวันนั้น — protein คงที่ตาม g/kg น้ำหนักตัว (ตาม D-007), ส่วนต่างที่เพิ่ม/ลดจาก allowance ลงที่ carb เป็นหลัก (ตามหลัก training-day carbs) (4) schema เผื่อ P4: มี field พร้อมรับ active energy จริงจาก Apple Watch (FR-HLTH) มา override/ปรับ allowance อัตโนมัติในอนาคต โดยไม่ต้องรื้อโครงตอนนั้น. **(แก้ 2026-08-19)** Implement เป็น **FR-CALC-4** (P4a, ดู REQUIREMENTS.md)
— เพิ่มกติกา floor แบบไล่ลำดับชั้นที่ design เดิมไม่ได้ระบุ (กรณี allowance ติดลบมากจนสมการ f×9+c×4+p×4
= เป้า kcal ทำให้ macro ติดลบ): protein คงที่เสมอไม่ลดทุกกรณี → carb รับส่วนต่างก่อนจนถึง floor
`max(50g, 10%kcal)` → fat ขยับรับต่อจนถึง floor `max(0.5g/kg, 20%kcal)` → ชนทุก floor แล้วยังไม่พอ
ไม่บังคับสมการอีกต่อไป (เป้า kcal วันนั้น = ผลรวม floors จริง) + UI แจ้งเตือนให้ปรับ allowance/protein
— floor ทั้งสองตั้งค่าได้ใน Settings → System (มี default ตามที่ระบุ) | TDEE เดียวทั้งสัปดาห์ทำให้วันเทรนหนัก/วันพักได้เป้าเดียวกัน ไม่สะท้อนการใช้พลังงานจริง (nutrition periodization เป็นหลักปฏิบัติมาตรฐานสำหรับคนเทรน) — ออกแบบไว้ล่วงหน้าตอนนี้เพื่อให้ schema/mental model พร้อมสำหรับ P3 และเผื่อทางเชื่อมต่อ Apple Watch จริงใน P4 โดยไม่ต้องรื้อภายหลัง | 2026-08-13 |
| D-020 | Auth สำหรับ VPS endpoint ที่ Apple Shortcut (unattended, ไม่มี user login) เรียก: long-lived per-user API token — เก็บเฉพาะ hash ใน table ใหม่ `health_tokens`, generate/revoke ได้จาก Settings → System, verify ผ่าน `verify_health_token()` (`SECURITY DEFINER`, grant execute ให้ `anon`) — pattern เดียวกับ `get_display_name()` (D-014) และ `set_food_verified()` (D-017) คือเปิดช่องทางแคบๆ ผ่าน RPC แทนการเปิด RLS ตรงๆ หรือเอา service_role key ขึ้น VPS. คู่กับ `get_daily_totals()` (RPC เดียวกัน กลุ่มเดียวกัน) สรุปยอด diary ของ user+date นั้นให้ endpoint โดยไม่ต้องมี Supabase session จริง | Shortcut ต้อง "ติดตั้งครั้งเดียวใช้ได้ตลอด" (FR-HLTH-2) — Supabase JWT ปกติหมดอายุ ~1 ชม. ไม่เหมาะกับงานที่รันเองทุกวันแบบไม่มีคนคอยต่ออายุ token, opaque token คุมง่ายกว่า (revoke ได้ทันที) และไม่ต้องเพิ่ม secret ใหม่บน VPS เลย — token รั่วเปิดได้แค่อ่านยอดรวมรายวัน ไม่มีสิทธิ์เขียนหรือ table อื่น | 2026-08-14 |
| D-021 | **Exception ของ Phase Gate Rule**: อนุมัติให้ทำ FR-HLTH-1/2 (Apple Health WRITE, ปกติอยู่ P3) ก่อน FR-DIARY-3 (งานสุดท้ายที่เหลือของ P2) — วีกำลัง dogfood จริงบน iPhone อยู่ตอนนี้และอยากได้ Health sync เร็วกว่าคิวเดิม ส่วน FR-DIARY-3 เป็นแค่ shortcut ลด friction (copy-from-yesterday/recent/favorites) ไม่ block งานอื่นต่อ จึงเลื่อนไปทำหลัง FR-HLTH-1/2 แทน. **หมายเหตุสำคัญ:** การอนุมัตินี้ supersede ข้อความใน changelog v1.9 (2026-08-13) ที่ล็อกไว้ว่า "ไม่รับ FR ใหม่เพิ่มจนกว่าจะตี tag v1.0.0" — ล็อกเดิมมีไว้กัน scope creep ใหม่ๆ แทรกเข้า P2 เอง (เช่น BL-01..05) ไม่ใช่ห้ามสลับคิวไปทำงาน phase ถัดไปก่อนถ้าวีสั่งเองแบบนี้ ทั้งสองเรื่องแยกกัน ไม่ขัดกัน. FR-HLTH-1 ในบรรทัดนี้ยังถูกขยายขอบเขตเพิ่ม (extended nutrients best-effort) ตามคำสั่งวีเช่นกัน — ดู `docs/REQUIREMENTS.md` FR-HLTH-1 v1.5 | dogfooding คือ QA หลักของโปรเจกต์นี้ตาม Phase Gate Rule เอง — การได้ signal จริงจาก Health sync เร็วขึ้นมีค่ามากกว่าการรอให้ FR-DIARY-3 (convenience feature) เสร็จก่อนตามลำดับเดิม | 2026-08-14 |
| D-022 | **แก้ FR-HLTH-1 mechanism**: Core 4 (kcal/protein/carb/fat) ใน Shortcut #1 เปลี่ยนกลไกกัน sample เบิ้ลจาก "ลบของเก่าก่อนเขียนใหม่" (design เดิมใน D-020/D-021) เป็น **delta calculation**: หาผลรวมของ sample ที่มีอยู่แล้วของวันนี้ด้วย `Find Health Samples` (filter `Start Date is today`) → sum → เขียนแค่ส่วนต่าง (ยอดใหม่จาก Vmacro − ยอดที่มีอยู่แล้ว) ถ้าส่วนต่าง > 0 เท่านั้น — ไม่ log ถ้าส่วนต่าง ≤ 0 | ระหว่าง build Shortcut #1 จริงพบว่า Shortcuts ไม่มี action `Delete Health Sample` เลย (Apple ไม่เปิด API ลบ HealthKit sample ผ่าน Shortcuts) ทำให้ design เดิมทำไม่ได้ตามแผน — ประเมินทางเลือก native app แทนทั้งระบบด้วย (ดู BL-06) แต่ต้นทุนสูงเกินไปเทียบกับปัญหาเดียวนี้ delta approach ได้ idempotent เทียบเท่ากันโดยไม่ต้องพึ่ง delete, self-healing เมื่อรันซ้ำ, รองรับการแก้ diary entry ทีหลังถูกต้องอัตโนมัติ — ข้อจำกัดเดียว (เหมือนเดิมไม่ว่าวิธีไหน) คือลดยอดใน Health ไม่ได้ถ้ายอดจริงลดลงหลัง sync ไปแล้ว | 2026-08-16 |
| D-023 | เปลี่ยนขอบเขต BL-02 จาก "LLM recipe decomposition" เป็น **AI Import** + เลื่อนจาก P5 → P4 (research gate แบบเบา — เกณฑ์สำเร็จ/ground truth ตอบได้จาก pipeline จริงที่วีใช้อยู่แล้ว ไม่ต้องทำ research doc ยาวแบบเต็ม D-013): user ทุกคน (ไม่ใช่แค่ admin) ส่งชื่อ+ภาพ+ปริมาณ → Claude ผ่าน proxy (key เดียวกับ D-015) → คืน JSON ตาม schema เดียวกับ admin bulk-import เป๊ะ (ตัดค่า 0 ยกเว้น kcal/protein/carbs/fat) → หน้า preview ให้ user แก้ทุกค่าก่อน save → save ผ่านเส้นทาง create custom food ปกติ (creator = user คนนั้น, verification badge ตาม D-017 ปกติ). แยกชัดจาก admin bulk-import ซึ่งยังเป็น admin-only เหมือนเดิม ไม่เปิดกว้างขึ้น — AI Import คือตัวช่วยกรอกฟอร์มทีละรายการ ไม่ใช่ bulk write. หลักการบังคับ: LLM ไม่มีสิทธิ์เขียน DB ตรงในทุกกรณี ทำได้แค่ pre-fill ฟอร์ม — human verification โดยผู้สร้าง (preview+แก้เอง) เป็นขั้นตอนข้ามไม่ได้ ตามด้วย admin verification (D-017) เป็นชั้นที่สอง | วีแทบไม่ใช้ FatSecret จริง — workflow จริงที่ใช้อยู่คือให้ ChatGPT คำนวณ macro (อ้าง Thai FCD/USDA) ออกเป็น JSON แล้ววีตรวจเอง+import ผ่าน admin bulk-import อยู่แล้ว — AI Import ทำให้เพื่อนทุกคนได้ workflow เดียวกันในแอปโดยไม่ต้องออกจากแอป โดยไม่ลด governance ลงจากเดิม (LLM ไม่เขียน DB ตรง, human verify 2 ชั้นเหมือนเดิม) | 2026-08-19 |
| D-024 | **Exception ของ Phase Gate Rule (ครั้งที่ 2)**: ปิด P2 (ตี tag `v1.0.0`) โดยไม่รอ FR-DIARY-3 ผ่าน manual dogfood ครบ 2-3 วันตามเกณฑ์ปกติของ SCOPE.md — ตี `v1.1.0` (P3 core: FR-HLTH-1/2 core 4) ต่อทันทีในรอบเดียวกัน เพราะ core 4 ยืนยันทำงานจริงแล้ว (2026-08-18) | FR-DIARY-3 เป็น shortcut ลด friction ล้วน (copy-from-yesterday, favorites, recent) ไม่ใช่ core data path — ความเสี่ยงถ้ามีบั๊กต่ำกว่า feature ที่แตะ diary/macro โดยตรง วีตัดสินใจไม่บล็อกการปิด phase ไว้รอ, บั๊กที่เจอภายหลังจากการใช้จริงจะแก้เป็น patch (`v1.0.x`) แทน — สอดคล้องกับ pattern exception เดิม (D-021: สลับคิว P3 ก่อน P2 ระหว่าง dogfood) คือวีเป็นผู้อนุมัติ exception ของ gate ที่ตัวเองตั้งไว้ได้เสมอเมื่อประเมินความเสี่ยงแล้วว่าคุ้ม | 2026-08-19 |

### Evidence notes (ไม่ใช่ decision ใหม่ — บันทึกผลทดสอบสนับสนุน decision ที่มีอยู่)

- **D-002** (2026-08-11): ทดสอบจริงจาก VPS ด้วย token ที่ใช้งานอยู่ — ยิง `foods/search/v1` พร้อม `region=TH&language=th` เทียบกับไม่ใส่ region เลย ได้ผลลัพธ์เหมือนกันทุกตัวอักษร (ไม่ localize, ไม่ error) สอดคล้องกับเอกสาร FatSecret ที่ระบุว่า *"Localization is a premium feature only made available to select accounts for specific languages and regions"* — ยืนยันว่า account เราไม่มีสิทธิ์นี้ ต้องพึ่ง Thai custom food DB ตาม D-002 ต่อไป ไม่มีทางลัดจาก FatSecret

## 6. Risks & Open Questions

| ID | Risk | Impact | Mitigation | สถานะ |
|---|---|---|---|---|
| R-01 | FatSecret IP whitelist อาจมีเงื่อนไขเพิ่มนอกจาก IP เดี่ยว | P0 block | ทดสอบ OAuth2 token request จาก VPS เป็นงานแรกของ P0 | ปิดแล้ว (2026-08-11: `server/scripts/test-fatsecret-oauth.sh` รันบน VPS — ขอ token + `foods.search` สำเร็จ) |
| R-02 | ยังไม่มี domain ชี้ VPS + TLS | PWA เรียก API ไม่ได้ | จัด domain (subdomain ที่มีอยู่ก็ได้) + certbot ใน P0 | ปิดแล้ว (2026-08-11: `https://vmacro.persiq.net/health` ตอบ 200 จากภายนอก, TLS ผ่าน certbot, `vmacro-proxy` + apache2 enable ผ่าน systemd รอดข้าม reboot จริง — ระหว่างทางพบว่า apache2 เดิมตั้ง disabled มาก่อน ได้ enable แก้ให้ด้วย) |
| R-03 | Shortcuts ไม่มี background sync แท้จริง | Health data ไม่ real-time | ยอมรับ manual run / time-based automation — ระบุใน SCOPE เป็น constraint | ยอมรับแล้ว **(2026-08-15: วีขอ real-time ระหว่าง dogfood — ยืนยันอีกครั้งว่าทำไม่ได้จริงในกรอบ PWA+Shortcuts เพราะ HealthKit ไม่มี API ให้ web เขียนตรง ต้องผ่าน Shortcuts เท่านั้น และ Shortcuts เองไม่มี trigger แบบ "data เปลี่ยนแล้วรันทันที" — native app ที่จะทำ real-time ได้จริงก็อยู่ Out of Scope v1 อยู่แล้ว. ทางออกที่เลือกแทน: เพิ่มปุ่ม "ซิงก์เข้า Apple Health" ในหน้า Diary (deep link `shortcuts://run-shortcut`) ให้กดได้ทันทีหลังบันทึกแทนต้องรอ automation ตามเวลา — ยังเป็น manual trigger ไม่ใช่ real-time จริง แค่ลด friction ของการกดเอง, ดู `docs/shortcuts/shortcut-1-write.md`)** |
| R-04 | Serving size ข้อมูล US (oz, cup) vs การใช้จริงของวี (กรัม) | UX บันทึกช้า | Unit conversion layer + default กรัมสำหรับ custom foods | เปิด |
| R-05 | Repo public — ความเสี่ยง secret หลุด | สูงมาก | Secret hygiene ใน CLAUDE.md + `.env` อยู่ VPS เท่านั้น + `.gitignore` ตั้งแต่ commit แรก | ควบคุมแล้ว |
| R-06 | attribution ของ fatsecret หายจาก UI โดยไม่ตั้งใจ (refactor) | ผิดเงื่อนไข tier | ใส่เป็น permanent component + ห้ามลบใน CLAUDE.md | ควบคุมแล้ว |
| R-07 | (backlog, ตัดสินใจตอนเริ่ม P2) วีอยากค้นหา/ดู macro อาหารได้โดยไม่ต้อง login (ตอนนี้ FR-FOOD-1 ผูก auth ทั้งหมดเหมือน feature อื่น) — ตอน P1 เข้าใจผิดว่าหมายถึง TDEE calculator เลยทำ `/calculator` guest mode ไปก่อน (ยังใช้งานได้ แต่ไม่ตรงโจทย์นี้) | Friction สูงกว่าที่วีต้องการตอนค้นอาหารครั้งแรก | ปิดแล้ว (2026-08-12: D-012 — เปิด public search ผ่าน RLS policy ใหม่บน `custom_foods`) | ปิดแล้ว |

## 7. Backlog (ยังไม่เข้า FR)

รายการที่บันทึกไว้เพื่อพิจารณาตอนวางแผน phase ที่เกี่ยวข้อง — ยังไม่ผ่าน Six-Layer Funnel
เป็น FR จนกว่าวีจะสั่งเพิ่มใน `REQUIREMENTS.md`. รายการที่ tag `research-gated` เข้าเกณฑ์
D-013 (Research Gate) — ห้ามเริ่มโค้ดจนกว่ามี research doc ที่วีอนุมัติแล้ว

| ID | Phase | Tag | รายละเอียด |
|---|---|---|---|
| BL-01 | P2 | | diary entry เพิ่ม field ราคา (optional, บาท) — เก็บข้อมูลเพื่อ food cost analytics และสะสม dataset ศึกษาความสัมพันธ์ราคา↔ปริมาณในอนาคต ตอนวางแผน P2 ให้รวม field นี้เข้า scope เลย |
| BL-02 | P4a | research-gated (เบา) | **AI Import** — ดู D-023 สำหรับ design เต็ม (เดิมคือ "LLM recipe decomposition" ก่อน D-023 เปลี่ยนขอบเขต+เลื่อนจาก P5) — **(สถานะ 2026-08-19 รอบ 2)** เปลี่ยน metric validation จาก % เป็น absolute error ต่อ macro (kcal/g) ตามที่วีท้วง (% เบ้จากรายการค่าเล็ก) — รัน n=50: kcal median off 90kcal/avg 90.4kcal, protein median 4g, carbs median 4g, fat median 5g (p90 สูงกว่ามาก — kcal p90=198). แยกกลุ่มแบรนด์/บรรจุภัณฑ์ (n=9) vs อื่นๆ (n=41) ด้วยมือ: **ผลไม่ตรงสมมติฐานเดิมทั้งหมด** — median แบรนด์ (40kcal) ต่ำกว่า median กลุ่มอื่น (90kcal) จริง แต่ average แบรนด์สูงกว่า (100 vs 88) เพราะมี outlier รุนแรง (Betagen Pro พลาด fat 650%) ส่วน 2 ใน 3 อันดับ error หนักสุดกลับเป็นอาหารทั่วไป (หอยทอด, ผัดพริกแกงปลาดุก) ไม่ใช่แบรนด์ — สรุปคือ pattern ซับซ้อนกว่าที่คิด ไม่ใช่แค่ branded=แย่. เพิ่ม 2 ฟีเจอร์ตามที่วีสั่ง (ทั้งคู่ deploy แล้ว หลัง flag เดิม): **confidence range** (`ranges` ต่อ macro, preview แสดง "ช่วงประมาณ X–Y", ไม่กระทบ `custom_foods` schema) และ **`read_label` mode** (ถ่ายภาพฉลากบังคับ → โมเดล transcribe แทนประมาณ, prompt คนละชุดกับ `estimate` mode แต่ schema เดียวกัน) — รอ "รอบ C" (วัดใหม่ด้วย coverage+range-width metric) ก่อนตัดสินใจ threshold/เปิด flag — **(เพิ่ม 2026-08-19 ค่ำ)** วิเคราะห์ข้อมูล n=50 เดิมเพิ่ม 2 จุดโดยไม่ยิงโมเดลใหม่: (1) **signed bias ต่อ macro เล็กมาก ไม่ใช่ทางเดียว** — kcal mean +15.4/median +24 (เทียบ mean abs 90.4), protein/carbs ~0, fat +1.4/+2.25 — over/under ใกล้เคียงกัน (kcal: over 29, under 20) ไม่ใช่การเอนไปทางเดียวขนาดที่กลัวไว้ ผลคูณสะสม/วัน (สมมติ 5 มื้อ) ≈ +77kcal ไม่ใช่ 360-450kcal ตามที่กังวล (2) **สมมติฐาน "serving ตีความกำกวม" ถูกหักล้าง** — รายการที่ระบุกรัม/มล.ชัดเจน (n=23) error เฉลี่ย (98.9kcal) **สูงกว่า** รายการนับหน่วยกำกวม (n=27, 83.1kcal) และครึ่งหนึ่งของ 10 อันดับ error หนักสุดมี serving ระบุกรัมชัดอยู่แล้ว (Betagen 300g, หนังขาหมูพะโล้ 100g, เนื้อหมูสามชั้นดิบ 100g ฯลฯ) — สรุปคือปัญหาไม่ได้อยู่ที่การตีความปริมาณ. สังเกตเพิ่มเติมที่ยังไม่ได้ทดสอบเป็นทางการ: 7/10 อันดับ error หนักสุดเกี่ยวข้องกับของทอด/แบรนด์ (หอยทอด, ปลานิลทอด, ทาโกะยากิ, ผัดพริกแกงปลาดุกทอดกรอบ + สินค้าแบรนด์ 3 ตัว) — น้ำมันที่ดูดซับตอนทอดอาจเป็นแกนความแปรปรวนอีกจุดที่ประมาณจากชื่อไม่ได้ คล้ายกับ ceiling ของสินค้าแบรนด์ —
**(เพิ่ม 2026-08-20 รอบ 3)** deploy แล้ว 3 ฟีเจอร์ใหม่ (ยังหลัง `AI_IMPORT_ENABLED=false` เดิม): (1) คำถาม
วิธีปรุงแบบมีเงื่อนไข (`COOKING_METHODS`, trigger จาก keyword ในชื่อ, ต่อ prompt เฉพาะ mode `estimate`)
(2) validation script เพิ่ม metric error-เทียบ-dish-kcal (size-normalized, แก้จุดบอดที่ absolute error
โตตามขนาดจาน) + coverage/width ของ confidence range (3) within-item A/B test script สำหรับวิธีปรุง —
**ผลทดสอบ within-item (n=4, วีเลือกเอง) เป็นลบ**: คู่อ้างอิง อกไก่ทอด vs อกไก่จี่ (ต่างกันแค่วิธีปรุง)
ground truth ห่างกัน kcal+25/fat+3.4g — โมเดล *ไม่ใส่* cookingMethod ห่างกัน kcal+60/fat+4.8g (เกินจริง
อยู่แล้ว) แต่พอ *ใส่* cookingMethod กลับห่างกัน kcal+127.5/fat+12.5g (เกินจริงไปเกือบ 5 เท่าของจริง) —
สรุปคือ field วิธีปรุงทำให้แย่ลงกับ 2/4 รายการ (โดยเฉพาะรายการที่ควรได้ประโยชน์ที่สุด: ทอด/ผัด) ดีขึ้น
เล็กน้อยกับอีก 2/4 (ไข่เจียว, อกไก่จี่) — ดูเหมือนโมเดล over-correct เมื่อบอกวิธีปรุงตรงๆ แทนที่จะแม่นขึ้น
รอ n=50 rerun (round 3 metric) ก่อนสรุปว่าจะเก็บ/ปรับ prompt/ถอด feature นี้ — **(เพิ่ม 2026-08-20 n=50
rerun เสร็จ)** พบสิ่งสำคัญกว่าที่คาด: **coverage ของ confidence range ต่ำกว่าเป้า ~80% มาก** — kcal 26%,
protein 40%, carbs 38%, fat 26% (ควรได้ ~80% ถ้า range สอบเทียบถูก) ในขณะที่ width เฉลี่ยยังแคบอยู่ (kcal
63.5kcal, ทั้งที่ error จริง median 70kcal — แคบกว่า error จริงเสียอีก) → **โมเดลมั่นใจเกินจริงอย่างชัดเจน**
โชว์ "ช่วงประมาณ X-Y" ตอนนี้เสี่ยงหลอก user ว่าค่าจริงน่าจะอยู่ในช่วงแคบนั้น ทั้งที่จริงหลุดช่วง 60-74% ของ
เวลา. Absolute error รอบนี้ดูแย่ลงในค่าเฉลี่ย (kcal avg 116.7 จาก 90.4) แต่ **median ดีขึ้น** (70 จาก 90)
— สาเหตุคือ outlier ใหม่ 2 ตัวที่ผิดปกติมาก (Proten High Protein พลาด 1120kcal, actual 230 est 1350) ซึ่ง
สคริปต์นี้ไม่ได้ส่ง cookingMethod เลย (ใช้ default) แปลว่า**ไม่เกี่ยวกับ feature ใหม่ที่เพิ่ง deploy** —
น่าจะเป็นความแปรปรวนระหว่างครั้งที่ยิงโมเดล (LLM ไม่ deterministic) เป็นข้อจำกัดของ methodology เอง: การ
เทียบ n=50 รันคนละรอบมี noise สูงที่ tail จนกระทบ mean ได้มาก ควรเชื่อ median มากกว่า mean เมื่อเทียบข้าม
รอบ |
| BL-03 | Post-P5 | research-gated | Camera volume estimation — ประมาณปริมาณอาหารจากภาพถ่ายด้วยเรขาคณิต เงื่อนไขขั้นต่ำ: ต้องมี reference object ในเฟรม แยกเป็น experimental track ต่างหาก รวมแนวคิด ensemble เปรียบเทียบ 3 ตัวประมาณ (สูตรมาตรฐาน/ราคา/ภาพ) เมื่อมี error data จริงจากการใช้งานสะสม |
| BL-04 | Post-P5 | | Barcode scan ผ่าน Open Food Facts (OFF, open data ODbL) — เรียกตรงจาก client ไม่ผ่าน proxy (ไม่มี secret + กระจาย rate limit เป็นราย user แทนรวมที่ IP VPS), rate ต่ำ (อ่าน 15/นาที, ค้น 10/นาที) เฉพาะ barcode lookup + submit search ห้าม search-as-you-type เด็ดขาด, cache ผลลง Supabase เสมอ, custom User-Agent "Vmacro/x.x (email)" + กรอกฟอร์มแจ้งการใช้งานกับ OFF ก่อนใช้จริง, ข้อมูล crowdsource เข้า admin verification ได้ (D-017) — พิจารณาพร้อม NOVA group (ultra-processed level) เป็นตัวแปรวิเคราะห์ P4/P5 |
| BL-05 | P4a (อนุมัติแล้ว 2026-08-19 — เดิมวางไว้ P3 แต่ P3 ปิดขอบเขตเหลือแค่ Health WRITE core ตาม D-021) | | Day-type energy target — ดู D-019 สำหรับ design เต็ม ระบุเป็น FR ใหม่ก่อนเริ่มโค้ดตามกติกา FR-first (CLAUDE.md) |
| BL-06 | Post-P5 (หรือเร็วกว่านั้นถ้า R-03 กลายเป็น pain point จริงจัง) | | Native iOS app แทนที่ PWA ทั้งระบบ (Swift/SwiftUI) เพื่อเข้าถึง HealthKit เต็มรูปแบบ (read/write/delete จริง, background sync ใกล้ real-time กว่า Shortcuts) — ประเมินขอบเขตแล้ว (2026-08-16, ระหว่างทำ FR-HLTH-1/2): business logic core (`lib/tdee.ts`/`scaling.ts`/`dish.ts` ~970 บรรทัด + test 18 เคส) และ backend (raw JSON REST + Supabase) port/reuse ได้ง่าย แต่ UI ~4,000 บรรทัด (14 หน้าที่ dogfood ผ่านแล้วใน P0-P2) ต้องเขียนใหม่ทั้งหมด ไม่มีทาง reuse จาก React — ตัดสินใจไม่ทำตอนนี้เพราะต้นทุนสูงเกินไปเทียบกับปัญหาที่แก้ได้ด้วย delta approach (D-022) อยู่แล้ว |
| BL-07 | รอ core ทุกอย่างจบก่อน (ยาว, ไม่รีบ) | | Shortcut #1 ส่วน extended nutrients (กลุ่ม D ใน `docs/shortcuts/shortcut-1-write.md` — sodium/sugar/fiber/potassium/calcium/iron/vitamin C,D/sat-mono-poly fat/cholesterol, 12 field, 36 action) — core 4 (kcal/protein/carb/fat) เสร็จ+ยืนยันทำงานจริงแล้ว (2026-08-18) แต่ extended nutrients ยังไม่ได้เริ่ม วีตั้งใจแยกเป็น **shortcut ที่สอง** ("extension") ที่ main shortcut เรียกผ่าน action `Run Shortcut` ส่ง `Data` dictionary ต่อให้ ไม่ยิง API ซ้ำ — มีจุดต้องตัดสินใจตอนเริ่มจริง: จะแจก extension คู่กับ main shortcut ให้เพื่อนเสมอ (กัน `Run Shortcut` error ถ้าไม่มี) หรือ extension เป็นของวีใช้เองอย่างเดียว — **วีขอให้ remind เรื่องนี้อีกครั้งหลัง core ทุกอย่าง (รวม FR-DIARY-3) เคลียร์จบแล้ว** |
| BL-08 | P4a | | Dashboard tab แทน Weight tab: today-at-a-glance (kcal ring + P/C/F + day type), weight card + sparkline (หน้า weight เดิมย้ายมาอยู่ใต้), streak/สรุปสัปดาห์, โซน analytics tier 1 (FR-ANLT-1) — เป็นบ้านของ P4 analytics |
| BL-09 | หลัง P4b — ตัดสินตอนปิด P4b ว่าเข้าก่อน/คู่ P5 (2026-08-19: วีตัดสินใจ เหตุผล — Friends มีค่าเมื่อมีเพื่อนใช้จริง ซึ่ง D-023 AI Import ใน P4a คือตัวปลดล็อกพฤติกรรมนั้น ต้องเห็นพฤติกรรมเพื่อนก่อนออกแบบ) | | Friends tab: streak leaderboard, contribution board (สร้าง/verify custom food), opt-in activity feed — หลักการ: แข่งที่พฤติกรรม ห้ามมี leaderboard น้ำหนัก/kcal, diary ยัง private ตาม RLS เดิม. Toolbar ใหม่เมื่อทั้งสองมา: Dashboard·Diary·Search·Friends·Settings — ลำดับสุดท้ายตัดสินจาก dogfood |
| BL-10 | P4b (งานแรกของ P4b, ทำได้ทันทีที่ D-019+BL-08 จาก P4a จบ) | | Per-meal targets + meal-time reminders — Profile: จำนวนมื้อ/วัน (1–6) + เวลาแต่ละมื้อ + สัดส่วน % ต่อมื้อ (default หารเท่า ปรับได้ รวม 100%). Engine กระจาย daily target (ที่ผ่าน day-type แล้ว) เป็น target ต่อมื้อ + โหมด remaining-based ("ก่อนมื้อนี้เหลือให้กินอีก X" คำนวณจากที่กินจริงไปแล้ว ไม่ยึดตัวเลขตายตัว) แสดงผลใน diary/dashboard เป็นระยะแรก (ไม่พึ่ง push). Reminder ตามเวลามื้อ: ทางหลัก = iOS Shortcuts Automation ยิง VPS endpoint (pattern เดียวกับ P3 health token) เพราะ reliability สูงกว่า Web Push บน iOS PWA — Web Push เป็นทางเลือกรอง, ข้อจำกัด iOS นี้บันทึกไว้เป็น risk |
| BL-11 | P4a (งานแรกของ P4a) | | Search UX เร็วขึ้น+อ่านง่ายขึ้น — ปรับ UI/พฤติกรรมของ FR-FOOD-1 ที่มีอยู่แล้ว ไม่ใช่ FR ใหม่: (1) วัดก่อนทำ — instrument latency จริงว่าหายไปที่ Supabase/FatSecret/Haiku translation ช่วงไหน รายงานตัวเลขก่อนตัดสินใจ implement (2) progressive results — ผลจาก Supabase (custom food/จาน/template/recent) แสดงทันทีที่ได้ ไม่รอ FatSecret, FatSecret+คำแปลไหลมาต่อท้ายพร้อม loading indicator (3) Settings: switch เปิด/ปิด FatSecret ต่อ user (default เปิด) (4) จัดกลุ่มผลค้นหาเป็น section (ของฉัน/จาน/recent/FatSecret) แต่ละกลุ่มแสดงจำกัด+"ดูทั้งหมด", ใช้ load-more/infinite scroll แทน pagination ตัวเลข (mobile-first) — เสนอรูปแบบสุดท้ายพร้อม mock สั้นๆ ก่อนทำจริง — **(อัปเดต 2026-08-19)** ขั้น (1) instrumentation deploy แล้ว: ตาราง `search_latency_log` (Supabase, write-only จาก client, ดู migration `20260819000000_search_latency_log.sql`) + `console.debug` ฝั่ง client อยู่หลัง feature flag `SEARCH_LATENCY_LOGGING` (`web/src/config.ts`) — เป็นเครื่องมือชั่วคราว ปิด flag + drop ตารางเมื่อ implement เสร็จ. แผน: สะสมข้อมูล 3-5 วัน แล้วรายงานตัวเลขพร้อมข้อเสนอ — **(อัปเดต 2026-08-19 รอบ 2)** `server/src/fatsecret.mjs` `DEFAULT_MAX_RESULTS` เปลี่ยน 10→50 (คำสั่งวี, deploy 2026-08-19 13:23 ICT ระหว่างที่ instrumentation กำลังเก็บข้อมูลอยู่) — **รายงาน BL-11 ต้อง mark timestamp นี้แยกข้อมูลก่อน/หลังชัดเจน** (ผลเยอะขึ้น = โอกาส translation cache miss ต่อครั้งค้นหาสูงขึ้น เทียบกันตรงๆ ไม่ได้) และเพิ่ม **"รองรับผล 50 รายการได้ลื่น" เป็น requirement ของ BL-11 เอง** ตั้งแต่ตอนนี้ (ไม่ใช่แค่ 10 เหมือนตอนออกแบบเดิม) — **(อัปเดต 2026-08-19 รอบ 3)** ขั้น (2)/(4) เสร็จแล้ว: แปลผล FatSecret เป็น batch ละ 10 (fetch เดิมสูงสุด 50 ไม่เปลี่ยน) โชว์อังกฤษทันทีระหว่างรอแปล (DF7 reversed — คุ้มที่ 50 ผล/~9.5s แม้ไม่คุ้มตอน 10 ผล/~2s), ปุ่ม "โหลดเพิ่ม" แปล batch ถัดไป, section เปลี่ยนชื่อเป็น "ของฉัน"/"จานอาหาร"/"FatSecret" + ปุ่ม "ดูทั้งหมด" (ข้อมูล fetch ไว้แล้ว ไม่ยิง network เพิ่ม). ขั้น (3) เสร็จแล้ว: switch เปิด/ปิด FatSecret ใน Settings → System (`profiles.fatsecret_search_enabled`, migration `20260819020000_fatsecret_toggle.sql`). Instrumentation ยังทำงานต่อ (วัดแค่ batch แรกจากนี้ไป แม่นกว่าเดิม) — **BL-11 ครบทั้ง 4 ข้อแล้ว** เหลือแค่รอสะสมข้อมูลเพิ่มแล้วพิจารณาถอด instrumentation ออกทีหลัง |

## 8. Naming (ยุติแล้ว — D-010)

- **Display name:** Vmacro — V ตัวเดียวเข้าชุดแบรนด์ vfullcycle
- **Repo:** `vfullcycle/vmacro` → PWA URL: `vfullcycle.github.io/vmacro`
- **GitHub topics:** nutrition-tracker, macros, tdee, pwa, react, typescript, supabase, fatsecret-api, apple-health

---

## Changelog

- v1.25 (2026-08-20): Round 3 ผลออกแล้วทั้งคู่ — **coverage ของ confidence range ต่ำกว่าเป้ามาก** (26-40%
  vs เป้า ~80%, โมเดลมั่นใจเกินจริง) และ **within-item test ของ cooking-method context เป็นลบ** (ทำให้คู่
  อ้างอิง ทอด vs จี่ ห่างจาก ground truth มากขึ้นแทนที่จะแม่นขึ้น) — ทั้งสอง feature deploy แล้วแต่ยังหลัง
  `AI_IMPORT_ENABLED=false`, รอวีตัดสินใจขั้นต่อไป
- v1.23 (2026-08-19): วิเคราะห์ n=50 เดิมเพิ่ม (ไม่ยิงโมเดลใหม่) — signed bias เล็กมากไม่เอนทางเดียว
  (ตัดความกังวลเรื่อง error สะสมทั้งวัน), สมมติฐาน "serving กำกวม" ถูกหักล้างด้วยข้อมูลจริง (explicit-unit
  กลับ error สูงกว่า) — สังเกต (ยังไม่ทดสอบทางการ): ของทอด/แบรนด์อาจเป็นแกนความแปรปรวนร่วม
- v1.22 (2026-08-19): AI Import รอบ 2 — เปลี่ยน validation metric เป็น absolute error, รัน n=50
  แยกกลุ่มแบรนด์/ทั่วไป (ผลไม่ตรงสมมติฐานเดิม), เพิ่ม confidence range + `read_label` mode (deploy
  แล้วทั้งคู่) — ยังปิด `AI_IMPORT_ENABLED` รอรอบ C
- v1.21 (2026-08-19): FR-FOOD-7 (AI Import) เขียนโค้ด+deploy เสร็จ หลัง flag `AI_IMPORT_ENABLED=false` —
  ground-truth validation รัน n=20 แล้ว รายงานตัวเลขให้วีดู (error % ยังสูงโดยเฉพาะแบรนด์/ปริมาณน้อย,
  อาหารจานเดียวทั่วไปแม่นกว่ามาก) รอวีตัดสินใจ threshold/scope ก่อนเปิด flag
- v1.20 (2026-08-19): BL-11 ครบทั้ง 4 ข้อ + deploy แล้ว — batch translation (10/ครั้ง) แทนแปลทั้งหมด
  upfront (data: 9.5s→เหลือเสี้ยวเดียวสำหรับ batch แรก), FatSecret toggle
  (`profiles.fatsecret_search_enabled`), "ดูทั้งหมด" บน custom/dish. P4a คงเหลือแค่ D-023 (รอผลรีวิว
  research doc จากที่ปรึกษาภายนอกของวี)
- v1.19 (2026-08-19): FR-CALC-4 (day-type target, D-019) เขียนโค้ดเสร็จ + deploy แล้ว — migration
  `20260819010000_day_type_target.sql` รันแล้ว, unit test cascading floor logic ผ่านครบ (24 tests).
  P4a งานถัดไปคือ D-023 (AI Import, research doc มีแล้วรอวีอนุมัติ) ตาม SCOPE.md v1.4
- v1.18 (2026-08-19): แก้ D-019 → implement เป็น FR-CALC-4 พร้อมกติกา floor แบบไล่ลำดับชั้น (protein
  คงที่ → carb floor → fat floor → ไม่บังคับสมการ) ตามที่วีอนุมัติ, ดู REQUIREMENTS.md สำหรับ AC เต็ม.
  บันทึก timestamp การเปลี่ยน `DEFAULT_MAX_RESULTS` 10→50 ใน BL-11 (แยกข้อมูล latency ก่อน/หลัง) +
  เพิ่ม "รองรับผล 50 รายการได้ลื่น" เป็น requirement ของ BL-11
- v1.17 (2026-08-19): BL-11 ขั้น (1) instrumentation shipped — `search_latency_log` table + client
  timing behind `SEARCH_LATENCY_LOGGING` flag, deployed to prod. เก็บข้อมูล 3-5 วันก่อนรายงานตัวเลข +
  ข้อเสนอ implement ให้วี
- v1.16 (2026-08-19): วีอนุมัติแผน P4a/P4b (ดู SCOPE.md v1.3) — อัปเดต phase ของ BL-02/05/08/10 เป็น
  P4a/P4b ตามลำดับ, ย้าย BL-09 (Friends tab) เป็น "หลัง P4b — ตัดสินตอนปิด P4b" เพราะ Friends มีค่าเมื่อ
  มีเพื่อนใช้จริง ซึ่ง D-023 AI Import คือตัวปลดล็อกพฤติกรรมนั้น — context เปลี่ยน: มีเพื่อนเริ่มใช้จริง
  แล้ว 2 คน (รวมวี 3 users)
- v1.15 (2026-08-19): เพิ่ม D-024 (Exception ของ Phase Gate Rule ครั้งที่ 2 — ปิด P2/ตี `v1.0.0` โดยไม่รอ
  FR-DIARY-3 ผ่าน dogfood ครบ 2-3 วัน เพราะเป็น shortcut ความเสี่ยงต่ำ, บั๊กที่เจอทีหลังแก้เป็น patch
  `v1.0.x`; ตี `v1.1.0` ต่อทันทีเพราะ P3 core (FR-HLTH-1/2) ยืนยันทำงานจริงแล้ว) แก้ Phase ของ BL-05
  (day-type target) จาก "P3 หัวคิว" เป็น P4 เพราะ P3 ปิดขอบเขตเหลือแค่ Health WRITE core — วีอนุมัติปิด
  phase ระหว่าง discuss รอบเดียวกับ D-023/BL-08–11 (v1.14)
- v1.14 (2026-08-19): เพิ่ม D-023 (**AI Import** — เปลี่ยนขอบเขต BL-02 จาก LLM recipe decomposition,
  เลื่อน P5→P4, research gate แบบเบา) มาจาก pipeline จริงที่วีใช้อยู่ (ChatGPT คำนวณ macro → ตรวจเอง →
  admin bulk-import) — ต้องการให้เพื่อนได้ workflow เดียวกันในแอป โดยไม่ลด governance (LLM ไม่เขียน DB
  ตรง, human verify 2 ชั้นเหมือนเดิม). แก้ D-018 (USDA FDC) timing เป็น "รอ user ติดขัดจริง" เพราะ
  D-023 ครอบ use case เดียวกันได้ตรงกว่า (FDC ยังคงเป็น fallback ไม่ถอน). เพิ่ม backlog BL-08 (Dashboard
  tab แทน Weight tab, P4), BL-09 (Friends tab, P4+), BL-10 (per-meal targets + meal-time reminders,
  P4 หลัง D-019+BL-08), BL-11 (search UX เร็วขึ้น+อ่านง่ายขึ้น ปรับ FR-FOOD-1 เดิม, งานแรกของ P4a) —
  มาจาก discuss กับ Claude on web ระหว่างรอ dogfood FR-DIARY-3
- v1.13 (2026-08-18): FR-HLTH-1 core 4 (kcal/protein/carb/fat) ยืนยันทำงานจริงบนเครื่อง — sync เข้า Apple
  Health ถูกต้องผ่านปุ่ม "ซิงก์เข้า Apple Health" แล้ว เพิ่ม BL-07 (extended nutrients เป็น shortcut ที่สอง
  แยกต่างหาก เรียกผ่าน `Run Shortcut` — deferred ยาว รอ core ทุกอย่างรวม FR-DIARY-3 จบก่อน)
- v1.12 (2026-08-16): เพิ่ม D-022 (เปลี่ยนกลไกกัน sample เบิ้ลของ Core 4 ใน Shortcut #1 จาก delete-then-rewrite
  เป็น delta calculation — `Delete Health Sample` ไม่มีจริงใน Shortcuts action library, พบระหว่าง build จริง) +
  BL-06 (native app แทนที่ PWA ทั้งระบบ — ประเมินขอบเขตแล้วไม่คุ้มตอนนี้ เก็บเป็น backlog) — วีตัดสินใจระหว่าง
  จับมือ build Shortcut #1 บน iPhone จริง
- v1.11 (2026-08-15): เพิ่มหมายเหตุใน R-03 — วีขอ real-time Health sync ระหว่าง dogfood, ยืนยันข้อจำกัดแพลตฟอร์ม
  เดิมอีกครั้ง (ทำไม่ได้จริงโดยไม่มี native app ซึ่ง Out of Scope v1) เลือกทำปุ่ม "ซิงก์เข้า Apple Health"
  ในหน้า Diary แทน (deep link เปิด Shortcut ทันที ลด friction แต่ยังเป็น manual trigger)
- v1.10 (2026-08-14): เพิ่ม D-020 (health token auth สำหรับ Apple Shortcut ผ่าน `verify_health_token()`/
  `get_daily_totals()` SECURITY DEFINER RPC), D-021 (exception ของ Phase Gate Rule — ทำ FR-HLTH-1/2 ก่อน
  FR-DIARY-3, supersede ล็อก "ไม่รับ FR ใหม่จนถึง v1.0.0" ใน v1.9 เฉพาะกรณีนี้) — วีอนุมัติระหว่าง dogfood จริง
  บน iPhone, อยากได้ Apple Health sync เร็วกว่าคิวเดิม
- v1.9 (2026-08-13): เพิ่ม D-018 (USDA FoodData Central เป็นแหล่งข้อมูลที่ 3, คิวหลัง FR-DIARY-2/3),
  D-019 (day-type energy target design, คิว P3 — ยังไม่ implement) + BL-04 (barcode scan ผ่าน Open Food Facts, Post-P5),
  BL-05 (day-type energy target อ้าง D-019, หัวคิว P3) — วีสั่งระหว่างล็อก work order ของ P2 ให้เข้มงวดขึ้น (ไม่รับ FR ใหม่เพิ่มจนกว่าจะตี tag v1.0.0)
- v1.8 (2026-08-13): Formalize สิ่งที่เกิดระหว่าง dogfood P2 — เพิ่ม D-016 (nickname default = email prefix),
  D-017 (admin verification badge บน custom food), แก้ D-015 เพิ่ม cost ownership + auth guard + rate limit +
  fallback บน `/translate`, อัปเดต §4 (`profiles.display_name`/`is_admin`, `custom_foods.is_verified`/`verified_source`)
- v1.7 (2026-08-12): เพิ่ม D-015 (Thai<->English translation ผ่าน Claude Haiku + food_translations cache) — วีขอเพิ่มหลัง dogfood df1, อัปเดต §4 เพิ่ม favorites/food_translations ที่ตกหล่นไว้
- v1.6 (2026-08-12): เพิ่ม D-014 (get_display_name SECURITY DEFINER RPC สำหรับ FR-FOOD-2 creator name) — แก้ ID ชนกับ D-013 (Research Gate) ที่มีอยู่แล้ว เขียนทับผิดตอนแรกเพราะไม่ได้ cross-check กับ CLAUDE.md ที่อ้าง D-013 อยู่แล้ว
- v1.5 (2026-08-12): เพิ่ม §7 Backlog (BL-01/02/03, ยังไม่เข้า FR) + D-013 (Research Gate) — เลื่อน §Naming เป็น §8
- v1.4 (2026-08-12): เพิ่ม D-012 (เปิด custom_foods select ให้ anon) + ปิด R-07 — วีตัดสินใจเปิด food search แบบ public ตอนวางแผน P2
- v1.3 (2026-08-11): เพิ่ม R-07 (backlog) — วีทดสอบ P1 แล้วชี้ว่า "ใช้งานไม่ต้อง login" ที่ต้องการจริงคือ food search (FR-FOOD-1, P2) ไม่ใช่ TDEE calculator ที่ทำไปก่อนหน้านี้ — ตัดสินใจตอนวางแผน P2
- v1.2 (2026-08-11): เพิ่ม D-011 (nutrient storage: typed columns + `nutrients` jsonb, manual recalculate-from-source, quantity scaling rule of three) ตามคำสั่งวีระหว่างทำ Supabase schema P0, อัปเดต §4 ให้ตรง REQUIREMENTS v1.1
- v1.1 (2026-08-11): เพิ่ม D-010 (monorepo + git conventions), ยุติ §7 Naming, อัปเดต architecture ให้ระบุ URL จริง
- v1.0 (2026-08-11): สร้างครั้งแรกหลัง freeze decisions D-001–D-009
