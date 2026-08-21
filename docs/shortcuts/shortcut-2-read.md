# Shortcut #2 — อ่าน Apple Health → ส่งเข้า Vmacro (FR-HLTH-3)

> สถานะ: **backend เสร็จแล้ว (2026-08-21), ตัว Shortcut เองยังไม่เริ่มต่อจริงบนเครื่อง** — คู่มือ
> action-by-action จะเติมทีหลังแบบเดียวกับ [`shortcut-1-write.md`](./shortcut-1-write.md) คือต่อจริงบน
> iPhone แล้ว verify ชื่อ action ทีละตัว ไม่เดาไว้ล่วงหน้าเพราะเคยพลาดชื่อ action มาแล้วหลายจุดตอนทำ
> Shortcut #1 (ดู D-022 — Shortcuts ไม่มี action ลบ Health sample ทั้งที่ทีแรกคาดว่ามี)

## API ที่ Shortcut #2 ต้องเรียก (ยืนยันแล้วจากโค้ดจริง)

```
POST https://vmacro.persiq.net/health/ingest
Authorization: Bearer <token เดียวกับที่ใช้ Shortcut #1, จาก Settings → System>
Content-Type: application/json
```

Body (`date` บังคับ, ที่เหลือ optional แต่ต้องมีอย่างน้อย 1 อย่าง):

```json
{
  "date": "2026-08-21",
  "workouts": [
    {
      "type": "Running",
      "started_at": "2026-08-21T06:30:00+07:00",
      "duration_seconds": 1800,
      "energy_kcal": 320,
      "avg_heart_rate": 142
    }
  ],
  "restingHeartRate": 58,
  "activeEnergyKcal": 610
}
```

- `workouts[].type` — ชนิดกิจกรรมตามที่ HealthKit ให้มาตรงๆ ไม่ filter เฉพาะบางชนิด
- `workouts[].avg_heart_rate` — optional, ไม่ต้องส่งถ้า workout นั้นไม่มีข้อมูล HR (เช่น ไม่ได้สวม Watch)
- `restingHeartRate` — 1 ค่า/วัน, optional
- `activeEnergyKcal` — ยอดรวมทั้งวัน หน่วย kcal, optional
- **ไม่มี field HRV หรือ raw HR sample** — ไม่เก็บใน P4 (ดู FR-HLTH-3 ใน REQUIREMENTS.md)

Response (200): `{"workouts_inserted": 1, "daily_stats_synced": true}`
Response (401): token ผิด/revoked

### Dedup — สำคัญ ต้องรู้ก่อนต่อ Shortcut

- **Workout**: กันซ้ำด้วย (user, `started_at`, `type`) — sync workout เดิมซ้ำหลายรอบไม่เบิ้ล ไม่ต้อง
  ระวังเรื่องรันซ้ำ
- **`restingHeartRate`/`activeEnergyKcal`**: **ทับค่าเดิมเสมอ** (upsert ต่อวัน ไม่ใช่กันซ้ำ) — เพราะ sync
  ตอนเย็นจะมี active energy สมบูรณ์กว่าตอนบ่าย ตั้งใจให้ทับ ไม่ต้องหา delta เหมือน Shortcut #1

## สิ่งที่ต้องอ่านจาก HealthKit (checklist สำหรับตอนต่อจริง)

1. Workout ของวันนี้ทั้งหมด — ชนิด, เวลาเริ่ม, ระยะเวลา, พลังงานที่เผาผลาญ, average HR ของ workout นั้น
   (action ที่คาดว่าจะใช้: `Find Workouts` หรือใกล้เคียง — ยังไม่ยืนยันชื่อจริง)
2. Resting heart rate ของวันนี้ (1 ค่า) — action ที่คาดว่าจะใช้: `Find Health Samples` (Sample Type:
   Resting Heart Rate) — ยังไม่ยืนยัน
3. Active energy รวมทั้งวัน — `Find Health Samples` (Sample Type: Active Energy) + sum — ยังไม่ยืนยัน

ต่อจริงบนเครื่องเมื่อไหร่ อัปเดตไฟล์นี้พร้อม ✓ ยืนยันแล้ว ทีละ action ตาม pattern เดียวกับ Shortcut #1
