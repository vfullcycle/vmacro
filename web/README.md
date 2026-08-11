# web — Vmacro PWA

React + TypeScript + Vite, deploy บน GitHub Pages (`vfullcycle.github.io/vmacro`)

- `src/config.ts` — `API_BASE_URL` ชี้ไป VPS proxy (`https://vmacro.persiq.net` โดย default, override ได้ผ่าน `VITE_API_BASE_URL`)
- P0: มีแค่หน้าเช็ค `/health` ผ่าน proxy — ฟีเจอร์จริงเริ่ม P1 ตาม `docs/SCOPE.md`

## Dev

```
npm install
npm run dev
```
