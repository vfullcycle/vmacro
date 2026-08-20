# REQUIREMENTS — Vmacro (FROZEN v1.11, 2026-08-20)

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

**FR-FOOD-7 (P4a)** **[ยกเลิก 2026-08-20 — ดู D-023 ใน PROJECT_BIBLE §5 สำหรับเหตุผล+ตัวเลข, โค้ดยังอยู่
หลัง flag `AI_IMPORT_ENABLED=false` ถาวร ไม่มีแผนเปิด]** AI Import (D-023) — user ทุกคน (ไม่ใช่แค่ admin) กรอกชื่ออาหาร + ปริมาณ (free text) +
แนบภาพได้ (optional) → proxy เรียก Claude (key เดียวกับ D-015) คืน JSON ตาม schema เดียวกับ admin
bulk-import เป๊ะ (`name`, `serving_label`, `serving_size_g`, `kcal`, `protein_g`, `carbs_g`, `fat_g` เป็น
required, `nutrients` เป็น object เสริม — ตัด field ที่ไม่มั่นใจออกจาก `nutrients` แทนการเดา 0) → หน้า
preview แสดงทุกค่าให้แก้ไขได้ก่อน save พร้อมข้อความกำกับ "ค่าประมาณจากค่ากลาง โปรดตรวจสอบ/ปรับตามของจริง"
→ save ผ่านเส้นทาง create custom food ปกติ (creator = user เอง, ผ่าน admin verification ปกติทีหลังตาม
D-017) — LLM ไม่มีสิทธิ์เขียน DB ตรงในทุกกรณี (governance เดียวกับที่บันทึกไว้ใน D-023)
*AC: กรอกชื่อ+ปริมาณ (ไม่มีรูปก็ได้) แล้วได้ผล pre-fill ในหน้า preview ภายในเวลาที่ใช้งานได้จริง (~ไม่กี่
วินาที ไม่นับรูป); ทุก field ในหน้า preview แก้ไขได้ก่อน save เสมอ ไม่มี field ไหน read-only; save แล้ว
เห็นใน "ของฉัน" section ของ FoodSearch เหมือน custom food ที่กรอกมือ; หน้า preview ต้องมีข้อความเตือนเรื่อง
ความแม่นยำแสดงตลอดเวลา ไม่ใช่แค่ตอน error; ปิดการเข้าถึงไว้หลัง config flag จนกว่า validation (ground-truth
diff กับ custom food ที่ verify แล้ว ≥15-20 รายการ) จะผ่านและวีสั่งเปิด*

**FR-FOOD-8 (P4a)** Admin custom food list — หน้า `/settings/admin/custom-foods` (admin เท่านั้น, ตาม
D-017) แสดง list custom food ทั้งหมด (ชื่อ, ชื่อ creator, สถานะ verified) ค่าเริ่มต้นกรองเฉพาะที่ยังไม่
verify เพื่อให้ admin ไล่ตรวจได้ไว — สลับดู "ทั้งหมด" ได้ กด verify/unverify ได้ตรงจาก list โดยใช้ RPC
`set_food_verified()` เดิม (D-017) ไม่มี action อื่นนอกจากนี้ (แก้ไข/ลบยังคงทำได้เฉพาะ creator ผ่านช่องทาง
เดิม ตาม FR-FOOD-2)
*AC: เปิดหน้าแล้วเห็น list default กรองเฉพาะยังไม่ verify; สลับ filter "ทั้งหมด/ยังไม่ verify" ได้; กด
verify แล้วสถานะอัปเดตทันทีในหน้า list โดยไม่ต้อง reload และ item หายจาก filter "ยังไม่ verify" ทันที;
ยกเลิก verify ได้เหมือนใน FoodDetail (ขอ source ตอน verify, ล้าง source ตอน unverify)*

## FR-DIARY — Daily Logging (P2)

**FR-DIARY-1** บันทึกอาหารรายมื้อ (เช้า/กลางวัน/เย็น/ว่าง) ระบุ quantity — หน้าสรุปวันแสดงยอดรวม f/c/p/kcal
เทียบ target พร้อม progress ต่อ macro
*AC: เพิ่ม/แก้/ลบ entry แล้วยอดวันอัปเดตทันที; ระบุ quantity ได้ 2 ทางเหมือน FR-FOOD-1 — จำนวน serving หรือน้ำหนักจริง (g) —
scale nutrient ตามสัดส่วนจาก serving ต้นทาง (rule of three); entry เก็บ macro/nutrients snapshot (ค่าที่ scale แล้ว) ณ เวลาบันทึก*

**FR-DIARY-2** Meal template: save ชุดอาหารทั้งมื้อไว้เรียกใช้ซ้ำได้ในคลิกเดียว
*AC: apply template ลงมื้อใดก็ได้ของวันใดก็ได้*

**FR-DIARY-3** ทางลัดลดการทำซ้ำ: (a) copy ทั้งวัน/ทั้งมื้อจากเมื่อวาน (b) รายการ recent (c) favorites
*AC: บันทึกมื้อที่กินประจำได้ภายใน ≤3 taps จากหน้า diary*

## FR-DASH — Dashboard (P4a)

**FR-DASH-1 (P4a)** Dashboard tab (BL-08) แทนที่ตำแหน่ง "Weight" เดิมใน tab bar ล่าง — หน้า `/weight-log`
เดิมยังอยู่ครบ ไม่ลบ ย้ายออกจาก tab bar ไปเข้าถึงผ่านลิงก์ในหน้า Dashboard แทน องค์ประกอบ:
(1) kcal ring + P/C/F วันนี้ — ใช้ target-computation logic เดียวกับ Diary.tsx เป๊ะผ่าน shared hook
ใหม่ `useTodayTarget()` (ห้ามคำนวณซ้ำเอง กันเป้าเพี้ยนจากหน้า Diary) (2) day-type วันนี้แสดงเป็น badge
อย่างเดียว (read-only, ไม่มี selector ซ้ำ) กดแล้วพาไปหน้า Diary ถ้าต้องการเปลี่ยน (3) weight card +
sparkline ย่อ (reuse `WeightChart` component เดิม) + ลิงก์ "ดูทั้งหมด" ไปหน้า `/weight-log` (4) สรุปสัปดาห์
"บันทึกแล้ว X/7 วัน" (นับวันที่มี diary entry อย่างน้อย 1 รายการ) เป็นตัวหลัก — streak (วันติดต่อกัน) เป็น
ตัวรองหรือไม่แสดงเลยก็ได้ เพราะ streak ที่รีเซ็ตเป็น 0 เมื่อขาดวันเดียวสร้างแรงกดดันทางลบในบริบทแอปอาหาร
ส่วน X/7 ให้อภัยการขาดวันและวัดความสม่ำเสมอจริงได้ดีกว่า — **ไม่มี placeholder zone สำหรับ FR-ANLT-1**
(P4b) ในเวอร์ชันนี้ ใส่ตอน FR-ANLT-1 พร้อมของจริงแทน
*AC: ตัวเลข kcal/macro บน Dashboard ตรงกับที่หน้า Diary คำนวณเป๊ะเสมอ (ใช้ hook เดียวกัน); day-type badge
อัปเดตทันทีถ้าเปลี่ยนจากหน้า Diary โดยไม่ต้อง refresh; weight card แสดงสถานะ "ยังไม่มีข้อมูล" ได้ถ้ายังไม่
เคย log น้ำหนักเลย ไม่ error; X/7 นับถูกต้องรวมกรณี timezone ท้องถิ่น (ใช้ pattern `todayLocalDate()` เดิม);
tab bar เหลือ 4 ปุ่มเหมือนเดิม (Diary, Search, Dashboard, Settings); เปิด Dashboard วันที่ยังไม่มี diary
entry เลย (เช่นเปิดตอนเช้า) ต้องแสดงสถานะเริ่มต้นที่ดูดี — ring 0% พร้อมเป้าของวันแสดงครบ ไม่ error/หน้าโล่ง;
`/weight-log` ยังเข้าได้ตรงผ่านลิงก์จาก Dashboard เหมือนเดิมทุกอย่าง ไม่มี regression*

**[แก้ไข 2026-08-20, ระหว่าง dogfood — ยังไม่ตี tag v1.2.0]** เพิ่ม 3 ส่วนต่อจากของเดิมข้างบน (ไม่แทนที่
kcal ring + P/C/F progress bar เดิม): **(5)** composition ring แยกต่างหาก แสดงสัดส่วน "น้ำหนักที่กินจริง
วันนี้" (ไม่ใช่ progress เทียบเป้า) แบ่ง 4 ส่วน protein_g/carbs_g/fat_g/other_g รวม 100% — คำนวณจากเฉพาะ
entry ที่รู้น้ำหนักจริง (`serving_size_g` ไม่ null) เท่านั้น กันน้ำหนักรวมเพี้ยนจาก entry ที่ไม่มีน้ำหนัก
(เช่น quick-add); ไม่มี entry ไหนรู้น้ำหนักจริงเลย → ซ่อน ring พร้อมข้อความอธิบาย **(6)** breakout ring
ที่สองแสดงสัดส่วนภายในชิ้น OTH ของ ring (5) เอง จำกัดเฉพาะ nutrient ที่ไม่ซ้อนกับ P/F/C อยู่แล้ว (sodium,
cholesterol, potassium, calcium, iron, vitamin C, vitamin D — แปลง mg/mcg เป็น g ให้หน่วยตรงกันก่อนเทียบ
สัดส่วน) — **ไม่รวม fiber/sugar/saturated-trans-poly-mono fat เพราะนับซ้อนอยู่ใน carbs_g/fat_g แล้ว**;
field ไหนไม่มีข้อมูลข้ามไปเงียบๆ ไม่โชว์ 0; ไม่มี field ไหนมีข้อมูลเลย → ซ่อน ring พร้อมข้อความ **(7)**
เลือกวันอื่นได้ผ่าน date-nav แบบเดียวกับ Diary (`?date=` + ลูกศรก่อนหน้า/ถัดไป + date picker) — kcal ring,
P/C/F bars, ring (5)/(6), day-type badge, "X/7 วัน" (นับ 7 วันย้อนจากวันที่เลือก) เปลี่ยนตามวันที่เลือกหมด
**ยกเว้น weight card ที่ยังโชว์น้ำหนักล่าสุดจริงเสมอ ไม่ผูกกับวันที่เลือก**
*AC เพิ่ม: สัดส่วนใน ring (5)/(6) รวมกัน = 100% ±rounding และไม่ติดลบ, อัปเดตทันทีเมื่อ entry เปลี่ยน;
entry ไม่มีน้ำหนักจริงไม่ถูกนับเข้าฐาน (5); ไม่มี entry/field ที่ใช้ได้เลย → ซ่อน ring พร้อมข้อความ ไม่
error/NaN; ring (6) ไม่รวม field ที่นับซ้อนกับ P/F/C; เปลี่ยนวันที่แล้วทุกส่วนอัปเดตตามวันที่เลือกถูกต้อง
ยกเว้น weight card*

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

- v1.11 (2026-08-20): แก้ FR-DASH-1 ระหว่าง dogfood (คำสั่งวี, ยังไม่ตี tag v1.2.0) — เพิ่ม composition
  ring (P/F/C/OTH โดยน้ำหนักจริง), breakout ring ของ OTH (เฉพาะ nutrient ที่ไม่ซ้อนกับ P/F/C — sodium/
  cholesterol/potassium/calcium/iron/vitamin C/D), และ date-nav เลือกวันอื่นได้ (weight card ไม่ผูกวันที่)
- v1.10 (2026-08-20): เพิ่ม FR-DASH-1 (Dashboard tab, BL-08, คำสั่งวี) — kcal ring + P/C/F ผ่าน shared
  hook `useTodayTarget()`, day-type badge read-only, weight card+sparkline, สรุป "X/7 วัน" เป็นตัวหลัก
  (streak เป็นตัวรอง/ไม่บังคับ — วีปรับจากร่างเดิมเพราะ streak รีเซ็ตเป็น 0 สร้างแรงกดดันทางลบ), ตัด
  placeholder zone สำหรับ FR-ANLT-1 ออก (ใส่ทีหลังพร้อมของจริง), เพิ่ม AC วันที่ยังไม่มี diary entry
  ต้องแสดง ring 0% ไม่ error — เข้าคิว P4a แทนที่ tab "Weight" เดิม
- v1.9 (2026-08-20): FR-FOOD-7 (AI Import) ยกเลิกถาวรหลังวัดผลจริง 3 รอบ (คำสั่งวี) — ดู D-023 ใน
  PROJECT_BIBLE §5 สำหรับเหตุผลเต็ม, โค้ดเก็บไว้หลัง flag ปิดถาวร ไม่ลบ
- v1.8 (2026-08-19): เพิ่ม FR-FOOD-8 (Admin custom food list, คำสั่งวี) — หน้า admin แยกต่างหาก รวม
  Import อาหาร (เดิมอยู่แทรกใน Settings list ตรง ๆ) กับ list custom food ที่กรอง unverified เป็นค่าเริ่มต้น
  ให้ admin verify ได้จากจุดเดียว ไม่ต้องค้นหาทีละรายการผ่าน FoodSearch/FoodDetail เหมือนก่อนหน้า — ไม่มี
  action ใหม่นอกจาก verify/unverify ที่มีอยู่แล้ว (D-017), ไม่แตะ RLS/schema — เข้าคิว P4a
- v1.7 (2026-08-19): เพิ่ม FR-FOOD-7 (AI Import, D-023, คำสั่งวี) — user ทุกคนกรอกชื่อ+ปริมาณ+ภาพ (optional)
  ให้ Claude pre-fill custom food, ทุก field แก้ได้ก่อน save เสมอ, ปิดหลัง config flag จนกว่า ground-truth
  validation จะผ่าน — เข้าคิว P4a
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
