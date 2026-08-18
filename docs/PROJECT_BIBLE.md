# PROJECT_BIBLE — Vmacro v1.13

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
| D-018 | เพิ่ม **USDA FoodData Central (FDC)** เป็นแหล่งข้อมูลอาหารที่ 3 ต่อจาก FatSecret (D-001) และ custom food DB (D-002) — บทบาท: วัตถุดิบ generic คุณภาพแล็บ (Foundation Foods + SR Legacy) ใช้หลักใน dish builder (FR-FOOD-3) **ไม่แทนที่ FatSecret** (คนละบทบาท: FDC = generic ingredients, FatSecret = branded/restaurant). License public domain CC0 — แสดง citation "U.S. Department of Agriculture, FoodData Central, fdc.nal.usda.gov" ในหน้า attribution (USDA ขอร้องไว้ ไม่บังคับทางกฎหมาย แต่ให้). API key (`FDC_API_KEY`, วีสมัคร+วางใน `server/.env` แล้ว) เรียกผ่าน proxy ตาม pattern เดียวกับ FatSecret (D-003) ไม่มีทางหลุดฝั่ง client. Rate limit จริง 1,000 req/ชม./IP — จำกัดเฉพาะ submit search (ห้าม autocomplete/search-as-you-type) + cache ผลใน Supabase + log `X-RateLimit-Remaining` เพื่อ monitor. ผลลัพธ์ผ่าน Thai translation pipeline เดียวกับ FatSecret (D-015). Timing: งานแรกหลัง FR-DIARY-2/3 จบ (ก่อน/หลังตี tag `v1.0.0` พิจารณาตอนถึงคิว) — เสียบเป็น source เพิ่มในหน้าค้นหาโหมด `forDish` ที่มีอยู่แล้ว ไม่ใช่รื้อโครง | Dish builder (FR-FOOD-3) ต้องการวัตถุดิบ generic (เช่น "chicken breast raw") ที่ FatSecret เป็น branded/restaurant-heavy ให้ไม่ครบ — FDC เป็น USDA lab-tested dataset เหมาะกว่าสำหรับวัตถุดิบดิบ/พื้นฐาน ลดภาระต้อง maintain custom food เองทุกรายการ, public domain ตัดปัญหา license | 2026-08-13 |
| D-019 | **(ออกแบบไว้ล่วงหน้า ยังไม่ implement — คิว P3)** Day-type energy target แก้ปัญหา TDEE แบบ static ที่เฉลี่ยการเทรนทั้งสัปดาห์ไม่ตรงการใช้พลังงานจริงรายวัน: (1) ตีความ Profile activity level ใหม่เป็น baseline ที่ไม่รวม exercise (เช่น sedentary/lightly active จากงานประจำเท่านั้น) (2) diary เพิ่ม day type ต่อวัน: rest/light/hard (เลือกได้ 1 tap, default = rest หรือค่าที่ user ตั้งไว้ล่วงหน้า) → เป้า kcal ของวันนั้น = baseline TDEE + allowance ตาม type (allowance ตั้งค่าได้ใน Settings → System, มี default แนะนำ) (3) macro split คำนวณใหม่ตามเป้าวันนั้น — protein คงที่ตาม g/kg น้ำหนักตัว (ตาม D-007), ส่วนต่างที่เพิ่ม/ลดจาก allowance ลงที่ carb เป็นหลัก (ตามหลัก training-day carbs) (4) schema เผื่อ P4: มี field พร้อมรับ active energy จริงจาก Apple Watch (FR-HLTH) มา override/ปรับ allowance อัตโนมัติในอนาคต โดยไม่ต้องรื้อโครงตอนนั้น. จะระบุเป็น FR ใหม่ใน REQUIREMENTS ตอนวางแผน P3 อย่างเป็นทางการ | TDEE เดียวทั้งสัปดาห์ทำให้วันเทรนหนัก/วันพักได้เป้าเดียวกัน ไม่สะท้อนการใช้พลังงานจริง (nutrition periodization เป็นหลักปฏิบัติมาตรฐานสำหรับคนเทรน) — ออกแบบไว้ล่วงหน้าตอนนี้เพื่อให้ schema/mental model พร้อมสำหรับ P3 และเผื่อทางเชื่อมต่อ Apple Watch จริงใน P4 โดยไม่ต้องรื้อภายหลัง | 2026-08-13 |
| D-020 | Auth สำหรับ VPS endpoint ที่ Apple Shortcut (unattended, ไม่มี user login) เรียก: long-lived per-user API token — เก็บเฉพาะ hash ใน table ใหม่ `health_tokens`, generate/revoke ได้จาก Settings → System, verify ผ่าน `verify_health_token()` (`SECURITY DEFINER`, grant execute ให้ `anon`) — pattern เดียวกับ `get_display_name()` (D-014) และ `set_food_verified()` (D-017) คือเปิดช่องทางแคบๆ ผ่าน RPC แทนการเปิด RLS ตรงๆ หรือเอา service_role key ขึ้น VPS. คู่กับ `get_daily_totals()` (RPC เดียวกัน กลุ่มเดียวกัน) สรุปยอด diary ของ user+date นั้นให้ endpoint โดยไม่ต้องมี Supabase session จริง | Shortcut ต้อง "ติดตั้งครั้งเดียวใช้ได้ตลอด" (FR-HLTH-2) — Supabase JWT ปกติหมดอายุ ~1 ชม. ไม่เหมาะกับงานที่รันเองทุกวันแบบไม่มีคนคอยต่ออายุ token, opaque token คุมง่ายกว่า (revoke ได้ทันที) และไม่ต้องเพิ่ม secret ใหม่บน VPS เลย — token รั่วเปิดได้แค่อ่านยอดรวมรายวัน ไม่มีสิทธิ์เขียนหรือ table อื่น | 2026-08-14 |
| D-021 | **Exception ของ Phase Gate Rule**: อนุมัติให้ทำ FR-HLTH-1/2 (Apple Health WRITE, ปกติอยู่ P3) ก่อน FR-DIARY-3 (งานสุดท้ายที่เหลือของ P2) — วีกำลัง dogfood จริงบน iPhone อยู่ตอนนี้และอยากได้ Health sync เร็วกว่าคิวเดิม ส่วน FR-DIARY-3 เป็นแค่ shortcut ลด friction (copy-from-yesterday/recent/favorites) ไม่ block งานอื่นต่อ จึงเลื่อนไปทำหลัง FR-HLTH-1/2 แทน. **หมายเหตุสำคัญ:** การอนุมัตินี้ supersede ข้อความใน changelog v1.9 (2026-08-13) ที่ล็อกไว้ว่า "ไม่รับ FR ใหม่เพิ่มจนกว่าจะตี tag v1.0.0" — ล็อกเดิมมีไว้กัน scope creep ใหม่ๆ แทรกเข้า P2 เอง (เช่น BL-01..05) ไม่ใช่ห้ามสลับคิวไปทำงาน phase ถัดไปก่อนถ้าวีสั่งเองแบบนี้ ทั้งสองเรื่องแยกกัน ไม่ขัดกัน. FR-HLTH-1 ในบรรทัดนี้ยังถูกขยายขอบเขตเพิ่ม (extended nutrients best-effort) ตามคำสั่งวีเช่นกัน — ดู `docs/REQUIREMENTS.md` FR-HLTH-1 v1.5 | dogfooding คือ QA หลักของโปรเจกต์นี้ตาม Phase Gate Rule เอง — การได้ signal จริงจาก Health sync เร็วขึ้นมีค่ามากกว่าการรอให้ FR-DIARY-3 (convenience feature) เสร็จก่อนตามลำดับเดิม | 2026-08-14 |
| D-022 | **แก้ FR-HLTH-1 mechanism**: Core 4 (kcal/protein/carb/fat) ใน Shortcut #1 เปลี่ยนกลไกกัน sample เบิ้ลจาก "ลบของเก่าก่อนเขียนใหม่" (design เดิมใน D-020/D-021) เป็น **delta calculation**: หาผลรวมของ sample ที่มีอยู่แล้วของวันนี้ด้วย `Find Health Samples` (filter `Start Date is today`) → sum → เขียนแค่ส่วนต่าง (ยอดใหม่จาก Vmacro − ยอดที่มีอยู่แล้ว) ถ้าส่วนต่าง > 0 เท่านั้น — ไม่ log ถ้าส่วนต่าง ≤ 0 | ระหว่าง build Shortcut #1 จริงพบว่า Shortcuts ไม่มี action `Delete Health Sample` เลย (Apple ไม่เปิด API ลบ HealthKit sample ผ่าน Shortcuts) ทำให้ design เดิมทำไม่ได้ตามแผน — ประเมินทางเลือก native app แทนทั้งระบบด้วย (ดู BL-06) แต่ต้นทุนสูงเกินไปเทียบกับปัญหาเดียวนี้ delta approach ได้ idempotent เทียบเท่ากันโดยไม่ต้องพึ่ง delete, self-healing เมื่อรันซ้ำ, รองรับการแก้ diary entry ทีหลังถูกต้องอัตโนมัติ — ข้อจำกัดเดียว (เหมือนเดิมไม่ว่าวิธีไหน) คือลดยอดใน Health ไม่ได้ถ้ายอดจริงลดลงหลัง sync ไปแล้ว | 2026-08-16 |

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
| BL-02 | P5 | research-gated | LLM recipe decomposition: พิมพ์ชื่อเมนู → LLM เสนอ ingredient list + ปริมาณตามสูตรมาตรฐาน → user ปรับแล้ว save ผ่าน dish builder — extension ของ FR-FOOD-3 |
| BL-03 | Post-P5 | research-gated | Camera volume estimation — ประมาณปริมาณอาหารจากภาพถ่ายด้วยเรขาคณิต เงื่อนไขขั้นต่ำ: ต้องมี reference object ในเฟรม แยกเป็น experimental track ต่างหาก รวมแนวคิด ensemble เปรียบเทียบ 3 ตัวประมาณ (สูตรมาตรฐาน/ราคา/ภาพ) เมื่อมี error data จริงจากการใช้งานสะสม |
| BL-04 | Post-P5 | | Barcode scan ผ่าน Open Food Facts (OFF, open data ODbL) — เรียกตรงจาก client ไม่ผ่าน proxy (ไม่มี secret + กระจาย rate limit เป็นราย user แทนรวมที่ IP VPS), rate ต่ำ (อ่าน 15/นาที, ค้น 10/นาที) เฉพาะ barcode lookup + submit search ห้าม search-as-you-type เด็ดขาด, cache ผลลง Supabase เสมอ, custom User-Agent "Vmacro/x.x (email)" + กรอกฟอร์มแจ้งการใช้งานกับ OFF ก่อนใช้จริง, ข้อมูล crowdsource เข้า admin verification ได้ (D-017) — พิจารณาพร้อม NOVA group (ultra-processed level) เป็นตัวแปรวิเคราะห์ P4/P5 |
| BL-05 | P3 (หัวคิว) | | Day-type energy target — ดู D-019 สำหรับ design เต็ม ระบุเป็น FR ใหม่ตอนวางแผน P3 |
| BL-06 | Post-P5 (หรือเร็วกว่านั้นถ้า R-03 กลายเป็น pain point จริงจัง) | | Native iOS app แทนที่ PWA ทั้งระบบ (Swift/SwiftUI) เพื่อเข้าถึง HealthKit เต็มรูปแบบ (read/write/delete จริง, background sync ใกล้ real-time กว่า Shortcuts) — ประเมินขอบเขตแล้ว (2026-08-16, ระหว่างทำ FR-HLTH-1/2): business logic core (`lib/tdee.ts`/`scaling.ts`/`dish.ts` ~970 บรรทัด + test 18 เคส) และ backend (raw JSON REST + Supabase) port/reuse ได้ง่าย แต่ UI ~4,000 บรรทัด (14 หน้าที่ dogfood ผ่านแล้วใน P0-P2) ต้องเขียนใหม่ทั้งหมด ไม่มีทาง reuse จาก React — ตัดสินใจไม่ทำตอนนี้เพราะต้นทุนสูงเกินไปเทียบกับปัญหาที่แก้ได้ด้วย delta approach (D-022) อยู่แล้ว |
| BL-07 | รอ core ทุกอย่างจบก่อน (ยาว, ไม่รีบ) | | Shortcut #1 ส่วน extended nutrients (กลุ่ม D ใน `docs/shortcuts/shortcut-1-write.md` — sodium/sugar/fiber/potassium/calcium/iron/vitamin C,D/sat-mono-poly fat/cholesterol, 12 field, 36 action) — core 4 (kcal/protein/carb/fat) เสร็จ+ยืนยันทำงานจริงแล้ว (2026-08-18) แต่ extended nutrients ยังไม่ได้เริ่ม วีตั้งใจแยกเป็น **shortcut ที่สอง** ("extension") ที่ main shortcut เรียกผ่าน action `Run Shortcut` ส่ง `Data` dictionary ต่อให้ ไม่ยิง API ซ้ำ — มีจุดต้องตัดสินใจตอนเริ่มจริง: จะแจก extension คู่กับ main shortcut ให้เพื่อนเสมอ (กัน `Run Shortcut` error ถ้าไม่มี) หรือ extension เป็นของวีใช้เองอย่างเดียว — **วีขอให้ remind เรื่องนี้อีกครั้งหลัง core ทุกอย่าง (รวม FR-DIARY-3) เคลียร์จบแล้ว** |

## 8. Naming (ยุติแล้ว — D-010)

- **Display name:** Vmacro — V ตัวเดียวเข้าชุดแบรนด์ vfullcycle
- **Repo:** `vfullcycle/vmacro` → PWA URL: `vfullcycle.github.io/vmacro`
- **GitHub topics:** nutrition-tracker, macros, tdee, pwa, react, typescript, supabase, fatsecret-api, apple-health

---

## Changelog

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
