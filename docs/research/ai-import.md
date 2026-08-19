# Research: AI Import (D-023)

> Research Gate แบบเบา (D-013) — เกณฑ์สำเร็จ/ground truth มีอยู่แล้วจาก pipeline จริงที่วีใช้อยู่
> (ChatGPT คำนวณ macro → วีตรวจเอง → admin bulk-import) ไม่ใช่ feature ทำนายที่ยังไม่มีพื้นฐานมาก่อน —
> doc นี้จึงสั้นกว่า research doc มาตรฐาน แต่ตอบครบ 5 ข้อตามกติกา freeze พร้อมอนุมัติ ไม่ maintain ต่อ

## 1. ปัญหา + วรรณกรรม

โจทย์คือ structured extraction: รับชื่ออาหาร + ปริมาณ (+ ภาพ optional) แล้วให้ LLM คืนค่า macro/nutrients
เป็น JSON ตาม schema คงที่ (schema เดียวกับ admin bulk-import) นี่เป็น use case ที่ established แล้วผ่าน
tool-use / structured-output ของ LLM รุ่นปัจจุบัน (Claude tool_use, JSON mode) ไม่ใช่โจทย์ใหม่เชิง
algorithm — ความเสี่ยงหลักไม่ใช่ "โมเดลทำได้ไหม" แต่คือ "ตัวเลขที่ได้แม่นพอจะเป็นจุดเริ่มต้นให้แก้ไหม"
ซึ่งเป็นคำถามเชิงคุณภาพข้อมูล ไม่ใช่คำถามเชิง architecture

## 2. Benchmark ตัวเลขจริง

ไม่มี benchmark มาตรฐานสาธารณะสำหรับ "ประมาณ macro จากชื่ออาหารด้วย LLM" เพราะเป็น use case เฉพาะทาง
ที่ ground truth จริงคือ pipeline ที่วีใช้งานอยู่แล้ว: วีใช้ ChatGPT คำนวณ macro (อ้าง Thai FCD/USDA)
มา import ผ่าน admin bulk-import ต่อเนื่องมาระยะหนึ่งแล้ว โดยตรวจเองทุกครั้งก่อน commit เข้า DB — นี่คือ
production ground truth ของ feature นี้อยู่แล้ว ไม่ต้องหา benchmark ภายนอกมาเทียบเพิ่ม

## 3. ทางเลือก + trade-off

- **(a) Text-only** — ชื่อ + ปริมาณ ส่งเป็น prompt text ล้วน คืน JSON — ตรงกับ workflow ที่วีใช้อยู่ตอนนี้
  เป๊ะ (ChatGPT แบบข้อความ), cost/latency ต่ำสุด, เริ่มง่ายที่สุด
- **(b) Text + ภาพ (multimodal)** — ใช้ Claude vision อ่านภาพอาหารประกอบชื่อ/ปริมาณ ช่วยกรณี user
  ไม่รู้ชื่อเมนูแน่ชัดหรือมีหลายอย่างในจาน — cost/latency สูงกว่า, ความแม่นยำปริมาณจากภาพยังเป็นจุดอ่อน
  ที่รู้กันทั่วไป (portion estimation from image เป็นปัญหายากกว่าการระบุชนิดอาหาร)
- **(c) Text หลัก + ภาพเสริม (hybrid)** — ส่งชื่อ+ปริมาณเป็น input หลักเหมือน (a), แนบภาพเป็น context
  เสริมให้โมเดลใช้ตอนชื่อกำกวม (เช่น "แกงเขียวหวาน" มีเนื้อสัตว์กี่ชนิด) ไม่ใช่แหล่งข้อมูลปริมาณหลัก

**เลือก (c)** — ตรงกับ input ที่ user มีอยู่แล้วตาม spec เดิม (ชื่อ+ภาพ+ปริมาณ), ไม่ผูกความแม่นยำกับ
portion-from-image ที่ยังอ่อน, ใกล้เคียง workflow ข้อความล้วนที่วีพิสูจน์แล้วว่าใช้งานได้จริงมากที่สุด

## 4. เพดานเชิงทฤษฎี

ไม่มีเพดานตัวเลขที่ต้องกำหนดล่วงหน้า เพราะ AI Import **ไม่เข้าเกณฑ์ (ก) ของ Research Gate จริงๆ** —
ผลลัพธ์จาก LLM ไม่เคยถูก apply ตรงเข้า DB เลยแม้แต่ครั้งเดียว (หลักการบังคับใน D-023: LLM ไม่มีสิทธิ์
เขียน DB ตรง) ทุกค่าเป็นแค่ pre-fill ในหน้า preview ที่ผู้สร้างต้องแก้/ยืนยันเองก่อน save เสมอ ตามด้วย
admin verification (D-017) เป็นชั้นที่สอง — ความแม่นยำของโมเดลจึงไม่ใช่ตัวตัดสินความปลอดภัยของ feature
เหมือน feature ทำนาย/ประมาณค่าที่ apply ผลลัพธ์ตรงถึงผู้ใช้อื่นโดยไม่มีคนตรวจ

## 5. เกณฑ์สำเร็จ + แหล่ง ground truth

**เกณฑ์สำเร็จ:** เวลาเฉลี่ยที่ user ใช้กรอก/แก้ฟอร์มหลัง AI pre-fill สั้นกว่าการกรอกฟอร์มมือทั้งหมดอย่าง
มีนัยสำคัญ (baseline = เวลาที่ friend ใช้ตอนกรอกฟอร์ม custom food ปัจจุบันแบบไม่มี AI ช่วย) และสัดส่วน
field ที่ user ต้องแก้ไม่เกิน ~30% ของ field ที่มีค่า (ตัวเลข % นี้เป็น starting point ปรับได้หลังเห็นการ
ใช้งานจริงรอบแรก ไม่ใช่ threshold ตายตัว)

**Ground truth:** รายการ custom food ที่วี import ผ่าน pipeline ChatGPT+ตรวจเองไปแล้วในอดีต (มีอยู่จริง
ใน DB ตอนนี้) ใช้เป็นชุดเทียบ — รัน AI Import กับชื่อ/ปริมาณเดียวกันแล้ว diff กับค่าที่วี verify ไว้จริง
เพื่อดู error pattern ก่อนเปิดให้เพื่อนใช้ ไม่ต้องเก็บ dataset ใหม่

## Governance ที่ไม่เปลี่ยน (ย้ำจาก D-023)

LLM pre-fill ฟอร์มเท่านั้น → human verify โดยผู้สร้าง (preview + แก้ทุกค่าได้ก่อน save, ข้ามไม่ได้) →
save ผ่านเส้นทาง create custom food ปกติ (creator = user, ไม่ใช่ระบบ) → admin verification (D-017)
เป็นชั้นที่สอง เหมือน custom food ทุกรายการ — แยกขาดจาก admin bulk-import (ยัง admin-only เดิม)
