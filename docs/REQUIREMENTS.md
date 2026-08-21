# REQUIREMENTS — Vmacro (FROZEN v1.18, 2026-08-21)

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

**FR-CALC-5 (P4b)** Per-meal targets (BL-10) — ต่อยอด day-type engine (FR-CALC-4) ไม่แตะ meal enum เดิม
(เช้า/กลางวัน/เย็น/ว่าง): Profile เพิ่ม `wake_time` (เวลาตื่นนอน) + `sleep_hours_target` (default 8 ชม.)
→ คำนวณ `bedtime = wake_time − sleep_hours_target` เอง ไม่ต้องกรอกแยก
**Default เวลาต่อมื้อ (override ได้เสมอ, สูตรมีไว้เติมค่าเริ่มต้นเท่านั้น):** เช้า = กึ่งกลางของ
`wake_time+1h` ถึง `wake_time+2h`; กลางวัน = กึ่งกลางของ `เช้า+4h` ถึง `เช้า+5h` clamp ไม่เกิน 15:00; เย็น =
window กว้าง 3 ชม. สิ้นสุดที่ `bedtime−3h` (เช่น bedtime 23:00 → เย็น 17:00–20:00 — กว้างเพราะมื้อเย็นเป็น
มื้อที่เวลาแกว่งที่สุดในชีวิตจริง ออกแบบไม่มีการตัดสินจึง window กว้างไม่มีข้อเสีย); **ว่างไม่มี window เวลา
เลย** (ตามหลักการ: ของว่างคือสิ่งที่กินนอกเวลามื้อหลัก กำหนดเวลาตายตัวให้จะขัดความจริง) มีแค่ % ของตัวเองเป็น
โควตาลอยใช้เมื่อไหร่ก็ได้ทั้งวัน ไม่เข้า remaining-based display เฉพาะมื้อ
**สัดส่วน % ต่อมื้อ:** ตั้งค่าได้ใน Settings → System (default เช้า 25% / กลางวัน 35% / เย็น 30% / ว่าง 10%
รวม 100%) — เป้า kcal/protein/carb/fat ต่อมื้อ = day-type target วันนั้น (FR-CALC-4) × % มื้อนั้น (สัดส่วน
เดียวกันทั้ง 4 ค่า)
**Remaining-based display (Diary + Dashboard):** อยู่ใน window ของมื้อหลักมื้อไหน → โชว์เป้ามื้อนั้น เทียบกับ
ที่กินไปแล้ว (นับจาก entry ที่ลงเป็นมื้อนั้นวันนี้), เหลือ = เป้า−กินไปแล้ว, เกิน → โชว์ส่วนเกินตรงๆ (ข้อเท็จจริง
ล้วน ไม่มีน้ำเสียงตัดสินทั้งสองทิศทาง — ห้ามคำเช่น "ควร"/"มากไป"/"ดีแล้ว"); อยู่นอกทุก window → โชว์
"มื้อถัดไป: [ชื่อ] ช่วงเวลาโดยประมาณ + เป้า" เฉยๆ ไม่มี remaining เพราะยังไม่เริ่ม
**Override vs recalculate:** แก้ `wake_time`/`sleep_hours_target` แล้ว **มื้อที่ user เคย override เวลาเอง
ต้องไม่ถูกคำนวณทับอัตโนมัติ** (หลักเดียวกับ formula_choice ตอน Katch fallback — เจตนาที่ user แสดงชัดต้องไม่
ถูกเขียนทับเงียบๆ) ต้องกด reset เองถึงจะกลับไปใช้ค่าที่คำนวณใหม่ — ตอนแก้ wake_time/sleep_hours ต้องมี
ข้อความแจ้งชัดว่า "มื้อที่ตั้งเวลาเองไว้จะไม่เปลี่ยน — กด reset ถ้าต้องการใช้เวลาที่คำนวณใหม่"
**ไม่มี notification ในเฟสนี้** — visual cue ในแอปเท่านั้น เห็นเฉพาะตอนเปิดแอป
*AC: (1) ยังไม่ตั้ง `wake_time` → ไม่โชว์ UI ส่วนนี้เลยทั้ง Diary/Dashboard, หน้าเป้าทั้งวันแบบเดิมทำงาน
ปกติ ไม่ error; (2) เวลา default แต่ละมื้อคำนวณตามสูตรถูกต้อง รวม clamp กลางวัน/window เย็น 3 ชม.; user
แก้เวลามื้อไหนตรงๆ ได้ใน Settings ค่านั้นไม่ถูกคำนวณทับจนกว่าจะกด reset; แก้ wake_time/sleep_hours แสดง
ข้อความเตือนตามที่ระบุ; (3) % ต่อมื้อรวมต้อง 100% ถึงบันทึกได้ แก้แล้วเป้าทุกมื้ออัปเดตทันที; (4) เป้าต่อมื้อ
(kcal/protein/carb/fat) = day-type target × % มื้อนั้น เป๊ะ; (5) อยู่ใน window มื้อหลัก → remaining ถูกต้อง
ตามสูตร, เกินเป้า → ข้อความข้อเท็จจริงล้วน ไม่มีคำเชิงตัดสินทั้งสองทิศทาง (ตรวจสอบได้จาก copy จริงที่ใช้ใน UI);
(6) เวลาปัจจุบันอยู่นอกทุก window มื้อหลัก (เช่นตี 2) → โชว์ "มื้อถัดไป" พร้อมช่วงเวลาโดยประมาณ+เป้า ไม่มี
remaining/เกิน; (7) มื้อว่างไม่มี window เวลา ไม่ปรากฏใน remaining-based display เฉพาะมื้อเลย มีแค่ %
ของตัวเองรวมอยู่ในเป้าทั้งวัน; (8) ไม่มี push/local notification เกิดขึ้นเลยในฟีเจอร์นี้; (9) แสดงผลทั้งหน้า
Diary และ Dashboard; (10) **การ์ดนี้แสดงเฉพาะตอนดูวันนี้เท่านั้น** — เปิดดู Diary ของวันอื่น (ย้อนหลัง/
ล่วงหน้า) ต้องไม่แสดงการ์ดนี้เลย เพราะ "มื้อปัจจุบัน" อ้างอิงเวลาจริง ณ ตอนนี้ นำไปแปะกับข้อมูลวันอื่นไม่มี
ความหมาย (พบระหว่าง implement, บันทึกเป็น AC กันหายตอน refactor ในอนาคต)*

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

**FR-FOOD-9 (P4c)** ขออาหารใหม่ในแอป (BL-12, ทดแทน D-023/AI Import ที่ยกเลิก) — user ทุกคนกดปุ่ม
"ขอเพิ่มอาหาร" จากหน้า FoodSearch ได้เสมอ (แสดงเป็นลิงก์เล็กท้ายผลลัพธ์เมื่อมีผลค้นหา, เป็นปุ่มเด่นกลางจอ
เมื่อไม่พบผลลัพธ์เลย — จังหวะที่ user ต้องการทางออกที่สุด) → กรอกฟอร์ม: ชื่ออาหาร (required), ปริมาณ/
รายละเอียด (required, free text), แนบรูป (optional, resize+แปลง base64 ด้วย `resizeImageToBase64()` ที่มี
อยู่แล้ว ไม่เขียนใหม่) → เข้าคิวตาราง `food_requests` ใหม่ ผูก requester, สถานะเริ่มที่ `pending`
→ admin เห็น list คำขอทั้งหมดในหน้าใหม่ `/settings/admin/food-requests` (เข้าชุด D-017 admin gate) เปลี่ยน
สถานะเป็น `fulfilled` (เพิ่มแล้ว) หรือ `declined` (ไม่ดำเนินการ — กันคำขอค้าง pending ตลอดกาล เช่น
ซ้ำของเดิม/ข้อมูลไม่พอ) พร้อม **โน้ตข้อความ optional ส่งกลับให้ requester เห็น** (เช่น "มีอยู่แล้วชื่อ X"
หรือ "ขอรูปฉลากเพิ่ม" — กรณีจริงไม่ได้มีแค่ "เพิ่มแล้ว" เฉยๆ ถ้าไม่มีช่องนี้ต้องไปทักนอกแอปอยู่ดี ขัดกับเหตุผล
ที่สร้างฟีเจอร์นี้ขึ้นมา) — ไม่บังคับ link กับ custom_food ที่สร้างจริง (เก็บง่ายสุด) — **ไม่มี push
notification** — requester เห็นสถานะ+โน้ตเปลี่ยนเฉพาะตอนเปิดแอปที่หน้า "คำขอของฉัน" ใหม่ (เข้าหลักการเดียว
กับ BL-10)
*AC: กด "ขอเพิ่มอาหาร" กรอกฟอร์มได้ครบตามที่ระบุ ทั้งจากสถานะมีผล/ไม่มีผลค้นหา; submit สำเร็จเห็นคำขอ
ตัวเองในหน้า "คำขอของฉัน" สถานะ "รอดำเนินการ"; admin เห็น list คำขอ pending ของทุก user เปลี่ยนสถานะเป็น
fulfilled/declined พร้อมใส่โน้ตได้; requester เห็นสถานะ+โน้ตของ admin เปลี่ยนตอนเปิดแอป ไม่มี notification
ใดๆ; รูปที่แนบ resize+แปลง base64 ก่อนส่ง เก็บใน column เดียว ไม่สร้าง Storage bucket ใหม่; RLS — user
เห็น/สร้างคำขอตัวเองเท่านั้น, admin เห็น/แก้ไขสถานะ+โน้ตของทุกคนได้*

## FR-DIARY — Daily Logging (P2)

**FR-DIARY-1** บันทึกอาหารรายมื้อ (เช้า/กลางวัน/เย็น/ว่าง) ระบุ quantity — หน้าสรุปวันแสดงยอดรวม f/c/p/kcal
เทียบ target พร้อม progress ต่อ macro
*AC: เพิ่ม/แก้/ลบ entry แล้วยอดวันอัปเดตทันที; ระบุ quantity ได้ 2 ทางเหมือน FR-FOOD-1 — จำนวน serving หรือน้ำหนักจริง (g) —
scale nutrient ตามสัดส่วนจาก serving ต้นทาง (rule of three); entry เก็บ macro/nutrients snapshot (ค่าที่ scale แล้ว) ณ เวลาบันทึก*

**FR-DIARY-2** Meal template: save ชุดอาหารทั้งมื้อไว้เรียกใช้ซ้ำได้ในคลิกเดียว
*AC: apply template ลงมื้อใดก็ได้ของวันใดก็ได้*

**FR-DIARY-3** ทางลัดลดการทำซ้ำ: (a) copy ทั้งวัน/ทั้งมื้อจากเมื่อวาน (b) รายการ recent (c) favorites
*AC: บันทึกมื้อที่กินประจำได้ภายใน ≤3 taps จากหน้า diary*

**FR-DIARY-4 (P4c)** ราคาต่อ diary entry (BL-01, optional) — `diary_entries` เพิ่ม column `price_baht`
(nullable, ไม่กระทบ entry เดิม) — ช่องกรอกราคาอยู่เฉพาะ **4 จุดที่มีฟอร์มอยู่แล้ว** (add-to-diary จาก
FoodDetail ทั้ง 3 source: custom food/FatSecret/dish, และ QuickAddFoodModal) — **ตั้งใจไม่เพิ่มช่องราคาใน
เส้นทาง tap-to-add ทั้ง 5 จุด** (favorites, recent, meal template, copy ทั้งวัน/ทั้งมื้อจากเมื่อวาน) เพราะ
จะขัดกับ "≤3 taps" ที่ FR-DIARY-3 ตั้งใจไว้ — entry จากทางนั้น `price_baht = null` เสมอ ยกเว้น
copy-from-yesterday ที่ copy ทั้ง row มา ราคาเดิมอาจติดมาด้วย (ยอมรับได้ แก้ทีหลังได้) — หน้าสรุปวันแสดง
ยอดรวมราคาเฉพาะ entry ที่มีราคา, ช่อง edit entry เดิมเพิ่มช่องแก้ราคาด้วย
*AC: `price_baht` optional เสมอ, entry เดิมก่อน migration ไม่กระทบ; 4 จุดฟอร์ม (FoodDetail × 3,
QuickAddFoodModal) มีช่องราคา; 5 จุด tap-to-add ไม่มีช่องราคาเพิ่มตามที่ scope ไว้; ยอดรวมราคาวันนั้นนับ
เฉพาะ entry ที่มีราคา ไม่มี entry ไหนมีราคาเลย → ไม่แสดงยอดรวม (ไม่โชว์ "0 บาท"); แก้ไขราคา entry เดิมได้
ผ่านช่อง edit ที่มีอยู่แล้ว*

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
kcal ring + P/C/F progress bar เดิม): **(5)** composition ring แยกต่างหาก แสดงสัดส่วนสารอาหารที่กินจริง
วันนี้ (ไม่ใช่ progress เทียบเป้า) แบ่ง 4 ส่วน protein_g/carbs_g/fat_g/other_g **(6)** breakout ring ที่สอง
แสดงสัดส่วนภายในชิ้น OTH ของ ring (5) เอง จำกัดเฉพาะ nutrient ที่ไม่ซ้อนกับ P/F/C อยู่แล้ว (sodium,
cholesterol, potassium, calcium, iron, vitamin C, vitamin D — แปลง mg/mcg เป็น g ให้หน่วยตรงกันก่อนเทียบ
สัดส่วน) — **ไม่รวม fiber/sugar/saturated-trans-poly-mono fat เพราะนับซ้อนอยู่ใน carbs_g/fat_g แล้ว**;
field ไหนไม่มีข้อมูลข้ามไปเงียบๆ ไม่โชว์ 0 **(7)** เลือกวันอื่นได้ผ่าน date-nav แบบเดียวกับ Diary (`?date=`
+ ลูกศรก่อนหน้า/ถัดไป + date picker) — kcal ring, P/C/F bars, ring (5)/(6), day-type badge, "X/7 วัน"
(นับ 7 วันย้อนจากวันที่เลือก) เปลี่ยนตามวันที่เลือกหมด **ยกเว้น weight card ที่ยังโชว์น้ำหนักล่าสุดจริงเสมอ
ไม่ผูกกับวันที่เลือก**

**[แก้ไขซ้ำ 2026-08-20, พบระหว่าง dogfood จริง]** ring (5) เวอร์ชันแรกคำนวณ `other_g` จาก
`serving_size_g` (น้ำหนักจานทั้งจาน) ลบด้วย protein/carb/fat — **ผิด** เพราะสำหรับ custom food ที่พิมพ์เอง
(อาหารไทยส่วนใหญ่ในแอปนี้) `serving_size_g` กับตัวเลข macro เป็นค่าที่กรอกแยกกันคนละที่มา ไม่การันตีว่ามา
จากการวัดตัวอย่างเดียวกัน — ผลลัพธ์ปนความคลาดเคลื่อนจากการกรอกข้อมูลเข้ากับมวลจริง (น้ำ/fiber) แยกไม่ออก
(กรณีทดสอบจริง: ข้าวผัดปลากระป๋อง 300g ให้ "อื่นๆ 68%" ซึ่งตีความไม่ได้ว่าคือน้ำจริงหรือ error จากข้อมูล) —
**แก้เป็น:** ฐาน 100% ของ ring (5) คือผลรวมของสิ่งที่วัดได้จริงเท่านั้น (protein_g + carbs_g + fat_g +
ผลรวม other จาก ring (6) ที่แปลงเป็นกรัมแล้ว) ไม่พึ่ง `serving_size_g`/น้ำหนักจานเลย — ข้อดี: ใช้ได้ทุก entry
ไม่ต้องจำกัดเฉพาะที่รู้น้ำหนักจริงอีกต่อไป (ตัด AC เดิมข้อ "entry ไม่มีน้ำหนักจริงไม่ถูกนับเข้าฐาน" ออก)
*AC (แก้ไขล่าสุด): สัดส่วนใน ring (5)/(6) รวมกัน = 100% ±rounding และไม่ติดลบ, อัปเดตทันทีเมื่อ entry
เปลี่ยน; ring (5) ไม่ใช้ `serving_size_g`/น้ำหนักจานเป็นฐานอีกต่อไป — ฐาน = ผลรวม protein_g+carbs_g+fat_g+
other(ผลรวมจาก ring (6)); ไม่มี entry/field ที่ใช้ได้เลยทั้งวัน → ซ่อน ring พร้อมข้อความ ไม่ error/NaN;
ring (6) ไม่รวม field ที่นับซ้อนกับ P/F/C; เปลี่ยนวันที่แล้วทุกส่วนอัปเดตตามวันที่เลือกถูกต้อง ยกเว้น
weight card*

**FR-DASH-2 (ยังไม่กำหนด phase)** Feed + notification badge (รวม BL-14 + BL-09 ส่วนที่ 1 เป็น FR เดียว
เพราะใช้กลไก "มีอะไรใหม่ตั้งแต่เปิดดูครั้งล่าสุด" เดียวกัน) — Profile เพิ่ม `feed_last_seen_at` (default
`now()` ตอน migrate/สมัครใหม่ กันของเก่าทั้งหมดโผล่เป็น "ใหม่" พรวดเดียวตอน launch) → **badge จุดแดงบนไอคอน
แท็บ Dashboard** เช็คตอนเปิดแอปเท่านั้น (ไม่ push): มีอะไร `created_at`/`updated_at` ใหม่กว่า
`feed_last_seen_at` ใน 3 แหล่งนี้ไหม — (1) อาหารใหม่ที่ **admin** เพิ่ม (`custom_foods` join
`profiles.is_admin=true` — join ไม่ hardcode uuid เผื่ออนาคตมี admin เพิ่มคนอื่น) (2) จานใหม่จาก **ทุกคน**
(`dishes`, ไม่จำกัด admin เพราะจานไม่มี concept verify ให้กรองคุณภาพเหมือน custom_foods อยู่แล้ว — เป็น
เนื้อหาเดียวใน feed ที่มาจากเพื่อนโดยตรง ถือเป็นสัญญาณเสริมสำหรับตัดสิน BL-09 ส่วนที่ 2 ในอนาคตด้วย) (3)
คำขอของตัวเอง (`food_requests`) ที่ถูกตอบแล้ว (fulfilled/declined พร้อมโน้ต admin ถ้ามี)
→ **Dashboard section ใหม่ "มีอะไรใหม่"** รวม 3 ประเภทเรียงตามเวลาล่าสุดก่อน → **ไม่ mark ว่าอ่านแล้วทันที
ตอน mount** (เร็วเกินไป — เปิด Dashboard แล้วสลับแท็บทันทีจะทำให้ของใหม่หายตลอดกาลทั้งที่ยังไม่ได้อ่าน) ต้อง
หน่วง 2-3 วินาทีก่อนอัปเดต `feed_last_seen_at = now()` (ยกเลิก timer ถ้า unmount ก่อนครบเวลา — สลับแท็บเร็ว
= ไม่ mark)
*AC: user ใหม่/หลัง migrate ไม่เห็นของเก่าทั้งหมดเป็น "ใหม่" พรวดเดียว; badge ขึ้นเฉพาะเมื่อมีของจริงใหม่กว่า
cursor จากทั้ง 3 แหล่ง; อยู่ในหน้า Dashboard ครบ 2-3 วินาทีแล้วเท่านั้น badge จึงหาย, สลับแท็บออกก่อนครบเวลา
badge ต้องยังอยู่ (ทดสอบ race condition นี้โดยเฉพาะ); ไม่มี push/local notification ใดๆ ทั้งฟีเจอร์; feed
แสดงรวมกันไม่เกิน 15-20 รายการ**รวมทุกประเภท**ต่อครั้ง (ไม่ใช่ต่อประเภท) เรียงเวลาใหม่สุดก่อน มีลิงก์
"ดูทั้งหมด" ถ้าเกิน*

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

**FR-HLTH-3 (P4b)** **[PARTIAL 2026-08-21 — server เสร็จ+deploy+migration รันแล้ว, client (Shortcut #2)
เลื่อนเป็น backlog BL-13 ตามคำสั่งวี (ยังไม่พร้อมลงเวลาต่อ Shortcut ทีละ action บนเครื่องจริง) — API
contract ยืนยันแล้วที่ `docs/shortcuts/shortcut-2-read.md` หยิบต่อได้ทันทีไม่ต้องแก้ spec นี้เลย]**
อ่านข้อมูลจาก Apple Health ผ่าน Shortcut #2 → POST เข้า VPS ingest endpoint ใหม่ (auth
ด้วย per-user token เดียวกับที่ Shortcut #1 ใช้ตาม D-020 — ไม่สร้างระบบ auth ใหม่) เก็บใน Supabase ผูก user
อย่างน้อย: **(1) workout ต่อ session** — ชนิดกิจกรรม (ตามที่ HealthKit ให้มา ไม่ filter เฉพาะบางชนิด),
เวลาเริ่ม, ระยะเวลา, พลังงานที่เผาผลาญของ workout นั้น (kcal), average heart rate ของ workout นั้น
**(2) resting heart rate** 1 ค่า/วัน **(3) active energy** ยอดรวมทั้งวัน หน่วย kcal (ไม่แยกช่วงเวลา —
คนละตัวกับพลังงานต่อ workout ใน (1)) — **ไม่เก็บ** HRV หรือ raw heart rate sample ในเวอร์ชันนี้ (บันทึกเป็น
backlog พิจารณาตอน P5, confounder เยอะเกินไปสำหรับ P4) โครงสร้างต้องแยก 2 พฤติกรรม: (1) เป็น event log
กันซ้ำแบบ insert-once ด้วย unique(user, เวลาเริ่ม, ชนิด); (2)/(3) เป็นค่าต่อ (user, วันที่) ที่ต้อง **upsert
ทับได้** ไม่ใช่กันซ้ำแบบปฏิเสธ เพราะ sync กลางวันแล้ว sync อีกทีตอนเย็นจะได้ active energy ที่สมบูรณ์กว่า
ต้องทับค่าเดิม
*AC: (1) workout event ที่มี (user, เวลาเริ่ม, ชนิด) ซ้ำกับที่มีอยู่แล้วไม่ insert ซ้ำ (idempotent);
(2) sync resting HR/active energy รวมวันซ้ำในวันเดียวกันทับค่าเดิมด้วยค่าล่าสุด (upsert ไม่ใช่ reject);
(3) workout ที่ไม่มี average HR (เช่น Watch ไม่ได้สวมตอนนั้น) insert ได้ปกติ field นั้นเป็น null ไม่ block
ทั้ง record (best-effort เหมือน FR-HLTH-1); (4) endpoint auth ด้วย per-user token เดียวกับ Shortcut #1
(D-020); (5) ไม่มี field เกี่ยวกับ HRV หรือ raw HR sample ถูกเก็บในเวอร์ชันนี้; (6) เจอข้อจำกัดของ
Shortcuts ระหว่าง build ที่ทำให้อ่าน field ไหนไม่ได้จริง (ตาม pattern D-022) ต้องหยุดแจ้งวีพร้อมทางเลือก
ไม่เงียบไปหาทางลัดเอง; (7) เก็บ `synced_at` (เวลา sync ล่าสุด) ต่อ (user, วันที่) คู่กับ daily stats ใน (2)/(3)
— จำเป็นสำหรับ FR-ANLT-1 เพื่อรู้ว่าวันไหน sync ตอนบ่าย (active energy ต่ำกว่าจริง) vs sync ครบวันแล้ว
กันเอาไปคำนวณ balance ปนกันโดยไม่มีใครรู้*

## FR-ANLT — Analysis (P4–P5, ตาม D-006)

**FR-ANLT-1 (P4b)** **[เลื่อน 2026-08-21 — พึ่งข้อมูลจาก FR-HLTH-3 client (Shortcut #2) ที่ยังไม่เริ่ม
(ดู BL-13) ทำก่อนไม่ได้จนกว่าจะมีข้อมูลสะสมจริง — AC ด้านล่าง freeze ไว้ตามที่ตกลง ใช้ตรงได้เมื่อกลับมาทำ]**
Dashboard สถิติพื้นฐาน 3 metric ใช้ข้อมูลจริงจาก FR-HLTH-3 (ไม่ใช่แผน/day-type ที่
เลือกไว้ล่วงหน้า):
**(1) kcal balance** = `intake − baseline_TDEE − active_energy_actual` — **`baseline_TDEE` ต้องเป็น BMR ×
baseline activity multiplier ที่ไม่รวม exercise ตามนิยาม D-019 เท่านั้น ห้ามใช้ TDEE เดิมก่อนมี day-type**
เพราะจะนับ activity ซ้ำสองรอบ (รอบแรกในตัว multiplier เดิม รอบสองใน active energy จริงที่มาบวกซ้ำ) ทำให้
balance ติดลบเกินจริงทุกวัน — กับดักคลาสสิกเวลาผสม TDEE แบบเดิมกับข้อมูล wearable
**(2) trend น้ำหนักเทียบ balance สะสม** — แสดงเป็น 2 เส้น/กราฟแยกกันแชร์ x-axis เดียวกัน (น้ำหนักจาก
`weight_logs`, balance สะสมจาก metric 1) ไม่ทำ dual-axis chart ซับซ้อน
**(3) สรุป protein เทียบวันเทรน** — "วันเทรน" นิยามจาก workout จริงที่ sync เข้ามา (มี record ใน
`health_workouts` อย่างน้อย 1 รายการวันนั้น) ไม่ใช่ day-type ที่เลือกไว้ล่วงหน้า — เก็บค่า day-type ที่เลือก
ไว้คู่กันด้วย (ยังไม่ต้องแสดงผลใน FR นี้) เผื่อเปรียบเทียบ "แผน vs จริง" ในอนาคต (บอกความแม่นของการวางแผน
+ เป็นฐานสำหรับ auto-set day-type จาก workout ในอนาคต)
*AC: เลือกช่วงเวลาได้ (7/30/90 วัน); metric 1 แสดงตัวเลข/กราฟรายวันในช่วงที่เลือก + ผลรวมสะสม;
`baseline_TDEE` ที่ใช้ต้องไม่รวม exercise multiplier ใดๆ (ตรวจสอบได้ว่าไม่ใช่ TDEE เดิม); metric 2 แสดง 2
กราฟแยกกัน ไม่ทำ dual-axis; metric 3 = ค่าเฉลี่ย protein_g ของวันที่มี workout จริงเทียบวันที่ไม่มี ในช่วงที่
เลือก, เก็บ day-type คู่กันไว้ในข้อมูล (ไม่แสดงผล); วันที่ไม่มีข้อมูล health (ยังไม่ sync) ไม่ทำให้ metric
พังทั้งช่วง — ข้ามวันนั้นไปเงียบๆ*

**FR-ANLT-2 (P5)** LLM insight รายสัปดาห์ (ผ่าน VPS): สรุป pattern อาหาร↔กิจกรรม↔น้ำหนักเป็นภาษาไทย
พร้อมข้อสังเกต — ระบุชัดว่าเป็นข้อสังเกตจากข้อมูล ไม่ใช่คำแนะนำทางการแพทย์
*AC: generate ได้จากปุ่มเดียว ใช้เฉพาะข้อมูลของ user ที่ขอ*

## FR-AUTH — Users & Access (P0)

**FR-AUTH-1** ระบบรองรับ ≤5 users ผ่าน Supabase Auth แบบ invite-only (วีเป็นคน invite)
RLS: diary/health/profile/weight เห็นเฉพาะเจ้าของ — custom foods/dishes อ่านได้ทุก user เขียนเฉพาะ creator
*AC: user A มองไม่เห็น diary ของ user B ทั้งจาก UI และ query ตรง (RLS test)*

---

## Changelog

- v1.18 (2026-08-21): เพิ่ม FR-DASH-2 (feed + notification badge, รวม BL-14 + BL-09 ส่วนที่ 1, คำสั่งวี)
  — badge จุดแดงบนแท็บ Dashboard, feed 3 ประเภท (อาหารใหม่จาก admin, จานใหม่จากทุกคน, คำขอของตัวเองที่ถูก
  ตอบ), หน่วง mark-as-seen 2-3 วินาทีกัน false-read, จำกัดรวม 15-20 รายการทุกประเภทรวมกัน — ยังไม่กำหนด phase
- v1.17 (2026-08-21): เพิ่ม FR-FOOD-9 (ขออาหารใหม่ในแอป, BL-12, คำสั่งวี) และ FR-DIARY-4 (ราคาต่อ entry,
  BL-01, คำสั่งวี) — เข้าคิว P4c: FR-FOOD-9 มี status 3 แบบ (pending/fulfilled/declined) + โน้ต admin
  ส่งกลับ requester, FR-DIARY-4 จำกัดช่องราคาเฉพาะ 4 จุดที่มีฟอร์มอยู่แล้ว ไม่แตะ tap-to-add 5 จุดที่ต้อง
  คง ≤3 taps ตาม FR-DIARY-3
- v1.16 (2026-08-21): FR-CALC-5 ผ่าน dogfood (คำสั่งวี) — เพิ่ม AC (10) การ์ดแสดงเฉพาะวันนี้เท่านั้น (เคยเป็น
  แค่การตัดสินใจตอน implement ไม่ได้บันทึกเป็น AC มาก่อน กันหายตอน refactor ในอนาคต) — ปรับ UI เป็น
  progress bar สี (แดง=เกินเป้า, เขียว=ไม่เกิน) แทนข้อความล้วน
- v1.15 (2026-08-21): เพิ่ม FR-CALC-5 (per-meal targets, BL-10, คำสั่งวี) — เวลาต่อมื้อ default จาก
  wake_time/sleep_hours_target (override ได้เสมอ ไม่ถูกทับอัตโนมัติ), % ต่อมื้อปรับได้ (default 25/35/30/10),
  remaining-based display โทนข้อเท็จจริงล้วนไม่มีคำตัดสิน, มื้อว่างไม่มี time window (โควตาลอย), ไม่มี
  notification เฟสนี้ — เข้าคิว P4b เป็นงานหลัก
- v1.14 (2026-08-21): เลื่อน FR-HLTH-3 client (Shortcut #2) + FR-ANLT-1 ออกจาก P4b เป็น backlog BL-13
  (คำสั่งวี) — server ฝั่ง FR-HLTH-3 เสร็จ+deploy+migration แล้ว คงไว้, spec/AC ทั้งคู่ freeze ไว้ตามเดิม
  ใช้ต่อได้ทันทีเมื่อกลับมาทำ
- v1.13 (2026-08-21): แก้ FR-HLTH-3 + FR-ANLT-1 เต็ม (คำสั่งวี, เริ่ม P4b) — FR-HLTH-3: scope field เต็ม
  (workout event/resting HR/active energy รวมวัน), แยก dedup 2 พฤติกรรม (workout insert-once vs daily
  stats upsert) + `synced_at`; FR-ANLT-1: balance ใช้ baseline_TDEE (ไม่รวม exercise) + active energy จริง
  กันนับ activity ซ้ำสอง, วันเทรนนิยามจาก workout จริงไม่ใช่ day-type ที่เลือกไว้ (เก็บคู่กันไว้เทียบทีหลัง)
- v1.12 (2026-08-20): แก้ FR-DASH-1 ring (5) ซ้ำ (คำสั่งวี, พบระหว่าง dogfood) — สูตรเดิมใช้ `serving_size_g`
  ลบด้วย macro ผิด เพราะ custom food ส่วนใหญ่กรอกน้ำหนัก/macro แยกกันคนละที่มา ไม่การันตีสอดคล้องกัน
  (กรณีทดสอบจริงให้ "อื่นๆ 68%" ตีความไม่ได้) — เปลี่ยนฐาน 100% เป็นผลรวมของสิ่งที่วัดได้จริงเท่านั้น
  (P+C+F+other จาก ring (6)) ไม่พึ่งน้ำหนักจานอีกต่อไป
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
