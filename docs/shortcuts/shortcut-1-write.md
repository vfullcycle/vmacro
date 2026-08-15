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
2. ใส่ action ทั้งหมดตามหัวข้อ **"สร้าง action ทีละขั้น"** ด้านล่าง (มีทั้งหมด ~59 action — ยาวแต่ทำตาม
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

### กลุ่ม A — เตรียมตัวแปร (4 action)

| # | Action | ตั้งค่า |
|---|---|---|
| A1 | `Text` | พิมพ์ token ของคุณลงไป (เอาจริงจาก Settings → System ตอนตั้งค่า) → แตะผลลัพธ์ค้างแล้วเลือก **Rename Variable** → ตั้งชื่อ `Token` |
| A2 | `Format Date` | Input: `Current Date` (แตะเลือกจาก magic variable ด้านล่างคีย์บอร์ด) → Date Format: `Custom` → Custom Format พิมพ์ `yyyy-MM-dd` → Rename Variable → `Today` |
| A3 | `Adjust Date` | Input: `Current Date` → Adjusting: `Get Start of` → Get Start of: `Day` → Rename Variable → `Start Of Today` |
| A4 | `Adjust Date` | Input: `Current Date` → Adjusting: `Get End of` → Get End of: `Day` → Rename Variable → `End Of Today` |

(A3/A4 ใช้ตอนกรอง "sample ของวันนี้" ตอนลบของเก่าในกลุ่ม C — ทำไว้ล่วงหน้าตรงนี้เพื่อไม่ต้องสร้างซ้ำทีหลัง)

### กลุ่ม B — ดึงข้อมูลจาก Vmacro (3 action)

| # | Action | ตั้งค่า |
|---|---|---|
| B1 | `Get Contents of URL` | URL: พิมพ์ `https://vmacro.persiq.net/health/daily-summary?date=` แล้วแตะแป้นพิมพ์ใส่ตัวแปร `Today` ต่อท้าย (ไม่มีเว้นวรรค) → Method: `GET` → Headers: เพิ่ม 1 แถว key = `Authorization`, value = พิมพ์ `Bearer ` (มีวรรคท้าย) แล้วใส่ตัวแปร `Token` ต่อ → Rename Variable ผลลัพธ์ → `Response` |
| B2 | `Get Dictionary from Input` | Input: `Response` → Rename Variable → `Data` |
| B3 | `Get Value for Key` | Key: `extended` → Dictionary: `Data` → Rename Variable → `Extended` |

### กลุ่ม C — Core 4 (kcal/protein/carb/fat): ลบของเก่าก่อนแล้วเขียนใหม่ (16 action)

ตัวอย่างเต็มสำหรับ **kcal** ก่อน (ทำ 4 action นี้), แล้วทำ pattern เดียวกันอีก 3 รอบตามตารางด้านล่าง
โดยเปลี่ยนแค่ Key / ชื่อตัวแปร / Sample Type ตามแถวของแต่ละตัว:

| # | Action | ตั้งค่า (ตัวอย่าง kcal) |
|---|---|---|
| C.kcal.1 | `Get Value for Key` | Key: `kcal` → Dictionary: `Data` → Rename → `KcalValue` |
| C.kcal.2 | `Find Health Samples` | Sample Type: `Dietary Energy` → เพิ่ม filter: `Created Date` `is after` `Start Of Today`, และ `Created Date` `is before` `End Of Today` → Rename → `OldKcal` |
| C.kcal.3 | `Delete Health Sample` | Sample: `OldKcal` (ใส่ลิสต์ทั้งก้อนได้เลย ไม่ต้อง loop — ถ้าเวอร์ชันคุณรับได้แค่ทีละตัว ให้ครอบ C.kcal.3 ด้วย `Repeat with Each` โดยใช้ `OldKcal` เป็น input) |
| C.kcal.4 | `Log Nutrition Sample` | Sample Type: `Dietary Energy` (บางเวอร์ชันเรียก `Calories`) → Amount: `KcalValue` → Date: ปล่อย default (ตอนนี้) |

ทำซ้ำ pattern 4 action เดียวกัน (Get Value for Key → Find Health Samples → Delete Health Sample →
Log Nutrition Sample) อีก 3 รอบ ตามตารางนี้:

| Key ใน `Data` | ชื่อตัวแปร (เช่น `xxxValue`/`OldXxx`) | Sample Type ใน Log/Find |
|---|---|---|
| `protein_g` | `ProteinValue` / `OldProtein` | `Protein` |
| `carbs_g` | `CarbsValue` / `OldCarbs` | `Carbohydrates` |
| `fat_g` | `FatValue` / `OldFat` | `Total Fat` |

### กลุ่ม D — Extended nutrients (12 ตัว): เขียนตรงๆ ถ้ามีข้อมูล ไม่ลบของเก่า (36 action)

Field กลุ่มนี้เป็น best-effort อยู่แล้ว (ดูหัวข้อด้านล่าง) จึงไม่ทำ delete-then-rewrite ให้ — แค่เช็คว่าไม่ใช่
`null` ก่อน log ตรงๆ ตัวอย่างเต็มสำหรับ **sodium_mg**:

| # | Action | ตั้งค่า (ตัวอย่าง sodium) |
|---|---|---|
| D.sodium.1 | `Get Value for Key` | Key: `sodium_mg` → Dictionary: `Extended` → Rename → `SodiumValue` |
| D.sodium.2 | `If` | Input: `SodiumValue` → Condition: `has any value` |
| D.sodium.3 | (ในบล็อก If) `Log Nutrition Sample` | Sample Type: `Sodium` → Amount: `SodiumValue` |
| — | `Otherwise` / `End If` | ปล่อยว่าง ไม่ต้องใส่อะไรในช่อง Otherwise — จบบล็อก If |

ทำซ้ำ pattern 3 action (Get Value for Key → If has any value → Log Nutrition Sample ในบล็อก If) อีก
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
| A — เตรียมตัวแปร | 4 |
| B — ดึงข้อมูล | 3 |
| C — Core 4 (ลบ+เขียนใหม่) | 4 × 4 = 16 |
| D — Extended 12 (เขียนตรง) | 12 × 3 = 36 |
| **รวม** | **59** |

## ทำไม Core 4 ต้องลบของเก่าก่อน แต่ Extended ไม่ต้อง

`Log Nutrition Sample` สร้าง entry ใหม่ทุกครั้งที่รัน ไม่ overwrite ของเดิม — ถ้ากดปุ่ม "ซิงก์เข้า Apple
Health" ในหน้า Diary หลายรอบต่อวัน (เช่น หลังทุกมื้อ) แล้วไม่ลบของเก่าก่อน ยอดใน Health จะเบิ้ล กลุ่ม C
(kcal/protein/carb/fat) จึงลบ sample เก่าของวันนั้นก่อนเขียนใหม่ทุกครั้ง เพื่อให้ยอดตรงเสมอไม่ว่าจะรันกี่รอบ
ส่วนกลุ่ม D เป็น field best-effort อยู่แล้ว (ดูด้านล่าง) ไม่ทำ delete-then-rewrite ให้เพื่อไม่ให้ shortcut
ยาวเกินไป (จะกลายเป็น ~80 action) — ถ้ากดปุ่ม sync หลายรอบต่อวัน extended nutrients อาจเบิ้ลได้บ้าง แต่ core
4 ที่เป็น AC หลักจะตรงเสมอ

**ไม่มี field สำหรับ magnesium/zinc/vitamin B6/B12/folate/phosphorus/water** ใน response —
ไม่มีแหล่งข้อมูลจริงในระบบ Vmacro เลยสักที่ (FatSecret ไม่คืนค่าพวกนี้, custom food ที่กรอกเองแทบไม่มีคน
กรอก, quick-add ไม่มีช่องให้กรอก) เขียนเป็น 0 จะเข้าใจผิดว่า "กินไป 0" ทั้งที่จริงคือ "ไม่รู้" จึงตัดออกทั้งหมด

## ปุ่ม "ซิงก์เข้า Apple Health" ในหน้า Diary

หน้า Diary ของเว็บแอป (วันที่เป็น "วันนี้" เท่านั้น, เฉพาะ iPhone/iPad) มีปุ่มนี้ให้กดหลังบันทึกมื้ออาหาร
เพื่อ sync ทันทีโดยไม่ต้องรอ automation — กดแล้วเปิดแอป Shortcuts มารัน Shortcut #1 ให้เลย โดยใช้ชื่อที่ตั้งไว้ใน
Settings → System → "ชื่อ Shortcut #1" เป็นตัวหา เพราะฉะนั้นชื่อในแอป Shortcuts จริงกับชื่อในหน้า Settings
**ต้องตรงกันเป๊ะเสมอ** — เปลี่ยนชื่อฝั่งไหนต้องไปแก้อีกฝั่งด้วย

กด sync กี่รอบต่อวันก็ได้แล้ว (core 4 ไม่เบิ้ลเพราะลบของเก่าก่อนเขียนใหม่ทุกครั้งตามที่อธิบายด้านบน) —
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
| Extended nutrient บาง field หายไปบางวัน | ไม่มีข้อมูลจากแหล่งไหนเลยสำหรับวันนั้น | ปกติ ไม่ใช่ error — ดู "ทำไม Core 4 ต้องลบของเก่าก่อน" ด้านบน |
| `Delete Health Sample` แจ้ง error ตอนรับ list | บางเวอร์ชัน iOS action นี้รับได้แค่ทีละตัว | ครอบ action Delete ด้วย `Repeat with Each` โดยใช้ผลลัพธ์จาก `Find Health Samples` เป็น input ของ Repeat |
