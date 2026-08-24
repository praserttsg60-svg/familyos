# Family OS — Push Notification v6

ระบบนี้ทำ Push Notification จริงด้วย Service Worker + Web Push + Netlify Functions + Netlify Blobs

## ทำให้ใช้ฟรีก่อน

ตัวเว็บและ Scheduled Function สามารถเริ่มบน Netlify Free ได้ แต่ Netlify ใช้ระบบเครดิตตามการใช้งาน และเมื่อถึงเพดาน Free โปรเจกต์จะหยุดจนรอบเดือนใหม่ ดังนั้นคำว่า “ใช้ฟรี” หมายถึงเริ่มต้นได้โดยไม่ต้องจ่ายเงิน ไม่ใช่รับประกันว่าใช้งานได้ไม่จำกัดทุกปริมาณผู้ใช้

## ต้องตั้ง Environment Variables 3 ตัว

ใน Netlify → Project configuration → Environment variables → Add a variable → Add a single variable

1. `VAPID_PUBLIC_KEY` = Public Key
2. `VAPID_PRIVATE_KEY` = Private Key (ติ๊ก Contains secret values)
3. `VAPID_SUBJECT` = เช่น `mailto:your-email@example.com`

Public/Private ต้องมาจากคู่เดียวกันเท่านั้น

สร้างคู่คีย์ด้วย:

`npx.cmd web-push generate-vapid-keys`

**ห้ามใส่ Private Key ลงใน HTML, JavaScript ฝั่งผู้ใช้ หรือส่งให้ผู้อื่น**

หลังตั้งค่า Environment Variables ให้ Deploy ใหม่

## ทดสอบ

1. เปิด Family OS ผ่าน HTTPS
2. iPhone/iPad: เพิ่ม Family OS ลงหน้าจอโฮม แล้วเปิดจากไอคอนนั้น
3. ตั้งค่า → การแจ้งเตือน → เปิดการแจ้งเตือนบนมือถือ
4. กด `🔎 ตรวจระบบ Push` ต้องขึ้นว่า `ระบบ Push พร้อมใช้งาน`
5. กด `🧪 ทดสอบแจ้งเตือนจริง`
6. ล็อกหน้าจอ/ออกจาก Family OS แล้วตรวจ Notification
7. เพิ่มรายการที่มีวันครบกำหนดและตั้งเตือนล่วงหน้า/วันนี้

## การแจ้งเตือนตามกำหนด

Scheduled Function `scheduled-reminders` ทำงานทุกชั่วโมง และใช้ timezone ของอุปกรณ์เพื่อเลือกวัน/เวลา การแจ้งเตือนจึงอาจช้ากว่าเวลาที่ตั้งไว้เล็กน้อยภายในรอบชั่วโมง

## ข้อมูลที่ส่งไป Netlify

เฉพาะ Push subscription, device ID, timezone และข้อมูลขั้นต่ำที่จำเป็นต่อการแจ้งเตือน (ชื่อรายการ/วัน/เวลา/การเตือน) ถูกเก็บใน Netlify Blobs เพื่อให้ server ส่ง Push ได้
