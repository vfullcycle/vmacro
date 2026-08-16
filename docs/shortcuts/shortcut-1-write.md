# Shortcut #1 — เขียนยอด macro รายวันเข้า Apple Health (FR-HLTH-1/2)

คู่มือนี้มี 2 ส่วน: **สร้างครั้งแรก** (สำหรับวี — ยังไม่มี Shortcut/ลิงก์ให้ใครเลย) และ **ติดตั้งจากลิงก์**
(สำหรับเพื่อนที่ได้ลิงก์จากวีแล้ว หรือวีเองตอนติดตั้งซ้ำบนเครื่องอื่น)

> **หมายเหตุก่อนเริ่ม**: ชื่อ/หน้าตาเมนูของ action ในแอป Shortcuts อาจต่างกันเล็กน้อยตาม iOS version
> แต่โครงสร้างและลำดับด้านล่างถูกต้องแน่นอน — วิธีหา action ที่เร็วและชัวร์ที่สุดคือกด **+** (Add Action)
> แล้ว**พิมพ์ชื่อ action ค้นหาตรงๆ** ในช่องค้นหาด้านบน แทนการไล่ดูตาม category

## ส่วนที่ 1 — สร้างครั้งแรก (ทำครั้งเดียวโดยวี)

1. เปิดแอป **Shortcuts** บน iPhone → กด **+** (New Shortcut) → ตั้งชื่อ **`Vmacro: Sync to Health`
   เป๊ะๆ** (ตัวพิมพ์ใหญ่เล็ก/เว้นวรรคต้องตรงทุกตัวอักษร) — หรือถ้าอยากตั้งชื่ออื่น ให้ไปเปลี่ยนที่ Vmacro →
   Settings → System → ช่อง "ชื่อ Shortcut #1" ให้ตรงกับที่ตั้งไว้ที่นี่ (ปุ่ม "ซิงก์เข้า Apple Health" ใน
   หน้า Diary จะเปิด Shortcut ด้วยชื่อที่ตั้งไว้ในนั้น)
2. ใส่ action ทั้งหมดตามหัวข้อ **"สร้าง action ทีละขั้น"** ด้านล่าง (มีทั้งหมด ~69 action — ยาวแต่ทำตาม
   pattern ซ้ำๆ ได้ ไม่ต้องคิดเอง)
3. ไปที่ Vmacro → **Settings → System** → เลื่อนลงมาส่วน "Apple Health" → กด **"สร้าง Token"** → กด
   **"คัดลอก"** (token จะแสดงครั้งเดียว คัดลอกให้ทันก่อนออกจากหน้านี้) แล้ววางในช่อง Text แรกสุดของ shortcut
   (action A1 ด้านล่าง)
4. รัน Shortcut ครั้งแรก → ตอน iOS ถามสิทธิ์เขียน/อ่าน Health ให้อนุญาตทุกอย่างที่ขอ (อาจถามทีละ nutrient
   type ตามที่เจอในการรันครั้งแรก ไม่ใช่ครั้งเดียวจบเสมอ) → เช็คว่าเข้า Health app ถูกต้อง
5. พอใช้งานได้แล้ว กดปุ่ม **⋯ (More)** บน shortcut นี้ → **Share** → **Copy iCloud Link** — นี่คือลิงก์
   ที่ใช้แจกเพื่อน (หรือใช้เปิดเองตอนติดตั้งบนเครื่องอื่น) ทำตามส่วนที่ 2 ต่อ

## ส่วนที่ 2 — ติดตั้งจากลิงก์ (เพื่อนที่ได้ลิงก์จากวี หรือวีเองบนเครื่องอื่น)

1. เปิดลิงก์ iCloud share ที่ได้รับมา → กด "Get Shortcut"
2. เปิด Vmacro → **Settings → System** → กด **"สร้าง Token"** → กด **"คัดลอก"** (token เป็นของแต่ละคน
   ห้ามใช้ token ของคนอื่น) → ตั้งชื่อ "ชื่อ Shortcut #1" ในหน้านี้ให้ตรงกับชื่อ shortcut จริงที่เพิ่งติดตั้ง
   (default คือ `Vmacro: Sync to Health` — ถ้าไม่ได้เปลี่ยนตอนติดตั้งก็ปล่อยไว้เฉยๆ ได้)
3. เปิด Shortcut ที่เพิ่งติดตั้งในโหมดแก้ไข (กดค้าง → Edit) หา action `Text` ตัวแรกสุด (ชื่อตัวแปร `Token`)
   แล้ววาง token ที่คัดลอกมาแทนที่ข้อความเดิม — แก้แค่ช่องนี้ช่องเดียว ไม่ต้องยุ่งกับ action อื่นเลย
4. รัน Shortcut ครั้งแรก → ตอน iOS ถามสิทธิ์เขียน Health ให้อนุญาตทุกอย่างที่ขอ

---

## สร้าง action ทีละขั้น (สำหรับคนต่อ Shortcut เอง — ส่วนที่ 1 ข้อ 2)

> **เรื่องคอลัมน์ "Action (TH)"**: เช็คกับหน้า official guide ภาษาไทยของ Apple แล้ว ยืนยันได้ตรงๆ แค่ 2 คำ
> คือ `Get Contents of URL` = **รับเนื้อหาของ URL** และ `If` = **ถ้า** — ที่เหลือ (โดยเฉพาะกลุ่ม Health ที่
> เฉพาะทาง) หาหน้า official ไม่เจอ เลยใส่คำแปลที่น่าจะใกล้เคียงที่สุดให้แทน **ไม่รับประกันว่าตรงกับคำในแอปเป๊ะ
> 100%** ถ้าเจอในเครื่องจริงแล้วคำไม่ตรง ให้ยึดคอลัมน์ Action (EN) เป็นหลัก แล้วใช้ช่องค้นหา (พิมพ์ชื่อไทยที่เดา
> ไว้ หรือสลับ Shortcuts เป็นภาษาอังกฤษชั่วคราวตอนต่อ action ก็ได้) — บอกคำจริงที่เจอมาได้ เดี๋ยวแก้เอกสารให้ตรง

### กลุ่ม A — เตรียมตัวแปร (2 action)

| # | Action (EN) | Action (TH) | ตั้งค่า |
|---|---|---|---|
| A1 | `Text` | ข้อความ | พิมพ์ token ของคุณลงไป (เอาจริงจาก Settings → System ตอนตั้งค่า) → แตะผลลัพธ์ค้างแล้วเลือก **Rename Variable** → ตั้งชื่อ `Token` (ถ้าหา Rename Variable ไม่เจอ ใช้ action `Set Variable` แยกต่างหากแทนได้ผลเหมือนกัน) |
| A2 | `Format Date` | จัดรูปแบบวันที่ *(ไม่ยืนยัน)* | Input: `Current Date` (แตะเลือกจาก magic variable ด้านล่างคีย์บอร์ด) → Date Format: `Custom` → Custom Format พิมพ์ `yyyy-MM-dd` → Rename Variable → `Today` |

> **(แก้ 2026-08-16)** เอกสารฉบับก่อนมี A3/A4 (`Adjust Date` หา Start Of Today/End Of Today) ไว้ใช้กรอง
> "sample ของวันนี้" ในกลุ่ม C — **ตัดออกแล้ว ไม่จำเป็น** เพราะ `Find Health Samples` มี operator
> `is today` ให้ใช้ตรงๆ อยู่แล้ว (ยืนยันจากเครื่องจริง) ไม่ต้องคำนวณวันที่เองเลย ดูกลุ่ม C ด้านล่าง

### กลุ่ม B — ดึงข้อมูลจาก Vmacro (3 action)

| # | Action (EN) | Action (TH) | ตั้งค่า |
|---|---|---|---|
| B1 | `Get Contents of URL` | **รับเนื้อหาของ URL** ✓ ยืนยันแล้ว | URL: พิมพ์ `https://vmacro.persiq.net/health/daily-summary?date=` แล้วแตะแป้นพิมพ์ใส่ตัวแปร `Today` ต่อท้าย (ไม่มีเว้นวรรค) → Method: `GET` → Headers: เพิ่ม 1 แถว key = `Authorization`, value = พิมพ์ `Bearer ` (มีวรรคท้าย) แล้วใส่ตัวแปร `Token` ต่อ → Rename Variable ผลลัพธ์ → `Response` |
| B2 | `Get Dictionary from Input` | รับค่าพจนานุกรม *(ค่อนข้างมั่นใจ)* | Input: `Response` → Rename Variable → `Data` |
| B3 | `Get Dictionary Value` *(แก้ 2026-08-16: ชื่อจริงต่างจาก `Get Value for Key` ที่เคยเขียนไว้)* | รับค่าพจนานุกรม *(ไม่ยืนยัน)* | Get: `Value` → for: `extended` → in: `Data` → Rename Variable → `Extended` |

### กลุ่ม C — Core 4 (kcal/protein/carb/fat): delta calculation (28 action)

> **(แก้ 2026-08-16)** เอกสารฉบับก่อนออกแบบเป็น "ลบของเก่าก่อนเขียนใหม่" แต่ยืนยันจากเครื่องจริงแล้วว่า
> Shortcuts **ไม่มี action ลบ Health sample เลย** (Apple ไม่เปิด API นี้ให้ Shortcuts) — เปลี่ยนมาใช้
> **delta calculation** แทน (ดู D-022 ใน PROJECT_BIBLE): หาผลรวมของ sample ที่มีอยู่แล้วของวันนี้ แล้วเขียนแค่
> ส่วนต่าง (ยอดใหม่ − ยอดที่มีอยู่แล้ว) แทนการเขียนยอดเต็มทุกครั้ง — ได้ผลลัพธ์ idempotent เหมือนกัน
> (core 4 ไม่เบิ้ลไม่ว่ารันกี่รอบ) โดยไม่ต้องพึ่ง delete เลย

ตัวอย่างเต็มสำหรับ **kcal** ก่อน (ทำ 7 action นี้), แล้วทำ pattern เดียวกันอีก 3 รอบตามตารางด้านล่าง
โดยเปลี่ยนแค่ Key / ชื่อตัวแปร / Sample Type ตามแถวของแต่ละตัว:

| # | Action (EN) | Action (TH) | ตั้งค่า (ตัวอย่าง kcal) |
|---|---|---|---|
| C.kcal.1 | `Get Dictionary Value` | รับค่าพจนานุกรม *(ไม่ยืนยัน)* | Get: `Value` → for: `kcal` → in: `Data` → Rename → `KcalValue` |
| C.kcal.2 | `Find Health Samples` | ค้นหาตัวอย่างสุขภาพ *(ไม่ยืนยัน)* | Sample Type: `Dietary Energy` (บางเวอร์ชันเรียก `Dietary Calories`) → filter: `Start Date` `is today` → Rename → `OldKcal` |
| C.kcal.3 | `Get Details of Health Sample` | รับรายละเอียดตัวอย่างสุขภาพ *(ไม่ยืนยันชื่อ — หาจากช่องค้นหาโดยพิมพ์ "Health Sample" แล้วดูตัวเลือก)* | Detail: `Quantity` (หรือ `Value`) → Health Sample: `OldKcal` (ใส่ลิสต์ทั้งก้อน จะได้ลิสต์ตัวเลขกลับมา) → Rename → `OldKcalAmounts` |
| C.kcal.4 | `Calculate Statistics` | คำนวณสถิติ *(ไม่ยืนยันชื่อ)* | Operation: `Sum` → List: `OldKcalAmounts` → Rename → `OldKcalTotal` |
| C.kcal.5 | `Calculate` | คำนวณ *(ไม่ยืนยัน)* | `KcalValue` `−` `OldKcalTotal` → Rename → `KcalDelta` |
| C.kcal.6 | `If` | **ถ้า** ✓ ยืนยันแล้ว | Input: `KcalDelta` → Condition: `is greater than` `0` |
| C.kcal.7 | (ในบล็อก If) `Log Nutrition Sample` | บันทึกตัวอย่างโภชนาการ *(ไม่ยืนยัน)* | Sample Type: `Dietary Energy` (บางเวอร์ชันเรียก `Calories`) → Amount: `KcalDelta` → Date: ปล่อย default (ตอนนี้) → ปิดท้ายด้วย `End If` |

ทำซ้ำ pattern 7 action เดียวกัน (Get Dictionary Value → Find Health Samples → Get Details of Health
Sample → Calculate Statistics (Sum) → Calculate (ลบ) → If มากกว่า 0 → Log Nutrition Sample) อีก 3 รอบ
ตามตารางนี้:

| Key ใน `Data` | ชื่อตัวแปรชุด (เช่น `xxxValue`/`OldXxx`/`xxxDelta`) | Sample Type ใน Log/Find |
|---|---|---|
| `protein_g` | `ProteinValue` / `OldProtein` / `ProteinDelta` | `Protein` |
| `carbs_g` | `CarbsValue` / `OldCarbs` / `CarbsDelta` | `Carbohydrates` |
| `fat_g` | `FatValue` / `OldFat` / `FatDelta` | `Total Fat` |

### กลุ่ม D — Extended nutrients (12 ตัว): เขียนตรงๆ ถ้ามีข้อมูล ไม่ลบของเก่า (36 action)

Field กลุ่มนี้เป็น best-effort อยู่แล้ว (ดูหัวข้อด้านล่าง) จึงไม่ทำ delete-then-rewrite ให้ — แค่เช็คว่าไม่ใช่
`null` ก่อน log ตรงๆ ตัวอย่างเต็มสำหรับ **sodium_mg**:

| # | Action (EN) | Action (TH) | ตั้งค่า (ตัวอย่าง sodium) |
|---|---|---|---|
| D.sodium.1 | `Get Dictionary Value` | รับค่าพจนานุกรม *(ไม่ยืนยัน)* | Get: `Value` → for: `sodium_mg` → in: `Extended` → Rename → `SodiumValue` |
| D.sodium.2 | `If` | **ถ้า** ✓ ยืนยันแล้ว | Input: `SodiumValue` → Condition: `has any value` |
| D.sodium.3 | (ในบล็อก If) `Log Nutrition Sample` | บันทึกตัวอย่างโภชนาการ *(ไม่ยืนยัน)* | Sample Type: `Sodium` → Amount: `SodiumValue` |
| — | `Otherwise` / `End If` | มิฉะนั้น / สิ้นสุดถ้า *(ไม่ยืนยัน)* | ปล่อยว่าง ไม่ต้องใส่อะไรในช่อง Otherwise — จบบล็อก If |

ทำซ้ำ pattern 3 action (Get Dictionary Value → If has any value → Log Nutrition Sample ในบล็อก If) อีก
11 รอบ ตามตารางนี้:

| Key ใน `Extended` | ชื่อตัวแปร | Sample Type |
|---|---|---|
| `saturated_fat_g` | `SatFatValue` | `Saturated Fat` |
| `polyunsaturated_fat_g` | `PolyFatValue` | `Polyunsaturated Fat` |
| `monounsaturated_fat_g` | `MonoFatValue` | `Monounsaturated Fat` |
| `cholesterol_mg` | `CholesterolValue` | `Cholesterol` |
| `fiber_g` | `FiberValue` | `Fiber` |
| `sugar_g` | `SugarValue` | `Sugar` |
| `potassium_mg` | `PotassiumValue` | `Potassium` |
| `calcium_mg` | `CalciumValue` | `Calcium` |
| `iron_mg` | `IronValue` | `Iron` |
| `vitamin_c_mg` | `VitaminCValue` | `Vitamin C` |
| `vitamin_d_mcg` | `VitaminDValue` | `Vitamin D` |

**อย่าหา "Trans Fat" ใน `Log Nutrition Sample`** — ไม่มีจริง Apple ไม่มี HealthKit identifier
สำหรับ trans fat เลย ไม่ใช่ตกหล่น ข้ามไปได้เลย (ไม่มีในตารางด้านบนตั้งใจ)

### สรุปจำนวน action ทั้งหมด

| กลุ่ม | จำนวน action |
|---|---|
| A — เตรียมตัวแปร | 2 |
| B — ดึงข้อมูล | 3 |
| C — Core 4 (delta calculation) | 4 × 7 = 28 |
| D — Extended 12 (เขียนตรง) | 12 × 3 = 36 |
| **รวม** | **69** |

## ทำไม Core 4 ต้องคำนวณ delta แต่ Extended ไม่ต้อง

`Log Nutrition Sample` สร้าง entry ใหม่ทุกครั้งที่รัน ไม่ overwrite ของเดิม — ถ้ากดปุ่ม "ซิงก์เข้า Apple
Health" ในหน้า Diary หลายรอบต่อวัน (เช่น หลังทุกมื้อ) แล้วเขียนยอดเต็มซ้ำทุกครั้ง ยอดใน Health จะเบิ้ล เดิม
ตั้งใจแก้ด้วยการลบ sample เก่าก่อนเขียนใหม่ แต่ Shortcuts ไม่มี action ลบ Health sample จริง (ดู D-022 ใน
PROJECT_BIBLE) — กลุ่ม C (kcal/protein/carb/fat) จึงหาผลรวมของ sample ที่มีอยู่แล้วของวันนั้นก่อน แล้วเขียนแค่
**ส่วนต่าง** (ยอดใหม่ − ยอดที่มีอยู่แล้ว) แทน ได้ผลเหมือนกันคือยอดตรงเสมอไม่ว่าจะรันกี่รอบ โดยไม่ต้องลบอะไรเลย
ส่วนกลุ่ม D เป็น field best-effort อยู่แล้ว (ดูด้านล่าง) ไม่ทำ delta ให้เพื่อไม่ให้ shortcut ยาวเกินไป
(จะกลายเป็น ~100 action) — ถ้ากดปุ่ม sync หลายรอบต่อวัน extended nutrients อาจเบิ้ลได้บ้าง แต่ core 4 ที่เป็น
AC หลักจะตรงเสมอ

**ไม่มี field สำหรับ magnesium/zinc/vitamin B6/B12/folate/phosphorus/water** ใน response —
ไม่มีแหล่งข้อมูลจริงในระบบ Vmacro เลยสักที่ (FatSecret ไม่คืนค่าพวกนี้, custom food ที่กรอกเองแทบไม่มีคน
กรอก, quick-add ไม่มีช่องให้กรอก) เขียนเป็น 0 จะเข้าใจผิดว่า "กินไป 0" ทั้งที่จริงคือ "ไม่รู้" จึงตัดออกทั้งหมด

## ปุ่ม "ซิงก์เข้า Apple Health" ในหน้า Diary

หน้า Diary ของเว็บแอป (วันที่เป็น "วันนี้" เท่านั้น, เฉพาะ iPhone/iPad) มีปุ่มนี้ให้กดหลังบันทึกมื้ออาหาร
เพื่อ sync ทันทีโดยไม่ต้องรอ automation — กดแล้วเปิดแอป Shortcuts มารัน Shortcut #1 ให้เลย โดยใช้ชื่อที่ตั้งไว้ใน
Settings → System → "ชื่อ Shortcut #1" เป็นตัวหา เพราะฉะนั้นชื่อในแอป Shortcuts จริงกับชื่อในหน้า Settings
**ต้องตรงกันเป๊ะเสมอ** — เปลี่ยนชื่อฝั่งไหนต้องไปแก้อีกฝั่งด้วย

กด sync กี่รอบต่อวันก็ได้แล้ว (core 4 ไม่เบิ้ลเพราะคำนวณ delta ก่อนเขียนทุกครั้งตามที่อธิบายด้านบน) —
extended nutrients อาจเบิ้ลได้ถ้ารันหลายรอบ ถือเป็นความคลาดเคลื่อนที่ยอมรับได้ของ field best-effort กลุ่มนี้

## Automation (ทำให้รันอัตโนมัติทุกวัน — ทางเลือก แทนหรือเสริมปุ่มด้านบน)

ตั้งใน Shortcuts app → Automation → Personal Automation → Time of Day (เช่น 23:00) → Run Shortcut #1 →
ปิด "Ask Before Running" ถ้าอยากให้รันเงียบๆ ไม่ขึ้น prompt — ใช้ร่วมกับปุ่ม sync ในเว็บแอปได้ตามสบาย
เพราะกลุ่ม C ป้องกันยอดเบิ้ลไว้แล้ว

## วิธี verify ว่าใช้งานได้ถูกต้อง

เปิด Health app → Browse → Nutrition เทียบกับหน้าสรุปวันของ Vmacro วันเดียวกัน:
- **Core 4 (kcal/protein/carb/fat) ต้องตรงเป๊ะ** ไม่ว่าจะรัน sync กี่รอบก็ตาม — นี่คือ acceptance
  criteria ของ FR-HLTH-1
- **Extended nutrients เป็น best-effort** อาจ "น้อยกว่าความจริง" ได้ถ้าวันนั้นมี quick-add หรือ custom food
  ที่ไม่ได้กรอกค่าพวกนี้ไว้ หรือ "มากกว่าความจริง" ได้เล็กน้อยถ้ารัน sync หลายรอบ — เป็นเรื่องปกติ ไม่ใช่ bug

## Troubleshooting

| อาการ | สาเหตุ | วิธีแก้ |
|---|---|---|
| ได้ 401 / Shortcut แจ้ง error ตอนดึงข้อมูล | Token ถูก revoke หรือกรอกผิดในตัวแปร `Token` (action A1) | กลับไป Settings → System → สร้าง Token ใหม่ วางใน action A1 ใหม่ |
| กดปุ่ม sync ในหน้า Diary แล้วไม่มีอะไรเกิดขึ้น / เปิด Shortcuts ไม่เจอ shortcut | ชื่อ shortcut จริงกับชื่อในช่อง "ชื่อ Shortcut #1" ของ Settings ไม่ตรงกัน | เช็คตัวสะกด/เว้นวรรคให้ตรงทั้งสองฝั่ง |
| ยอดในแอป Health เป็น 0 หรือไม่ขึ้นเลย | วันนั้นยังไม่ได้บันทึกอะไรใน diary | เปิด Vmacro บันทึกมื้ออาหารก่อน แล้วรัน Shortcut ใหม่ |
| Extended nutrient บาง field หายไปบางวัน | ไม่มีข้อมูลจากแหล่งไหนเลยสำหรับวันนั้น | ปกติ ไม่ใช่ error — ดู "ทำไม Core 4 ต้องคำนวณ delta" ด้านบน |
| หา action `Delete Health Sample` ไม่เจอเลย | ปกติ — action นี้ไม่มีจริงใน Shortcuts (Apple ไม่เปิด API ลบ HealthKit sample) | ไม่ต้องหาอีกต่อไป กลุ่ม C ใช้ delta calculation แทนอยู่แล้ว (ดูด้านบน + D-022) |
| หา action `Get Details of Health Sample` หรือ `Calculate Statistics` ไม่เจอชื่อตรงเป๊ะ | ชื่ออาจต่างกันตาม iOS version (ยังไม่ยืนยัน 100%) | ค้นด้วยคำกว้างๆ เช่น "Health Sample" หรือ "Statistics"/"Calculate" ดูตัวเลือกที่ใกล้เคียงที่สุด แล้วแจ้งชื่อจริงที่เจอ เดี๋ยวแก้เอกสารให้ตรง |
