# Shortcut #1 — เขียนยอด macro รายวันเข้า Apple Health (FR-HLTH-1/2)

คู่มือนี้มี 2 ส่วน: **สร้างครั้งแรก** (สำหรับวี — ยังไม่มี Shortcut/ลิงก์ให้ใครเลย) และ **ติดตั้งจากลิงก์**
(สำหรับเพื่อนที่ได้ลิงก์จากวีแล้ว หรือวีเองตอนติดตั้งซ้ำบนเครื่องอื่น)

## ส่วนที่ 1 — สร้างครั้งแรก (ทำครั้งเดียวโดยวี)

1. เปิดแอป **Shortcuts** บน iPhone → กด **+** (New Shortcut) → ตั้งชื่อ เช่น "Vmacro: Sync to Health"
2. ใส่ action ตามรายการในหัวข้อ "Shortcut ทำอะไรบ้าง" ด้านล่างทั้งหมด (Get Contents of URL → Get
   Dictionary from Input → Get Value for Key + Log Nutrition Sample ทีละตัว)
3. ไปที่ Vmacro → **Settings → System** → เลื่อนลงมาส่วน "Apple Health" → กด **"สร้าง Token"** → กด
   **"คัดลอก"** (token จะแสดงครั้งเดียว คัดลอกให้ทันก่อนออกจากหน้านี้) แล้ววางในช่องกรอก token ที่ต้นๆ shortcut
4. รัน Shortcut ครั้งแรก → ตอน iOS ถามสิทธิ์เขียน Health ให้อนุญาตทุกตัวที่ขอ (Nutrition: Calories,
   Protein, Carbohydrates, Total Fat, และตัวอื่นๆ ใน extended list ด้านล่างถ้ามี) → เช็คว่าเข้า Health app ถูกต้อง
5. พอใช้งานได้แล้ว กดปุ่ม **⋯ (More)** บน shortcut นี้ → **Share** → **Copy iCloud Link** — นี่คือลิงก์
   ที่ใช้แจกเพื่อน (หรือใช้เปิดเองตอนติดตั้งบนเครื่องอื่น) ทำตามส่วนที่ 2 ต่อ

## ส่วนที่ 2 — ติดตั้งจากลิงก์ (เพื่อนที่ได้ลิงก์จากวี หรือวีเองบนเครื่องอื่น)

1. เปิดลิงก์ iCloud share ที่ได้รับมา → กด "Get Shortcut"
2. เปิด Vmacro → **Settings → System** → เลื่อนลงมาส่วน "Apple Health" → กด **"สร้าง Token"** → กด **"คัดลอก"**
   (token จะแสดงครั้งเดียว คัดลอกให้ทันก่อนออกจากหน้านี้ — **token เป็นของแต่ละคน ห้ามใช้ token ของคนอื่น**)
3. เปิด Shortcut ที่เพิ่งติดตั้งในโหมดแก้ไข (กดค้าง → Edit) หาช่องกรอก token (ตัวแปร/text field
   ที่ต้นๆ shortcut) แล้ววางค่าที่คัดลอกมา — แก้แค่ช่องนี้ช่องเดียว ไม่ต้องยุ่งกับ action อื่น
4. รัน Shortcut ครั้งแรก → ตอน iOS ถามสิทธิ์เขียน Health ให้อนุญาตทุกตัวที่ขอ (Nutrition: Calories,
   Protein, Carbohydrates, Total Fat, และตัวอื่นๆ ใน extended list ด้านล่างถ้ามี)

## Shortcut ทำอะไรบ้าง (สำหรับคนต่อ action เอง)

1. `Get Contents of URL`
   - URL: `https://vmacro.persiq.net/health/daily-summary?date=` ต่อด้วย `Current Date` ที่ format เป็น
     `yyyy-MM-dd`
   - Method: `GET`
   - Header: `Authorization` = `Bearer <token ที่วางไว้ตอนติดตั้ง>`
2. `Get Dictionary from Input` (แปลง response เป็น dictionary)
3. Core 4 — ดึงค่าแล้ว log ทุกตัว (ไม่มีเงื่อนไข เพราะ entry ทุกอันบันทึกครบ 4 ค่านี้เสมอ):
   - `Get Value for Key` → `kcal` → `Log Nutrition Sample` (Dietary Energy)
   - `protein_g` → `Log Nutrition Sample` (Protein)
   - `carbs_g` → `Log Nutrition Sample` (Carbohydrates)
   - `fat_g` → `Log Nutrition Sample` (Total Fat)
4. Extended nutrients — ดึงจาก dictionary ย่อย `extended` ทีละ key แล้ว **ใส่ `If` เช็คว่าค่าไม่ใช่
   null ก่อน log ทุกตัว** (ถ้า null แปลว่าไม่มีข้อมูลจริงวันนั้นเลย ให้ข้าม ไม่ log เป็น 0):
   - `saturated_fat_g` → Saturated Fat
   - `polyunsaturated_fat_g` → Polyunsaturated Fat
   - `monounsaturated_fat_g` → Monounsaturated Fat
   - `cholesterol_mg` → Cholesterol
   - `sodium_mg` → Sodium
   - `fiber_g` → Fiber
   - `sugar_g` → Sugar
   - `potassium_mg` → Potassium
   - `calcium_mg` → Calcium
   - `iron_mg` → Iron
   - `vitamin_c_mg` → Vitamin C
   - `vitamin_d_mcg` → Vitamin D

**อย่าหา "Trans Fat" ใน `Log Nutrition Sample`** — ไม่มีจริง Apple ไม่มี HealthKit identifier
สำหรับ trans fat เลย ไม่ใช่ endpoint ตกหล่น ข้ามไปได้เลย

**ไม่มี field สำหรับ magnesium/zinc/vitamin B6/B12/folate/phosphorus/water** ใน response —
ไม่มีแหล่งข้อมูลจริงในระบบ Vmacro เลยสักที่ (FatSecret ไม่คืนค่าพวกนี้, custom food ที่กรอกเองแทบไม่มีคน
กรอก, quick-add ไม่มีช่องให้กรอก) เขียนเป็น 0 จะเข้าใจผิดว่า "กินไป 0" ทั้งที่จริงคือ "ไม่รู้" จึงตัดออกทั้งหมด

## Automation (ทำให้รันอัตโนมัติทุกวัน — ทางเลือก)

ตั้งใน Shortcuts app → Automation → Personal Automation → Time of Day (เช่น 23:00) → Run Shortcut #1 →
ปิด "Ask Before Running" ถ้าอยากให้รันเงียบๆ ไม่ขึ้น prompt

## วิธี verify ว่าใช้งานได้ถูกต้อง

เปิด Health app → Browse → Nutrition เทียบกับหน้าสรุปวันของ Vmacro วันเดียวกัน:
- **Core 4 (kcal/protein/carb/fat) ต้องตรงเป๊ะ** — นี่คือ acceptance criteria ของ FR-HLTH-1
- **Extended nutrients เป็น best-effort** อาจ "น้อยกว่าความจริง" ได้ถ้าวันนั้นมี quick-add หรือ custom food
  ที่ไม่ได้กรอกค่าพวกนี้ไว้ — เป็นเรื่องปกติ ไม่ใช่ bug

## Troubleshooting

| อาการ | สาเหตุ | วิธีแก้ |
|---|---|---|
| ได้ 401 / Shortcut แจ้ง error ตอนดึงข้อมูล | Token ถูก revoke หรือกรอกผิด | กลับไป Settings → System → สร้าง Token ใหม่ วางใน Shortcut ใหม่ |
| ยอดในแอป Health เป็น 0 หรือไม่ขึ้นเลย | วันนั้นยังไม่ได้บันทึกอะไรใน diary | เปิด Vmacro บันทึกมื้ออาหารก่อน แล้วรัน Shortcut ใหม่ |
| Extended nutrient บาง field หายไปบางวัน | ไม่มีข้อมูลจากแหล่งไหนเลยสำหรับวันนั้น (เช่น มี quick-add ปนอยู่) | ปกติ ไม่ใช่ error — ดู "Extended nutrients" ด้านบน |
