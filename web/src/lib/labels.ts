import type { ActivityLevel, Formula, Goal } from "./tdee";

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Sedentary — แทบไม่ออกกำลังกาย นั่งทำงานทั้งวัน",
  light: "Light — ออกกำลังกายเบา 1-3 วัน/สัปดาห์ (~20-30 นาที/ครั้ง)",
  moderate: "Moderate — ออกกำลังกายปานกลาง 3-5 วัน/สัปดาห์ (~30-60 นาที/ครั้ง)",
  active: "Active — ออกกำลังกายหนัก 6-7 วัน/สัปดาห์ (~45-60 นาที/ครั้ง)",
  extra_active: "Extra active — ออกกำลังกายหนักมากแทบทุกวัน หรืองานใช้แรงกาย + เทรนวันละ 2 ครั้ง",
};

export const GOAL_LABELS: Record<Goal, string> = {
  lose: "ลดน้ำหนัก",
  maintain: "รักษาน้ำหนัก",
  gain: "เพิ่มน้ำหนัก (รวมถึงเพิ่มกล้ามเนื้อ)",
};

export const FORMULA_LABELS: Record<Formula, string> = {
  mifflin: "Mifflin-St Jeor (แนะนำ)",
  katch_mcardle: "Katch-McArdle",
  harris_benedict: "Harris-Benedict",
};

export const FORMULA_HELP: Record<Formula, string> = {
  mifflin: "แม่นยำที่สุดสำหรับคนทั่วไป ใช้แค่ส่วนสูง น้ำหนัก อายุ เพศ",
  katch_mcardle: "แม่นกว่าถ้ารู้ % ไขมันร่างกายจริง (เช่นจาก InBody/caliper) เหมาะคนเทรนสม่ำเสมอ — ถ้าไม่กรอก % ไขมัน ระบบจะคำนวณด้วย Mifflin แทนให้อัตโนมัติ",
  harris_benedict: "สูตรรุ่นเก่ากว่า Mifflin ผลลัพธ์ใกล้เคียงกันมาก",
};
