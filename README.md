# IoT Honeypot & TraceLab Prototype

โปรเจกต์นี้เป็นเว็บต้นแบบสำหรับสำรวจ workflow งานวิจัยด้าน IoT honeypot และการวิเคราะห์พฤติกรรมจาก traces สร้างด้วย React, TypeScript และ Vite

## โปรเจกต์นี้ทำอะไรได้

หน้าเว็บจัด workflow งานวิจัยไว้เป็นหมวดหลัก ๆ:

- **Workspace:** Dashboard และการตั้งค่าการทดลอง
- **Collect:** ดู honeypot/testbed, จำลองกิจกรรมผู้โจมตี, และเปิดดู attack sessions กับ logs/traces
- **Analyze:** วิเคราะห์ลำดับพฤติกรรม สร้าง behavior ตรวจสอบ constraints และดูผล evaluation
- **Output:** สำรวจ dataset และหน้าวิเคราะห์ ML

ใช้เมนูด้านซ้ายเพื่อเปลี่ยนหน้าได้ ข้อมูลบางส่วนเป็นข้อมูลตัวอย่างและสถานะจำลองสำหรับ prototype; หน้าที่ยังไม่ทำงานจริงจะแสดงเป็นหน้า placeholder ดังนั้นโปรเจกต์นี้ยังไม่ควรถือว่าเชื่อมต่อ honeypot หรือ backend จริง

## สิ่งที่ต้องมี

- Node.js รุ่นที่รองรับ Vite 8 (แนะนำ Node.js 20.19+ หรือ 22.12+)
- npm ซึ่งติดตั้งมาพร้อม Node.js

## วิธีรันบน Windows

1. เปิด Terminal ในโฟลเดอร์ที่มีไฟล์ `package.json` อยู่ (โฟลเดอร์โปรเจกต์ชั้นใน `iot-honeypot-prototype`).
2. ติดตั้ง dependencies ครั้งแรก:

   ```powershell
   npm.cmd install
   ```

3. เริ่มเว็บ dev server:

   ```powershell
   npm.cmd run dev
   ```

4. เปิด URL ที่ Vite แสดงใน Terminal (ปกติคือ `http://localhost:5173`). ปล่อย Terminal เปิดไว้ขณะใช้งาน; กด `Ctrl+C` เพื่อหยุด server.

> ถ้า PowerShell แจ้งว่า `npm.ps1` ถูกบล็อกเพราะ execution policy ให้ใช้ `npm.cmd` ตามตัวอย่างข้างบน. อีกทางหนึ่งคือใช้ Command Prompt แล้วพิมพ์ `npm install` และ `npm run dev`.

## คำสั่งอื่น

```powershell
npm.cmd run build    # ตรวจ TypeScript และสร้างไฟล์ production ใน dist/
npm.cmd run preview  # เปิดดู build ในเครื่อง
npm.cmd run lint     # ตรวจโค้ดด้วย Oxlint
```

## โครงสร้างหลัก

- `src/App.tsx` — โครงหน้าเว็บและ navigation
- `src/components/` — หน้าและส่วนประกอบต่าง ๆ
- `src/data/` — ข้อมูลตัวอย่างและ state ของ prototype
- `public/` — static assets

แอปนี้เป็น frontend prototype ที่รันในเครื่องด้วย Vite; ยังไม่มีคำสั่งเริ่ม backend ใน `package.json`.
