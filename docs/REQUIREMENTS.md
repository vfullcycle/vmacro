# REQUIREMENTS — Vmacro (FROZEN v1.6, 2026-08-19)

> แก้ไขได้เฉพาะเมื่อวีสั่ง + bump version + บันทึก changelog ท้ายไฟล์
> ทุก FR ระบุ phase ที่ implement ตาม SCOPE.md

---

## FR-PROF — Profile & Body Data (P1)

**FR-PROF-1** ระบบเก็บข้อมูลใน Settings → Profile: เพศ, วันเกิด (คำนวณอายุอัตโนมัติ), ส่วนสูง (cm),
น้ำหนักปัจจุบัน (kg), activity level (5 ระดับมาตรฐาน: sedentary → extra active), เป้าหมาย (ลด/รักษา/เพิ่มน้ำหนัก),
body fat % (optional — จำเป็นเฉพาะเมื่อเลือกสูตร Katch-McArdle)
*AC: บันทึกแล้วค่า TDEE/target อัปเดตทันทีทุกหน้า, body fat ว่างได้โดยไม่ block สูตรอื่น*

**FR-PROF-2** การอัปเดตน้ำหนักทุกครั้งเก็บเป็น weight log (timestamp) เพื่อทำ trend — ไม่ทับค่าเดิม
*AC: มีกราฟ trend น้ำหนักย้อนหลังดูได้, แก้ไข/ลบ log entry แต่ละรายการย้อนหลังได้*

**FR-PROF-3** ตั้งชื่อที่แสดงต่อสาธารณะ (nickname) ใน Settings → Profile — default = local part ของ email
(ก่อน `@`) ตอน signup, แก้ไขเองได้ภายหลัง (D-016)
*AC: เปลี่ยนชื่อแล้ว ชื่อที่แสดงบน custom food ที่ตัวเองสร้าง (FR-FOOD-2) อัปเดตตาม*

## FR-CALC — TDEE & Macro Engine (P1)

**FR-CALC-1** คำนวณ BMR ได้ 3 สูตร: Mifflin-St Jeor (default), Katch-McArdle, Harris-Benedict revised
แล้วคูณ activity multiplier เป็น TDEE — user เลือกสูตรได้ใน Settings
*AC: pure function มี unit test เทียบค่าอ้างอิงอย่างน้อยสูตรละ 3 case, เลือก Katch โดยไม่มี body fat % → แจ้งเตือนและ fallback เป็น default*

**FR-CALC-2** แนะนำเป้า kcal ตาม goal: ลด = TDEE − deficit, เพิ่ม = TDEE + surplus, รักษา = TDEE
โดย deficit/surplus ปรับได้ (default ลด −500, เพิ่ม +300 kcal/วัน) และแสดงอัตราการเปลี่ยนน้ำหนักโดยประมาณ/สัปดาห์
*AC: เปลี่ยน goal หรือ deficit แล้วเป้า macro คำนวณใหม่ทันที*

**FR-CALC-3** แตกเป้าเป็น macro ตามลำดับ: protein ตาม g/kg น้ำหนักตัว (default: ลด 2.0, รักษา 1.6, เพิ่ม 1.8 — override ได้)
→ fat ขั้นต่ำ 25% ของ kcal (override ได้) → carb = kcal ที่เหลือ ÷ 4
*AC: ผลรวม kcal จาก f×9 + c×4 + p×4 ต้องเท่าเป้า kcal (±5 kcal จากการปัดเศษ)*

**FR-CALC-4 (P4a)** Day-type energy target (D-019) — แก้ปัญหา TDEE เดียวทั้งสัปดาห์ไม่ตรงการใช้พลังงานจริง
รายวัน: Profile activity level ตีความใหม่เป็น baseline ที่ไม่รวม exercise (เช่น sedentary/lightly active
จากงานประจำเท่านั้น) → diary เพิ่มตัวเลือก day type ต่อวัน: rest/light/hard (เลือกได้ 1 tap ต่อวัน,
ไม่เลือก = ใช้ default ที่ตั้งไว้ล่วงหน้าใน Settings หรือ rest ถ้าไม่เคยตั้ง) → เป้า kcal ของวันนั้น =
baseline TDEE + allowance ตาม type (allowance ตั้งค่าได้ใน Settings → System ต่อ type, มี default แนะนำ)
→ macro split ของวันนั้นคำนวณใหม่ตามลำดับชั้น: (1) protein คงที่ตาม g/kg น้ำหนักตัวเสมอตาม FR-CALC-3
ไม่ลดในทุกกรณี (2) carb รับส่วนต่างจาก allowance ก่อน จนถึง floor `max(50g, 10% ของเป้า kcal)`
(3) ถ้ายังไม่พอ fat ขยับลงรับส่วนต่างต่อ จนถึง floor `max(0.5g/kg น้ำหนักตัว, 20% ของเป้า kcal)`
(4) ชนทุก floor แล้วยังไม่พอ (เช่น allowance ติดลบมากจาก rest day) → ไม่บังคับสมการ f×9+c×4+p×4 = เป้า
kcal อีกต่อไป — เป้า kcal ของวันนั้นกลายเป็นผลรวมจริงของ floors ทั้งหมด (ต่ำกว่าที่ baseline+allowance
คำนวณไว้) และ UI ต้องแจ้งเตือน user ว่า allowance ต่ำเกินไป ให้ปรับ allowance หรือ protein target —
floor ทั้งสอง (carb, fat) ตั้งค่า override ได้ใน Settings → System (ค่า default ตามที่ระบุข้างต้น).
Schema เผื่อ P4b: มี field พร้อมรับ active energy จริงจาก Apple Watch (FR-HLTH-3) มา override/ปรับ
allowance อัตโนมัติในอนาคต โดยไม่ต้องรื้อโครงตอนนั้น (FR นี้ยังไม่ implement ส่วน auto-override)
*AC: เลือก day type ในหน้า diary ของวันนั้น (1 tap) แล้วเป้า kcal/macro ของวันนั้นอัปเดตทันที ไม่กระทบ
วันอื่น; ไม่เลือกเลย → ใช้ default ที่ตั้งไว้ล่วงหน้าใน Settings (หรือ rest ถ้าไม่เคยตั้ง); แก้ allowance
หรือ floor ใน Settings → System แล้วเป้าของวันปัจจุบัน/อนาคตคำนวณใหม่ตามค่าที่แก้ทันที; ผลรวม kcal จาก
f×9+c×4+p×4 ต้องเท่าเป้า kcal ของวันนั้น (±5 kcal จากการปัดเศษ) ยกเว้นกรณีชนทุก floor ตามข้อ (4) ซึ่งต้อง
มี UI แจ้งเตือนชัดเจน; unit test ครอบคลุมทุก macro ≥ floor ที่กำหนดและ ≥ 0 เสมอในทุก input รวม edge case
allowance ติดลบมากๆ*

## FR-SET — Settings (P1)

**FR-SET-1** Settings เข้าถึงผ่าน tab เดียวในแถบล่าง แสดงเป็น list ของหมวดย่อยแทนการแยก tab ต่อหมวด
(เผื่อเพิ่มหมวดในอนาคตโดยไม่ต้องขยายแถบ tab) — ตอนนี้มี 2 หมวด: **Profile** (ข้อมูลร่างกาย/เป้าหมาย/สูตร ตาม FR-PROF, FR-CALC)
และ **System** (หน่วยแสดงผล, ค่า default protein g/kg และ fat %, การจัดการ meal templates, ลิงก์ติดตั้ง Shortcuts + สถานะเชื่อมต่อ)

## FR-FOOD — Food Database & Search (P2)

**FR-FOOD-1** ค้นหาอาหารจาก FatSecret API (ผ่าน VPS proxy) พร้อม autocomplete และแสดง fatsecret attribution ถาวรบนหน้า search
*AC: เลือกผลลัพธ์แล้วเห็น f/c/p/kcal ต่อ serving; ปรับปริมาณได้ 2 ทาง — (a) จำนวน serving (เช่น 1.5 serving) หรือ (b) น้ำหนักจริงเป็นกรัม —
ระบบ scale ทุก nutrient (รวม nutrients panel เต็ม) ตามสัดส่วนจาก serving size ต้นทางเสมอ (rule of three)*

**FR-FOOD-2** สร้าง custom food ได้เอง — ชื่อ, serving, kcal/protein/carb/fat เป็น typed field หลัก
+ nutrients panel เต็มเท่าที่มีข้อมูล (saturated/trans/poly/mono fat, cholesterol, sodium, fiber, sugar, vitamins, minerals)
ทุก record ผูก creator — **user อื่นในระบบค้นหาเจอและใช้บันทึกได้ แต่แก้/ลบได้เฉพาะ creator**
*AC: ผลค้นหารวม 2 แหล่ง (FatSecret + custom) แยก label ชัดเจน และแสดงชื่อ creator บน custom food*

**FR-FOOD-3** Dish builder: ประกอบจานจากหลายวัตถุดิบ (custom หรือ FatSecret) ระบุปริมาณต่อวัตถุดิบ
→ ระบบรวม macro อัตโนมัติ (รวม nutrients panel เต็ม) → save เป็นจานที่ค้นหา/บันทึกซ้ำได้เหมือน food ปกติ (แชร์ข้าม user แบบเดียวกับ FR-FOOD-2)
*AC: แก้ปริมาณวัตถุดิบใน builder แล้วยอดรวมอัปเดตทันที; จานที่ save แล้วเก็บ snapshot ไม่เปลี่ยนตามวัตถุดิบต้นทาง
เว้นแต่ creator กดปุ่ม "Recalculate from source" เพื่อดึงค่า macro/nutrients ปัจจุบันของแต่ละวัตถุดิบมาคำนวณ snapshot ใหม่ทั้งจาน
(manual only — ไม่มี auto-update เมื่อวัตถุดิบต้นทางถูกแก้)*

**FR-FOOD-4 (P2)** หน้ารายละเอียดอาหาร/จาน แสดง nutrition panel แบบ Nutrition Facts label (สไตล์ FDA)
ครบตาม nutrients ที่มีข้อมูล (kcal, f/c/p, saturated/trans/poly/mono fat, cholesterol, sodium, fiber, sugar, vitamins, minerals)
พร้อม fatsecret attribution เมื่อข้อมูลมาจาก FatSecret API
*AC: เปิดจาก search result, custom food, หรือ dish ก็เข้าหน้านี้ได้; nutrient ที่ไม่มีข้อมูลจากต้นทางไม่แสดง (ไม่โชว์ 0 ปลอม);
attribution แสดงเฉพาะเมื่อ source เป็น FatSecret*

**FR-FOOD-5 (P2)** Admin verification สำหรับ custom food — admin (วี) ตรวจสอบความถูกต้องของ custom food
แล้วระบุแหล่งอ้างอิง (เช่น "Thai FCD v3") ได้ ขึ้น badge ยืนยันแสดงในผลค้นหาและหน้า detail — เฉพาะ admin เท่านั้นที่ verify ได้
ผู้สร้างอาหารเองยืนยันตัวเองไม่ได้ (D-017)
*AC: badge แสดงเฉพาะเมื่อ verified แล้ว; แหล่งอ้างอิงแสดงเต็มเฉพาะหน้า detail ไม่ใช่ในผลค้นหาแบบย่อ; admin ยกเลิกการ verify ได้*

**FR-FOOD-6 (P2)** เพิ่มอาหารแบบเร่งด่วน (quick add) — ทางลัดบันทึกรายการทิ้งขว้าง (one-off) เข้ามื้ออาหารตรง ๆ
จากช่องทางเพิ่มอาหารเข้ามื้อเท่านั้น โดยกรอกแค่ชื่อรายการ + kcal/protein/carb/fat รวม **ไม่สร้าง custom food** —
ไม่ผูก record ที่ค้นหา/ใช้ซ้ำได้ในอนาคต ต่างจาก FR-FOOD-2
*AC: kcal กรอกเองได้ หรือให้ระบบคำนวณอัตโนมัติจาก protein×4 + carb×4 + fat×9 (สลับโหมดได้ก่อนบันทึก);
กด "บันทึก" แล้วเข้ามื้ออาหารที่เลือกไว้ทันทีในคลิกเดียว (ไม่เด้งไปหน้า detail อีกที); ปุ่มนี้แสดงเฉพาะตอนเปิดจากช่องทาง
เพิ่มอาหารเข้ามื้อ (forDiary) เท่านั้น เพราะไม่มี food record ให้ผูกกับ dish/favorites ในโหมดอื่น*

## FR-DIARY — Daily Logging (P2)

**FR-DIARY-1** บันทึกอาหารรายมื้อ (เช้า/กลางวัน/เย็น/ว่าง) ระบุ quantity — หน้าสรุปวันแสดงยอดรวม f/c/p/kcal
เทียบ target พร้อม progress ต่อ macro
*AC: เพิ่ม/แก้/ลบ entry แล้วยอดวันอัปเดตทันที; ระบุ quantity ได้ 2 ทางเหมือน FR-FOOD-1 — จำนวน serving หรือน้ำหนักจริง (g) —
scale nutrient ตามสัดส่วนจาก serving ต้นทาง (rule of three); entry เก็บ macro/nutrients snapshot (ค่าที่ scale แล้ว) ณ เวลาบันทึก*

**FR-DIARY-2** Meal template: save ชุดอาหารทั้งมื้อไว้เรียกใช้ซ้ำได้ในคลิกเดียว
*AC: apply template ลงมื้อใดก็ได้ของวันใดก็ได้*

**FR-DIARY-3** ทางลัดลดการทำซ้ำ: (a) copy ทั้งวัน/ทั้งมื้อจากเมื่อวาน (b) รายการ recent (c) favorites
*AC: บันทึกมื้อที่กินประจำได้ภายใน ≤3 taps จากหน้า diary*

## FR-HLTH — Apple Health Integration (P3–P4)

**FR-HLTH-1 (P3)** เขียนยอดวันลง Apple Health อย่างน้อย: dietary energy, fat (total/saturated/mono/poly),
carbohydrates, protein, cholesterol, sodium, fiber, sugar, potassium, calcium, iron, vitamin C, vitamin D
ผ่าน Shortcut #1 ที่ดึงข้อมูลจาก VPS endpoint (auth ต่อ user ด้วย per-user API token ตาม D-020) — เขียนแบบ
best-effort เท่าที่มีข้อมูลจริงต่อวัน field ไหนไม่มี entry ไหนของวันนั้นให้ข้อมูลเลยให้ข้าม ไม่เขียนเป็น 0
(ไม่ใช่เขียนทุก field เสมอ). ไม่เขียน trans fat เพราะ Apple HealthKit ไม่มี nutrition identifier รองรับ
ไม่เขียน magnesium/zinc/vitamin B6/B12/folate/phosphorus/water เพราะไม่มีแหล่งข้อมูลจริงในระบบเลย (FatSecret
ไม่คืนค่าพวกนี้, custom food ที่ user กรอกเองแทบไม่มีคนกรอก, quick-add ไม่มีช่องให้กรอกเลย)
*AC: run Shortcut แล้วค่าใน Health app ตรงกับหน้าสรุปวันของ Vmacro (core 4 ต้องตรงเป๊ะ, field อื่นเป็น
best-effort ตามข้อมูลที่มีจริง)*

**FR-HLTH-2 (P3)** Shortcuts ทั้งสองแจกผ่าน iCloud share link พร้อมคู่มือติดตั้ง — user ติดตั้ง + grant สิทธิ์
ครั้งเดียวต่อเครื่อง ไม่ต้องแก้ไขข้างใน shortcut เอง (config ดึงจาก server)
*AC: เพื่อนติดตั้งเองได้จากคู่มือโดยไม่ต้องถามวี*

**FR-HLTH-3 (P4)** อ่านข้อมูลจาก Apple Health ผ่าน Shortcut #2 → POST เข้า VPS ingest endpoint อย่างน้อย:
workouts (ชนิด/ระยะเวลา/พลังงาน), heart rate, active energy — เก็บใน Supabase ผูก user
*AC: ข้อมูลซ้ำ (timestamp เดิม) ไม่ถูก insert ซ้ำ (idempotent)*

## FR-ANLT — Analysis (P4–P5, ตาม D-006)

**FR-ANLT-1 (P4)** Dashboard สถิติพื้นฐาน: kcal balance รายวัน/สัปดาห์ (intake − TDEE ± active energy),
trend น้ำหนักเทียบ balance สะสม, สรุป protein เทียบวันเทรน
*AC: เลือกช่วงเวลาได้ (7/30/90 วัน)*

**FR-ANLT-2 (P5)** LLM insight รายสัปดาห์ (ผ่าน VPS): สรุป pattern อาหาร↔กิจกรรม↔น้ำหนักเป็นภาษาไทย
พร้อมข้อสังเกต — ระบุชัดว่าเป็นข้อสังเกตจากข้อมูล ไม่ใช่คำแนะนำทางการแพทย์
*AC: generate ได้จากปุ่มเดียว ใช้เฉพาะข้อมูลของ user ที่ขอ*

## FR-AUTH — Users & Access (P0)

**FR-AUTH-1** ระบบรองรับ ≤5 users ผ่าน Supabase Auth แบบ invite-only (วีเป็นคน invite)
RLS: diary/health/profile/weight เห็นเฉพาะเจ้าของ — custom foods/dishes อ่านได้ทุก user เขียนเฉพาะ creator
*AC: user A มองไม่เห็น diary ของ user B ทั้งจาก UI และ query ตรง (RLS test)*

---

## Changelog

- v1.6 (2026-08-19): เพิ่ม FR-CALC-4 (day-type energy target, D-019, คำสั่งวี) — baseline TDEE + allowance
  ต่อ day type (rest/light/hard), macro split ไล่ลำดับชั้น protein คงที่ → carb floor → fat floor →
  ไม่บังคับสมการถ้าชนทุก floor พร้อม UI แจ้งเตือน — เข้าคิว P4a ตาม SCOPE.md v1.4. (แก้ header version
  ที่ค้าง v1.4 ทั้งที่ changelog มี v1.5 อยู่แล้ว — stale จากรอบก่อน ไม่ได้อัปเดต header ตอนนั้น)
- v1.5 (2026-08-14): ขยาย FR-HLTH-1 (คำสั่งวี) — เพิ่ม extended nutrients แบบ best-effort (cholesterol,
  sodium, fiber, sugar, potassium, calcium, iron, vitamin C/D, saturated/mono/poly fat) นอกเหนือจาก core 4
  เดิม, ระบุชัดว่าไม่เขียน trans fat (ข้อจำกัด Apple HealthKit) และไม่เขียน magnesium/zinc/B6/B12/folate/
  phosphorus/water (ไม่มีแหล่งข้อมูลจริงในระบบ) — ดู D-020/D-021 ใน PROJECT_BIBLE
- v1.4 (2026-08-13): แก้ FR-FOOD-6 ให้ตรงเจตนาจริง (คำสั่งวี) — quick add คือ one-off diary entry
  ตรง ๆ ไม่ใช่การสร้าง custom food ใหม่ (v1.3 เข้าใจผิด) — เพิ่ม `diary_entries.source = 'quick'`
  + คอลัมน์ `quick_name` แทน
- v1.3 (2026-08-13): เพิ่ม FR-FOOD-6 (quick add custom food, คำสั่งวีระหว่าง dogfood P2) —
  `custom_foods.serving_size_g` เปลี่ยนเป็น optional เพื่อรองรับรายการที่ไม่มีน้ำหนัก serving จริง
- v1.2 (2026-08-13): Formalize สิ่งที่เกิดระหว่าง dogfood P2 (คำสั่งวี) — เพิ่ม FR-PROF-3 (nickname, D-016),
  FR-FOOD-5 (admin verification badge, D-017), แก้ FR-SET-1 ให้ตรงของจริง (tab เดียว + list หมวดย่อย แทน 2 tab แยก),
  เพิ่ม AC แก้ไข/ลบใน FR-PROF-2 (weight log)
- v1.1 (2026-08-11): แก้ตามคำสั่งวี (session C1, ระหว่างทำ Supabase schema ของ P0) —
  เพิ่ม FR-FOOD-4 (Nutrition Facts label page), อัปเดต FR-FOOD-2 ให้เก็บ nutrients panel เต็มไม่ใช่แค่ fiber/sugar/sodium,
  อัปเดต FR-FOOD-3 AC เพิ่ม "Recalculate from source" (manual only), อัปเดต FR-FOOD-1/FR-DIARY-1 AC ให้ระบุ logic
  scale ปริมาณแบบ rule of three ชัดเจน (serving count หรือกรัม) — ดู D-011 ใน PROJECT_BIBLE
- v1.0 (2026-08-11): Freeze ครั้งแรก — FR-PROF, FR-CALC, FR-SET, FR-FOOD, FR-DIARY, FR-HLTH, FR-ANLT, FR-AUTH ตาม decisions D-001–D-009
