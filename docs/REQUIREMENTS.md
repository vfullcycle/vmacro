# REQUIREMENTS — Vmacro (FROZEN v1.0, 2026-08-11)

> แก้ไขได้เฉพาะเมื่อวีสั่ง + bump version + บันทึก changelog ท้ายไฟล์
> ทุก FR ระบุ phase ที่ implement ตาม SCOPE.md

---

## FR-PROF — Profile & Body Data (P1)

**FR-PROF-1** ระบบเก็บข้อมูลใน Settings → Profile: เพศ, วันเกิด (คำนวณอายุอัตโนมัติ), ส่วนสูง (cm),
น้ำหนักปัจจุบัน (kg), activity level (5 ระดับมาตรฐาน: sedentary → extra active), เป้าหมาย (ลด/รักษา/เพิ่มน้ำหนัก),
body fat % (optional — จำเป็นเฉพาะเมื่อเลือกสูตร Katch-McArdle)
*AC: บันทึกแล้วค่า TDEE/target อัปเดตทันทีทุกหน้า, body fat ว่างได้โดยไม่ block สูตรอื่น*

**FR-PROF-2** การอัปเดตน้ำหนักทุกครั้งเก็บเป็น weight log (timestamp) เพื่อทำ trend — ไม่ทับค่าเดิม
*AC: มีกราฟ trend น้ำหนักย้อนหลังดูได้*

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

## FR-SET — Settings (P1)

**FR-SET-1** Settings แยก 2 ส่วนชัดเจน: **Profile** (ข้อมูลร่างกาย/เป้าหมาย/สูตร ตาม FR-PROF, FR-CALC)
และ **System** (หน่วยแสดงผล, ค่า default protein g/kg และ fat %, การจัดการ meal templates, ลิงก์ติดตั้ง Shortcuts + สถานะเชื่อมต่อ)

## FR-FOOD — Food Database & Search (P2)

**FR-FOOD-1** ค้นหาอาหารจาก FatSecret API (ผ่าน VPS proxy) พร้อม autocomplete และแสดง fatsecret attribution ถาวรบนหน้า search
*AC: เลือกผลลัพธ์แล้วเห็น f/c/p/kcal ต่อ serving และปรับ quantity/หน่วยได้*

**FR-FOOD-2** สร้าง custom food ได้เอง (ชื่อ, serving, f/c/p/kcal และ field เสริม fiber/sugar/sodium)
ทุก record ผูก creator — **user อื่นในระบบค้นหาเจอและใช้บันทึกได้ แต่แก้/ลบได้เฉพาะ creator**
*AC: ผลค้นหารวม 2 แหล่ง (FatSecret + custom) แยก label ชัดเจน และแสดงชื่อ creator บน custom food*

**FR-FOOD-3** Dish builder: ประกอบจานจากหลายวัตถุดิบ (custom หรือ FatSecret) ระบุปริมาณต่อวัตถุดิบ
→ ระบบรวม macro อัตโนมัติ → save เป็นจานที่ค้นหา/บันทึกซ้ำได้เหมือน food ปกติ (แชร์ข้าม user แบบเดียวกับ FR-FOOD-2)
*AC: แก้ปริมาณวัตถุดิบใน builder แล้วยอดรวมอัปเดตทันที; จานที่ save แล้วเก็บ snapshot ไม่เปลี่ยนตามวัตถุดิบต้นทาง*

## FR-DIARY — Daily Logging (P2)

**FR-DIARY-1** บันทึกอาหารรายมื้อ (เช้า/กลางวัน/เย็น/ว่าง) ระบุ quantity — หน้าสรุปวันแสดงยอดรวม f/c/p/kcal
เทียบ target พร้อม progress ต่อ macro
*AC: เพิ่ม/แก้/ลบ entry แล้วยอดวันอัปเดตทันที; entry เก็บ macro snapshot ณ เวลาบันทึก*

**FR-DIARY-2** Meal template: save ชุดอาหารทั้งมื้อไว้เรียกใช้ซ้ำได้ในคลิกเดียว
*AC: apply template ลงมื้อใดก็ได้ของวันใดก็ได้*

**FR-DIARY-3** ทางลัดลดการทำซ้ำ: (a) copy ทั้งวัน/ทั้งมื้อจากเมื่อวาน (b) รายการ recent (c) favorites
*AC: บันทึกมื้อที่กินประจำได้ภายใน ≤3 taps จากหน้า diary*

## FR-HLTH — Apple Health Integration (P3–P4)

**FR-HLTH-1 (P3)** เขียนยอดวันลง Apple Health อย่างน้อย: dietary energy, fat, carbohydrates, protein
ผ่าน Shortcut #1 ที่ดึงข้อมูลจาก VPS endpoint (auth ต่อ user)
*AC: run Shortcut แล้วค่าใน Health app ตรงกับหน้าสรุปวันของ Vmacro*

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

- v1.0 (2026-08-11): Freeze ครั้งแรก — FR-PROF, FR-CALC, FR-SET, FR-FOOD, FR-DIARY, FR-HLTH, FR-ANLT, FR-AUTH ตาม decisions D-001–D-009
